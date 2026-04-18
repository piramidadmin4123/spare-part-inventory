import { Package, ShoppingCart, MapPin, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useSiteStats } from '@/features/master-data/useMasterData';

const PART_STATUS_LABEL: Record<string, { label: string; color: string }> = {
  IN_STOCK: { label: 'In Stock', color: 'bg-green-100 text-green-700' },
  IN_SERVICE: { label: 'In Service', color: 'bg-blue-100 text-blue-700' },
  BORROWED: { label: 'Borrowed', color: 'bg-yellow-100 text-yellow-700' },
  MAINTENANCE: { label: 'Maintenance', color: 'bg-orange-100 text-orange-700' },
  LOST: { label: 'Lost', color: 'bg-red-100 text-red-700' },
  DECOMMISSIONED: { label: 'Decommissioned', color: 'bg-gray-100 text-gray-500' },
};

const ORDER_STATUS_LABEL: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'รอดำเนินการ', color: 'bg-gray-100 text-gray-600' },
  ORDERED: { label: 'สั่งซื้อแล้ว', color: 'bg-blue-100 text-blue-700' },
  RECEIVED: { label: 'รับของแล้ว', color: 'bg-green-100 text-green-700' },
  CANCELLED: { label: 'ยกเลิก', color: 'bg-red-100 text-red-600' },
};

export function SitesPage() {
  const { data: sites = [], isLoading } = useSiteStats();

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalParts = sites.reduce((s, x) => s + x.totalParts, 0);
  const totalOrders = sites.reduce((s, x) => s + x.totalOrders, 0);

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold">Sites</h1>
        <p className="text-sm text-muted-foreground">
          {sites.length} site · Spare Parts {totalParts.toLocaleString()} รายการ · Additional Orders{' '}
          {totalOrders} รายการ
        </p>
      </div>

      {/* Site cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {sites.map((site) => (
          <Card key={site.id} className="flex flex-col gap-4 p-5">
            {/* Card header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <MapPin className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-semibold leading-tight">{site.code}</p>
                  <p className="text-xs text-muted-foreground">{site.name}</p>
                </div>
              </div>
              <div className="flex gap-2 text-right">
                <div className="text-center">
                  <p className="text-lg font-bold leading-tight">{site.totalParts}</p>
                  <p className="text-[10px] text-muted-foreground">Spare Parts</p>
                </div>
              </div>
            </div>

            {/* Spare parts status breakdown */}
            {site.totalParts > 0 && (
              <div>
                <p className="mb-1.5 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                  <Package className="h-3 w-3" /> Spare Parts
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(site.partsByStatus).map(([status, count]) => {
                    const cfg = PART_STATUS_LABEL[status] ?? {
                      label: status,
                      color: 'bg-gray-100 text-gray-600',
                    };
                    return (
                      <span
                        key={status}
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.color}`}
                      >
                        {cfg.label}
                        <span className="font-bold">{count}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Additional orders */}
            {site.totalOrders > 0 && (
              <div>
                <p className="mb-1.5 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                  <ShoppingCart className="h-3 w-3" /> Additional Orders ({site.totalOrders})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(site.ordersByStatus).map(([status, count]) => {
                    const cfg = ORDER_STATUS_LABEL[status] ?? {
                      label: status,
                      color: 'bg-gray-100 text-gray-600',
                    };
                    return (
                      <span
                        key={status}
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.color}`}
                      >
                        {cfg.label}
                        <span className="font-bold">{count}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {site.totalParts === 0 && site.totalOrders === 0 && (
              <p className="text-xs text-muted-foreground">ยังไม่มีข้อมูล</p>
            )}

            {/* Progress bar — parts in service vs in stock */}
            {site.totalParts > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>In Service / In Stock</span>
                  <span>
                    {(
                      (site.partsByStatus['IN_SERVICE'] ?? 0) +
                      (site.partsByStatus['BORROWED'] ?? 0)
                    ).toLocaleString()}{' '}
                    / {(site.partsByStatus['IN_STOCK'] ?? 0).toLocaleString()}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all"
                    style={{
                      width: `${Math.min(100, (((site.partsByStatus['IN_SERVICE'] ?? 0) + (site.partsByStatus['BORROWED'] ?? 0)) / site.totalParts) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>

      {sites.length === 0 && (
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          ไม่มีข้อมูล Site
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 border-t pt-4 text-xs text-muted-foreground">
        {Object.entries(PART_STATUS_LABEL).map(([, cfg]) => (
          <span key={cfg.label} className={`rounded-full px-2 py-0.5 ${cfg.color}`}>
            {cfg.label}
          </span>
        ))}
        <Badge variant="outline" className="text-[10px]">
          สีน้ำเงิน = In Service + Borrowed
        </Badge>
      </div>
    </div>
  );
}
