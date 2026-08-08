import Link from "next/link";
import { Plus } from "@phosphor-icons/react/dist/ssr";
import { StudioCalendar, UpcomingOrders } from "@/components/calendar/studio-calendar";
import { TodayShoots } from "@/components/dashboard/today-shoots";
import { Button } from "@/components/ui/button";
import { addDays, currentMonthKey, isMonthKey, monthBounds, toDateKey } from "@/lib/calendar/month";
import { requireProfile } from "@/lib/auth/guards";
import { getOrderOperationsSummary, getPublicOrderSchedule, getSourceSummary, getTodayOrders } from "@/lib/orders/queries";
import { orderSourceTypeLabels } from "@/lib/orders/schema";
import type { SourceSummaryItem } from "@/types/database";

type DashboardProps = { searchParams: Promise<{ month?: string; scope?: string }> };

export default async function DashboardPage({ searchParams }: DashboardProps) {
  const { profile } = await requireProfile();
  const params = await searchParams;
  const month = isMonthKey(params.month) ? params.month : currentMonthKey();
  const showMine = profile.role === "camera" && params.scope === "mine";
  const cameraId = showMine ? profile.id : undefined;
  const ownerView = profile.role === "owner";
  const { start: monthStart, end: monthEnd } = monthBounds(month);
  const today = toDateKey(new Date());
  const upcomingEnd = toDateKey(addDays(new Date(), 90));
  const [calendarOrders, upcomingOrders, todayOrders, operations, sourceSummary] = await Promise.all([
    getPublicOrderSchedule({ start: monthStart, end: monthEnd, cameraId }),
    getPublicOrderSchedule({ start: today, end: upcomingEnd, cameraId }),
    getTodayOrders(today),
    ownerView ? getOrderOperationsSummary(today) : Promise.resolve(null),
    ownerView ? getSourceSummary(new Date().getFullYear()) : Promise.resolve([]),
  ]);
  const scopeHref = showMine ? (month === currentMonthKey() ? "/" : `/?month=${month}`) : `/?month=${month}&scope=mine`;
  const scopeLabel = showMine ? "查看全部安排" : "仅看我的安排";

  return (
    <div className="mx-auto max-w-[1360px]">
      <header className="border-y border-[var(--border)] py-3">
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(10rem,1fr)_minmax(22rem,1.5fr)_auto] xl:gap-6">
          <div>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">本月的拍摄节奏。</h1>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              {todayOrders.length ? `今天有 ${todayOrders.length} 场拍摄。` : "今天暂无拍摄安排。"}
            </p>
          </div>
          <TodayShoots orders={todayOrders} />
          <div className="flex items-center gap-2 xl:justify-end">
            <Link
              href={scopeHref}
              className="rounded-lg border border-[var(--border-strong)] px-3 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            >
              {scopeLabel}
            </Link>
            <Button asChild>
              <Link href="/orders/quick-new">
                <Plus size={18} />
                快速新建
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="mt-5 grid gap-7 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <StudioCalendar month={month} orders={calendarOrders} canManage scope={showMine ? "mine" : undefined} />
        <aside className="grid content-start gap-7">
          {operations ? <OperationLinks operations={operations} /> : null}
          <UpcomingOrders orders={upcomingOrders} canManage />
          {operations ? <SourceOverview year={new Date().getFullYear()} sources={sourceSummary} /> : null}
        </aside>
      </div>
    </div>
  );
}

function OperationLinks({ operations }: { operations: { todayShoots: number; draft: number; backupPending: number; editing: number; deliveryPending: number } }) {
  const links = [
    { label: "今日拍摄", count: operations.todayShoots, href: `/orders?start=${toDateKey(new Date())}&end=${toDateKey(new Date())}` },
    { label: "待确认", count: operations.draft, href: "/orders?status=draft" },
    { label: "待备份", count: operations.backupPending, href: "/orders?workflow=backup_pending" },
    { label: "剪辑中", count: operations.editing, href: "/orders?workflow=editing" },
    { label: "待交付", count: operations.deliveryPending, href: "/orders?workflow=delivery_pending" },
  ];

  return (
    <section aria-labelledby="operations-heading" className="border-t border-[var(--border)] pt-5">
      <h2 id="operations-heading" className="font-semibold">今日处理</h2>
      <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">从订单中派生的当前工作入口。</p>
      <div className="mt-3 divide-y divide-[var(--border)]">
        {links.map((link) => (
          <Link
            key={link.label}
            href={link.href}
            className="flex items-center justify-between gap-3 py-3 text-sm transition-colors hover:text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--ring)]"
          >
            <span>{link.label}</span>
            <span className="font-mono text-xs text-[var(--muted-foreground)]">{link.count} 笔</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function SourceOverview({ year, sources }: { year: number; sources: SourceSummaryItem[] }) {
  return (
    <section aria-labelledby="source-heading" className="border-t border-[var(--border)] pt-5">
      <h2 id="source-heading" className="font-semibold">{year} 年来源</h2>
      {sources.length ? (
        <div className="mt-3 divide-y divide-[var(--border)]">
          {sources.map((source) => (
            <div key={`${source.source_type}-${source.source_name}`} className="flex items-center justify-between gap-3 py-3 text-sm">
              <span className="min-w-0 truncate">
                {source.source_name}
                <span className="ml-1 text-xs text-[var(--muted-foreground)]">{orderSourceTypeLabels[source.source_type]}</span>
              </span>
              <span className="shrink-0 font-mono text-xs text-[var(--muted-foreground)]">{source.order_count} 单</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">今年暂无可统计的订单来源。</p>
      )}
    </section>
  );
}
