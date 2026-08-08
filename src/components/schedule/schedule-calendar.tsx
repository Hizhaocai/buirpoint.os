import Link from "next/link";
import { CaretLeft, CaretRight, MapPin } from "@phosphor-icons/react/dist/ssr";
import { getMonthGrid, monthLabel, shiftMonth, toDateKey } from "@/lib/calendar/month";
import { orderStatusLabels } from "@/lib/orders/schema";
import type { PublicOrderSchedule } from "@/types/database";

const weekdays = ["一", "二", "三", "四", "五", "六", "日"];

type ScheduleCalendarProps = {
  month: string;
  orders: PublicOrderSchedule[];
  cameraId?: string;
};

function scheduleHref(month: string, cameraId?: string) {
  const params = new URLSearchParams({ month });
  if (cameraId) params.set("camera", cameraId);
  return `/schedule?${params.toString()}`;
}

function ordersHref(date: string) {
  const params = new URLSearchParams({ start: date, end: date });
  return `/orders?${params.toString()}`;
}

export function ScheduleCalendar({ month, orders, cameraId }: ScheduleCalendarProps) {
  const byDate = new Map<string, PublicOrderSchedule[]>();
  for (const order of orders) byDate.set(order.shoot_date, [...(byDate.get(order.shoot_date) ?? []), order]);
  const [year, calendarMonth] = month.split("-").map(Number);

  return (
    <section aria-labelledby="schedule-calendar-heading" className="border-y border-[var(--border)] py-5 sm:py-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 id="schedule-calendar-heading" className="text-xl font-semibold tracking-tight">本月安排</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">{monthLabel(month)} · 订单的时间索引</p>
        </div>
        <div className="flex items-center gap-1">
          <Link aria-label="上个月" href={scheduleHref(shiftMonth(month, -1), cameraId)} className="grid size-9 place-items-center text-[var(--muted-foreground)] transition-colors hover:bg-[var(--secondary)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]">
            <CaretLeft size={18} />
          </Link>
          <Link href={scheduleHref(new Date().toISOString().slice(0, 7), cameraId)} className="px-3 py-2 text-xs font-medium transition-colors hover:bg-[var(--secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]">本月</Link>
          <Link aria-label="下个月" href={scheduleHref(shiftMonth(month, 1), cameraId)} className="grid size-9 place-items-center text-[var(--muted-foreground)] transition-colors hover:bg-[var(--secondary)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]">
            <CaretRight size={18} />
          </Link>
        </div>
      </div>

      <div className="mt-5 hidden grid-cols-7 border-l border-t border-[var(--border)] md:grid">
        {weekdays.map((day) => <div key={day} className="border-b border-r border-[var(--border)] py-2 text-center text-xs font-medium text-[var(--muted-foreground)]">{day}</div>)}
        {getMonthGrid(month).map((date) => {
          const key = toDateKey(date);
          const entries = byDate.get(key) ?? [];
          const inMonth = date.getFullYear() === year && date.getMonth() + 1 === calendarMonth;
          return (
            <div key={key} className={`min-h-32 border-b border-r border-[var(--border)] p-2 ${inMonth ? "bg-[var(--background)]" : "bg-[var(--canvas)] text-[var(--muted-foreground)]"}`}>
              <Link href={ordersHref(key)} aria-label={`查看 ${key} 的订单`} className="inline-grid size-6 place-items-center text-xs transition-colors hover:bg-[var(--secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]">
                {date.getDate()}
              </Link>
              <div className="mt-1 grid gap-1.5">
                {entries.slice(0, 2).map((order) => <ScheduleEntry key={order.id} order={order} />)}
                {entries.length > 2 ? <Link href={ordersHref(key)} className="text-[11px] font-medium text-[var(--primary)] hover:underline">另有 {entries.length - 2} 项</Link> : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 divide-y divide-[var(--border)] md:hidden">
        {orders.length ? orders.map((order) => <ScheduleListEntry key={order.id} order={order} showDate />) : <p className="py-5 text-sm text-[var(--muted-foreground)]">本月暂无拍摄安排。</p>}
      </div>
    </section>
  );
}

export function ScheduleRecentList({ orders }: { orders: PublicOrderSchedule[] }) {
  return (
    <section aria-labelledby="recent-schedule-heading" className="border-b border-[var(--border)] pb-2">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h2 id="recent-schedule-heading" className="text-xl font-semibold tracking-tight">近期安排</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">未来三个月的拍摄订单。</p>
        </div>
        <Link href="/orders" className="text-sm font-medium text-[var(--primary)] hover:underline">查看订单</Link>
      </div>
      <div className="mt-4 divide-y divide-[var(--border)]">
        {orders.length ? orders.slice(0, 14).map((order) => <ScheduleListEntry key={order.id} order={order} showDate />) : <p className="py-5 text-sm text-[var(--muted-foreground)]">未来暂无拍摄安排。</p>}
      </div>
    </section>
  );
}

function ScheduleEntry({ order }: { order: PublicOrderSchedule }) {
  return (
    <Link href={`/orders/${order.id}`} className="block border-l-2 border-[var(--primary)] py-1 pl-2 transition-colors hover:bg-[var(--secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]">
      <span className="block truncate text-xs font-medium">{order.project_name}</span>
      <span className="mt-0.5 block truncate text-[10px] text-[var(--muted-foreground)]">{order.assigned_camera_name ?? "未分配摄像人员"}</span>
      <span className="block truncate text-[10px] text-[var(--muted-foreground)]">{order.shoot_location ?? "地点待确认"}</span>
    </Link>
  );
}

function ScheduleListEntry({ order, showDate }: { order: PublicOrderSchedule; showDate?: boolean }) {
  const date = new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric", weekday: "short" }).format(new Date(`${order.shoot_date}T00:00:00`));
  return (
    <Link href={`/orders/${order.id}`} className="grid grid-cols-[5.25rem_minmax(0,1fr)_auto] items-start gap-3 py-3 transition-colors hover:bg-[var(--secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--ring)]">
      <span className="font-mono text-xs text-[var(--primary)]">{showDate ? date : ""}</span>
      <span className="min-w-0">
        <strong className="block truncate text-sm">{order.project_name}</strong>
        <span className="mt-1 block truncate text-xs text-[var(--muted-foreground)]">{order.assigned_camera_name ?? "未分配摄像人员"}</span>
        <span className="mt-1 flex min-w-0 items-center gap-1 text-xs text-[var(--muted-foreground)]"><MapPin aria-hidden size={14} className="shrink-0 text-[var(--primary)]" /><span className="truncate">{order.shoot_location ?? "地点待确认"}</span></span>
      </span>
      <span className="shrink-0 text-xs text-[var(--muted-foreground)]">{orderStatusLabels[order.status]}</span>
    </Link>
  );
}
