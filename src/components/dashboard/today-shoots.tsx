import Link from "next/link";
import { MapPin, Phone } from "@phosphor-icons/react/dist/ssr";
import { OrderStatusBadge } from "@/components/orders/order-list";
import type { OrderWithCamera } from "@/types/database";

export function TodayShoots({ orders }: { orders: OrderWithCamera[] }) {
  if (!orders.length) {
    return (
      <section aria-labelledby="today-shoots-heading" className="min-w-0 border-l border-[var(--border)] pl-4 xl:pl-5">
        <h2 id="today-shoots-heading" className="text-sm font-semibold">今日拍摄</h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">今天暂无拍摄安排。</p>
      </section>
    );
  }

  return (
    <section aria-labelledby="today-shoots-heading" className="min-w-0 border-l border-[var(--border)] pl-4 xl:pl-5">
      <div className="flex items-center justify-between gap-3">
        <h2 id="today-shoots-heading" className="text-sm font-semibold">今日拍摄</h2>
        <span className="font-mono text-xs text-[var(--muted-foreground)]">{orders.length} 场</span>
      </div>
      <div className="mt-1.5 divide-y divide-[var(--border)]">
        {orders.map((order) => {
          const cameraName = order.assigned_camera?.display_name ?? order.assigned_camera?.name ?? order.assigned_camera?.email ?? "暂未分配主摄";
          return (
            <article key={order.id} className="py-2 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/orders/${order.id}`}
                    className="block truncate text-sm font-medium transition-colors hover:text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                  >
                    {order.project_name}
                  </Link>
                  <p className="mt-0.5 truncate text-xs text-[var(--muted-foreground)]">{order.client_name} · {cameraName}</p>
                </div>
                <OrderStatusBadge status={order.status} />
              </div>
              <div className="mt-1.5 flex items-center justify-between gap-3 text-xs">
                <p className="flex min-w-0 items-center gap-1.5 text-[var(--muted-foreground)]">
                  <MapPin aria-hidden size={14} className="shrink-0 text-[var(--primary)]" />
                  <span className="truncate">{order.shoot_location ?? "地点待确认"}</span>
                </p>
                <div className="flex shrink-0 items-center gap-2">
                  <Link href={`/orders/${order.id}`} className="font-medium text-[var(--primary)] hover:underline">查看</Link>
                  {order.contact_phone ? (
                    <a href={`tel:${order.contact_phone}`} className="text-[var(--foreground)] hover:text-[var(--primary)]" aria-label={`拨打 ${order.client_name} 的电话`}>
                      <Phone aria-hidden size={15} />
                    </a>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
