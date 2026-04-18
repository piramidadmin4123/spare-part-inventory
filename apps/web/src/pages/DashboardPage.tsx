import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { Package, ArrowLeftRight, AlertTriangle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';

// ── Types ──────────────────────────────────────────────────────────────────

interface Summary {
  totalParts: number;
  pendingBorrows: number;
  lowStock: number;
  byStatus: { status: string; count: number }[];
  borrowByStatus: { status: string; count: number }[];
}

interface LowStockItem {
  id: string;
  modelCode: string;
  productName: string;
  quantity: number;
  minStock: number;
  status: string;
  siteCode: string;
  brandName: string;
}

interface RecentBorrow {
  id: string;
  status: string;
  borrowerName?: string | null;
  borrowerEmail?: string | null;
  createdAt: string;
  sparePart: { modelCode: string; productName: string; site: { code: string } };
  borrower: { name: string };
  approver?: { name: string } | null;
}

// ── Status configs ─────────────────────────────────────────────────────────

const PART_STATUS_LABEL: Record<string, string> = {
  IN_STOCK: 'คงคลัง',
  IN_SERVICE: 'ใช้งาน',
  BORROWED: 'ถูกยืม',
  MAINTENANCE: 'ซ่อม',
  LOST: 'สูญหาย',
  DECOMMISSIONED: 'เลิกใช้',
};

const PART_STATUS_COLOR: Record<string, string> = {
  IN_STOCK: '#22c55e',
  IN_SERVICE: '#3b82f6',
  BORROWED: '#f59e0b',
  MAINTENANCE: '#8b5cf6',
  LOST: '#ef4444',
  DECOMMISSIONED: '#6b7280',
};

const BORROW_STATUS_LABEL: Record<string, string> = {
  PENDING: 'รออนุมัติ',
  APPROVED: 'อนุมัติแล้ว',
  REJECTED: 'ปฏิเสธ',
  RETURNED: 'คืนแล้ว',
  CANCELLED: 'ยกเลิก',
};

const BORROW_STATUS_COLOR: Record<string, string> = {
  PENDING: '#f59e0b',
  APPROVED: '#3b82f6',
  REJECTED: '#ef4444',
  RETURNED: '#22c55e',
  CANCELLED: '#6b7280',
};

// ── KPI Card ───────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  sub?: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-3xl font-bold">{value}</p>
          {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
        </div>
        <div className={`rounded-lg p-2 ${color}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </div>
  );
}

// ── BorrowStatus badge ─────────────────────────────────────────────────────

function BorrowBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-700',
    APPROVED: 'bg-blue-100 text-blue-700',
    REJECTED: 'bg-red-100 text-red-700',
    RETURNED: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-gray-100 text-gray-600',
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] ?? 'bg-gray-100 text-gray-600'}`}
    >
      {BORROW_STATUS_LABEL[status] ?? status}
    </span>
  );
}

// ── DashboardPage ──────────────────────────────────────────────────────────

export function DashboardPage() {
  const { data: summary } = useQuery<Summary>({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => apiClient.get<Summary>('/api/dashboard/summary').then((r) => r.data),
    refetchInterval: 60_000,
  });

  const { data: lowStock = [] } = useQuery<LowStockItem[]>({
    queryKey: ['dashboard', 'low-stock'],
    queryFn: () => apiClient.get<LowStockItem[]>('/api/dashboard/low-stock').then((r) => r.data),
    refetchInterval: 60_000,
  });

  const { data: recentBorrows = [] } = useQuery<RecentBorrow[]>({
    queryKey: ['dashboard', 'recent-borrows'],
    queryFn: () =>
      apiClient.get<RecentBorrow[]>('/api/dashboard/recent-borrows').then((r) => r.data),
    refetchInterval: 30_000,
  });

  const inStock = summary?.byStatus.find((s) => s.status === 'IN_STOCK')?.count ?? 0;
  const borrowed = summary?.byStatus.find((s) => s.status === 'BORROWED')?.count ?? 0;

  const pieData = (summary?.byStatus ?? [])
    .filter((s) => s.count > 0)
    .map((s) => ({
      name: PART_STATUS_LABEL[s.status] ?? s.status,
      value: s.count,
      status: s.status,
    }));

  const barData = (summary?.borrowByStatus ?? []).map((s) => ({
    name: BORROW_STATUS_LABEL[s.status] ?? s.status,
    count: s.count,
    status: s.status,
  }));

  return (
    <div className="flex h-full flex-col overflow-auto bg-gray-50">
      <div className="border-b bg-white px-6 py-4">
        <h1 className="text-xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">ภาพรวมระบบ Spare Part</p>
      </div>

      <div className="space-y-6 p-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard
            icon={Package}
            label="Spare Parts ทั้งหมด"
            value={summary?.totalParts ?? '—'}
            sub={`คงคลัง ${inStock} ชิ้น`}
            color="bg-blue-500"
          />
          <KpiCard
            icon={ArrowLeftRight}
            label="กำลังถูกยืม"
            value={borrowed}
            color="bg-amber-500"
          />
          <KpiCard
            icon={Clock}
            label="รออนุมัติ"
            value={summary?.pendingBorrows ?? '—'}
            sub="คำขอยืม"
            color="bg-violet-500"
          />
          <KpiCard
            icon={AlertTriangle}
            label="Stock ต่ำกว่ากำหนด"
            value={summary?.lowStock ?? '—'}
            sub="รายการ"
            color="bg-red-500"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Pie: parts by status */}
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold">สถานะ Spare Parts</h2>
            {pieData.length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={180} height={180}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((entry) => (
                        <Cell
                          key={entry.status}
                          fill={PART_STATUS_COLOR[entry.status] ?? '#6b7280'}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => [`${v} ชิ้น`]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-2">
                  {pieData.map((entry) => (
                    <div key={entry.status} className="flex items-center gap-2 text-sm">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: PART_STATUS_COLOR[entry.status] ?? '#6b7280' }}
                      />
                      <span className="text-muted-foreground">{entry.name}</span>
                      <span className="ml-auto font-medium">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">ไม่มีข้อมูล</p>
            )}
          </div>

          {/* Bar: borrows by status */}
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold">สถานะคำขอยืม</h2>
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={barData} barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={30} />
                  <Tooltip formatter={(v) => [`${v} รายการ`]} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {barData.map((entry) => (
                      <Cell
                        key={entry.status}
                        fill={BORROW_STATUS_COLOR[entry.status] ?? '#6b7280'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">ไม่มีข้อมูล</p>
            )}
          </div>
        </div>

        {/* Bottom tables */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Low stock */}
          <div className="rounded-xl border bg-white shadow-sm">
            <div className="flex items-center justify-between border-b px-5 py-3">
              <h2 className="text-sm font-semibold">Stock ต่ำกว่ากำหนด</h2>
              <Badge variant="destructive" className="text-xs">
                {lowStock.length} รายการ
              </Badge>
            </div>
            {lowStock.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                ไม่มีรายการ stock ต่ำ
              </p>
            ) : (
              <div className="divide-y">
                {lowStock.map((item) => (
                  <div key={item.id} className="flex items-center justify-between px-5 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs font-medium">{item.modelCode}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {item.brandName} · {item.siteCode}
                      </p>
                    </div>
                    <div className="ml-4 text-right">
                      <p className="text-sm font-bold text-red-500">{item.quantity}</p>
                      <p className="text-xs text-muted-foreground">min {item.minStock}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent borrows */}
          <div className="rounded-xl border bg-white shadow-sm">
            <div className="border-b px-5 py-3">
              <h2 className="text-sm font-semibold">คำขอยืมล่าสุด</h2>
            </div>
            {recentBorrows.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">ไม่มีรายการ</p>
            ) : (
              <div className="divide-y">
                {recentBorrows.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between px-5 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs font-medium">
                        {tx.sparePart.modelCode}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {tx.borrowerName ?? tx.borrower.name} · {tx.sparePart.site.code}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(tx.createdAt), 'd MMM yy HH:mm', { locale: th })}
                      </p>
                    </div>
                    <div className="ml-4">
                      <BorrowBadge status={tx.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
