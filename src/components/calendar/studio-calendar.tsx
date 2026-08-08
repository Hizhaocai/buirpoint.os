import Link from "next/link";
import { CaretLeft, CaretRight } from "@phosphor-icons/react/dist/ssr";
import { OrderStatusBadge } from "@/components/orders/order-list";
import { currentMonthKey, getMonthGrid, monthLabel, shiftMonth, toDateKey } from "@/lib/calendar/month";
import type { PublicOrderSchedule } from "@/types/database";

const weekdays = ["\u4e00", "\u4e8c", "\u4e09", "\u56db", "\u4e94", "\u516d", "\u65e5"];
const copy = {
  rhythm: "\u672c\u6708\u62cd\u6444\u8282\u594f",
  orderView: "\u8ba2\u5355\u7684\u65f6\u95f4\u89c6\u56fe",
  previous: "\u4e0a\u4e2a\u6708",
  next: "\u4e0b\u4e2a\u6708",
  current: "\u672c\u6708",
  unassigned: "\u672a\u5206\u914d",
  upcoming: "\u5373\u5c06\u62cd\u6444",
  noUpcoming: "\u672a\u6765\u4e09\u4e2a\u6708\u6682\u65e0\u5df2\u5b89\u6392\u62cd\u6444\u3002",
  viewOrders: "\u67e5\u770b\u8ba2\u5355",
  unassignedCamera: "\u672a\u5206\u914d\u6444\u50cf\u4eba\u5458",
};

export function StudioCalendar({ month, orders, canManage, scope }: { month: string; orders: PublicOrderSchedule[]; canManage: boolean; scope?: "mine" }) {
  const byDate = new Map<string, PublicOrderSchedule[]>();
  for (const order of orders) byDate.set(order.shoot_date, [...(byDate.get(order.shoot_date) ?? []), order]);
  const today = toDateKey(new Date());
  const current = currentMonthKey();
  const [year, calendarMonth] = month.split("-").map(Number);

  return <section aria-labelledby="calendar-heading" className="min-w-0 border-y border-[var(--border)] py-5 sm:py-6">
    <div className="flex items-center justify-between gap-3">
      <div><h2 id="calendar-heading" className="text-xl font-semibold tracking-tight">{copy.rhythm}</h2><p className="mt-1 text-sm text-[var(--muted-foreground)]">{monthLabel(month)} · {copy.orderView}</p></div>
      <div className="flex items-center gap-1">
        <Link aria-label={copy.previous} href={`/?month=${shiftMonth(month, -1)}${scope ? `&scope=${scope}` : ""}`} className="grid size-9 place-items-center rounded-lg text-[var(--muted-foreground)] transition-colors hover:bg-[var(--secondary)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"><CaretLeft size={18} /></Link>
        <Link href={current === month ? (scope ? `/?scope=${scope}` : "/") : `/?month=${current}${scope ? `&scope=${scope}` : ""}`} className="rounded-lg px-3 py-2 text-xs font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]">{copy.current}</Link>
        <Link aria-label={copy.next} href={`/?month=${shiftMonth(month, 1)}${scope ? `&scope=${scope}` : ""}`} className="grid size-9 place-items-center rounded-lg text-[var(--muted-foreground)] transition-colors hover:bg-[var(--secondary)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"><CaretRight size={18} /></Link>
      </div>
    </div>
    <div className="mt-5 grid grid-cols-7 border-l border-t border-[var(--border)]">
      {weekdays.map((day) => <div key={day} className="border-b border-r border-[var(--border)] py-2 text-center text-xs font-medium text-[var(--muted-foreground)]">{day}</div>)}
      {getMonthGrid(month).map((date) => {
        const key = toDateKey(date);
        const entries = byDate.get(key) ?? [];
        const inMonth = date.getFullYear() === year && date.getMonth() + 1 === calendarMonth;
        return <div key={key} className={`min-h-24 border-b border-r border-[var(--border)] p-1.5 sm:min-h-32 sm:p-2 ${inMonth ? "bg-[var(--background)]" : "bg-[var(--canvas)] text-[var(--muted-foreground)]"}`}>
          <div className="flex items-center justify-between"><span className={`grid size-6 place-items-center rounded-full text-xs ${key === today ? "bg-[var(--primary)] font-semibold text-[var(--primary-foreground)]" : ""}`}>{date.getDate()}</span>{entries.length > 2 && <span className="text-[10px] text-[var(--muted-foreground)]">+{entries.length - 2}</span>}</div>
          <div className="mt-1 grid gap-1">{entries.slice(0, 2).map((order) => <CalendarEntry key={order.id} order={order} canManage={canManage} />)}</div>
        </div>;
      })}
    </div>
  </section>;
}

function CalendarEntry({ order, canManage }: { order: PublicOrderSchedule; canManage: boolean }) {
  const content = <><span className="block truncate text-[11px] font-medium sm:text-xs">{order.project_name}</span><span className="hidden truncate text-[10px] text-[var(--muted-foreground)] sm:block">{order.assigned_camera_name ?? copy.unassigned}{order.shoot_location ? ` · ${order.shoot_location}` : ""}</span></>;
  return canManage ? <Link href={`/orders/${order.id}`} className="block rounded-md bg-[var(--secondary)] px-1.5 py-1 transition-colors hover:bg-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]">{content}</Link> : <div className="rounded-md bg-[var(--secondary)] px-1.5 py-1">{content}</div>;
}

export function UpcomingOrders({ orders, canManage }: { orders: PublicOrderSchedule[]; canManage: boolean }) {
  if (!orders.length) return <section className="border-t border-[var(--border)] pt-5"><h2 className="font-semibold">{copy.upcoming}</h2><p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">{copy.noUpcoming}</p></section>;
  return <section aria-labelledby="upcoming-heading" className="border-t border-[var(--border)] pt-5"><div className="flex items-center justify-between gap-3"><h2 id="upcoming-heading" className="font-semibold">{copy.upcoming}</h2>{canManage && <Link href="/orders" className="text-sm font-medium text-[var(--primary)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]">{copy.viewOrders}</Link>}</div><div className="mt-4 divide-y divide-[var(--border)]">{orders.slice(0, 7).map((order) => <UpcomingEntry key={order.id} order={order} canManage={canManage} />)}</div></section>;
}

function UpcomingEntry({ order, canManage }: { order: PublicOrderSchedule; canManage: boolean }) {
  const date = new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric", weekday: "short" }).format(new Date(`${order.shoot_date}T00:00:00`));
  const content = <><div className="min-w-0"><span className="text-xs font-medium text-[var(--primary)]">{date}</span><strong className="mt-1 block truncate text-sm">{order.project_name}</strong><span className="mt-1 block truncate text-xs text-[var(--muted-foreground)]">{order.assigned_camera_name ?? copy.unassignedCamera}{order.shoot_location ? ` · ${order.shoot_location}` : ""}</span></div><OrderStatusBadge status={order.status} /></>;
  return canManage ? <Link href={`/orders/${order.id}`} className="flex items-start justify-between gap-3 py-3 transition-colors hover:bg-[var(--secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--ring)]">{content}</Link> : <div className="flex items-start justify-between gap-3 py-3">{content}</div>;
}
