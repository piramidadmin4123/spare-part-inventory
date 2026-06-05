import { useState } from 'react';
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
  Legend,
} from 'recharts';
import { Package, ArrowLeftRight, Clock, Tags, ChevronDown, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';

// ── Types ──────────────────────────────────────────────────────────────────

interface Summary {
  totalParts: number;
  pendingBorrows: number;
  overdueItems: number;
  overdueBorrowers: number;
  byStatus: { status: string; count: number }[];
  borrowByStatus: { status: string; count: number }[];
  byBrand: { brand: string; count: number }[];
}

interface BorrowTimeline {
  monthLabel: string;
  totalBrands: number;
  totalBorrows: number;
  weeks: {
    index: number;
    label: string;
    range: string;
    start: string;
    end: string;
    total: number;
    brands: { brand: string; count: number }[];
  }[];
  brandSummary: {
    brand: string;
    total: number;
    borrowers: { name: string; count: number }[];
    sites: { site: string; count: number }[];
  }[];
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
  IN_SERVICE: 'ใช้งาน',
  BORROWED: 'ถูกยืม',
  MAINTENANCE: 'ซ่อม',
  LOST: 'สูญหาย',
  DECOMMISSIONED: 'เลิกใช้',
};

const PART_STATUS_COLOR: Record<string, string> = {
  IN_SERVICE: '#22c55e',
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

// Palette for the per-brand stacked timeline
const BRAND_PALETTE = [
  '#3b82f6',
  '#f59e0b',
  '#22c55e',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#ef4444',
  '#eab308',
  '#94a3b8', // "อื่นๆ"
];
const OTHER_LABEL = 'อื่นๆ';

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
  const [expandedBrands, setExpandedBrands] = useState<Set<string>>(new Set());

  const { data: summary } = useQuery<Summary>({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => apiClient.get<Summary>('/api/dashboard/summary').then((r) => r.data),
    refetchInterval: 60_000,
  });

  const { data: timeline } = useQuery<BorrowTimeline>({
    queryKey: ['dashboard', 'borrow-timeline'],
    queryFn: () =>
      apiClient.get<BorrowTimeline>('/api/dashboard/borrow-timeline').then((r) => r.data),
    refetchInterval: 60_000,
  });

  const { data: recentBorrows = [] } = useQuery<RecentBorrow[]>({
    queryKey: ['dashboard', 'recent-borrows'],
    queryFn: () =>
      apiClient.get<RecentBorrow[]>('/api/dashboard/recent-borrows').then((r) => r.data),
    refetchInterval: 30_000,
  });

  const toggleBrand = (brand: string) =>
    setExpandedBrands((prev) => {
      const next = new Set(prev);
      if (next.has(brand)) next.delete(brand);
      else next.add(brand);
      return next;
    });

  const inService = summary?.byStatus.find((s) => s.status === 'IN_SERVICE')?.count ?? 0;
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

  const brandData = (summary?.byBrand ?? []).slice(0, 10);
  const brandMax = brandData[0]?.count ?? 1;

  // ── Timeline (per-brand weekly stacked bars) ──
  const topBrands = (timeline?.brandSummary ?? []).slice(0, 8).map((b) => b.brand);
  const hasOthers = (timeline?.brandSummary.length ?? 0) > topBrands.length;
  const series = hasOthers ? [...topBrands, OTHER_LABEL] : topBrands;

  const weekChart = (timeline?.weeks ?? []).map((w) => {
    const row: Record<string, string | number> = { name: w.label, range: w.range };
    for (const b of topBrands) row[b] = 0;
    let others = w.total;
    for (const b of w.brands) {
      if (topBrands.includes(b.brand)) {
        row[b.brand] = b.count;
        others -= b.count;
      }
    }
    if (hasOthers) row[OTHER_LABEL] = others;
    return row;
  });
  const timelineHasData = (timeline?.totalBorrows ?? 0) > 0;

  return (
    <div className="flex h-full flex-col overflow-auto bg-gray-50">
      <div className="border-b bg-white px-6 py-4">
        <h1 className="text-xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">ภาพรวมระบบ Spare Part</p>
      </div>

      <div className="space-y-6 p-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <KpiCard
            icon={Package}
            label="Spare Parts ทั้งหมด"
            value={summary?.totalParts ?? '—'}
            sub={`ใช้งานได้ ${inService} ชิ้น`}
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
            icon={Tags}
            label="แบรนด์ที่ถูกยืม (เดือนนี้)"
            value={timeline?.totalBrands ?? '—'}
            sub={timeline ? `รวม ${timeline.totalBorrows} ครั้ง` : undefined}
            color="bg-teal-500"
          />
          <KpiCard
            icon={Clock}
            label="อุปกรณ์เกินกำหนด"
            value={summary?.overdueItems ?? '—'}
            sub={summary ? `${summary.overdueBorrowers} คน` : undefined}
            color="bg-rose-500"
          />
        </div>

        {/* Weekly borrow timeline by brand */}
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold">
              Timeline การยืมรายสัปดาห์ แยกตามแบรนด์
              {timeline?.monthLabel ? ` — ${timeline.monthLabel}` : ''}
            </h2>
            <span className="text-xs text-muted-foreground">รีเซ็ตอัตโนมัติทุกเดือน</span>
          </div>
          {timelineHasData ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weekChart} barSize={44}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={30} />
                <Tooltip formatter={(v, name) => [`${v} ตัว`, name]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {series.map((s, i) => (
                  <Bar
                    key={s}
                    dataKey={s}
                    stackId="brands"
                    fill={
                      s === OTHER_LABEL
                        ? BRAND_PALETTE[BRAND_PALETTE.length - 1]
                        : BRAND_PALETTE[i % (BRAND_PALETTE.length - 1)]
                    }
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">
              ยังไม่มีการยืมในเดือนนี้
            </p>
          )}
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

        {/* Brand breakdown (inventory by brand) */}
        {brandData.length > 0 && (
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold">จำนวนอุปกรณ์แต่ละแบรนด์ (Top 10)</h2>
            <div className="space-y-2">
              {brandData.map((b) => (
                <div key={b.brand} className="flex items-center gap-3">
                  <span className="w-32 shrink-0 truncate text-right text-xs text-muted-foreground">
                    {b.brand}
                  </span>
                  <div className="flex-1 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-5 rounded-full bg-blue-500 transition-all"
                      style={{ width: `${(b.count / brandMax) * 100}%` }}
                    />
                  </div>
                  <span className="w-10 shrink-0 text-right text-xs font-semibold tabular-nums">
                    {b.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom tables */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Borrow summary by brand (expandable) */}
          <div className="rounded-xl border bg-white shadow-sm">
            <div className="flex items-center justify-between border-b px-5 py-3">
              <h2 className="text-sm font-semibold">สรุปการยืมตามแบรนด์ (เดือนนี้)</h2>
              <Badge className="bg-teal-100 text-xs text-teal-700">
                {timeline?.totalBrands ?? 0} แบรนด์
              </Badge>
            </div>
            {!timeline || timeline.brandSummary.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                ยังไม่มีการยืมในเดือนนี้
              </p>
            ) : (
              <div className="divide-y">
                {timeline.brandSummary.map((b) => {
                  const open = expandedBrands.has(b.brand);
                  return (
                    <div key={b.brand}>
                      <button
                        type="button"
                        onClick={() => toggleBrand(b.brand)}
                        className="flex w-full items-center justify-between px-5 py-3 text-left transition-colors hover:bg-muted/30"
                      >
                        <div className="flex items-center gap-2">
                          {open ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="text-sm font-medium">{b.brand}</span>
                        </div>
                        <span className="text-sm font-bold text-teal-600">{b.total} ตัว</span>
                      </button>
                      {open && (
                        <div className="space-y-2 bg-muted/20 px-5 py-3 text-xs">
                          <div>
                            <p className="mb-1 font-semibold text-muted-foreground">ผู้ยืม</p>
                            <div className="flex flex-wrap gap-1.5">
                              {b.borrowers.map((x) => (
                                <span
                                  key={x.name}
                                  className="rounded-full bg-white px-2 py-0.5 ring-1 ring-gray-200"
                                >
                                  {x.name} · {x.count}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="mb-1 font-semibold text-muted-foreground">Site ที่ยืม</p>
                            <div className="flex flex-wrap gap-1.5">
                              {b.sites.map((x) => (
                                <span
                                  key={x.site}
                                  className="rounded-full bg-white px-2 py-0.5 font-mono ring-1 ring-gray-200"
                                >
                                  {x.site} · {x.count}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
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
