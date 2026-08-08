import { ScheduleCalendar, ScheduleRecentList } from "@/components/schedule/schedule-calendar";
import { ScheduleFilters } from "@/components/schedule/schedule-filters";
import { addDays, currentMonthKey, isMonthKey, monthBounds, toDateKey } from "@/lib/calendar/month";
import { getScheduleOrders } from "@/lib/schedule/queries";
import { getAssignableCameras } from "@/lib/members/queries";

type SchedulePageProps = { searchParams: Promise<{ month?: string; camera?: string }> };

export default async function SchedulePage({ searchParams }: SchedulePageProps) {
  const params = await searchParams;
  const month = isMonthKey(params.month) ? params.month : currentMonthKey();
  const cameras = await getAssignableCameras();
  const cameraId = cameras.some((camera) => camera.id === params.camera) ? params.camera : undefined;
  const { start, end } = monthBounds(month);
  const today = toDateKey(new Date());
  const futureEnd = toDateKey(addDays(new Date(), 90));
  const [monthOrders, futureOrders] = await Promise.all([
    getScheduleOrders({ start, end, cameraId }),
    getScheduleOrders({ start: today, end: futureEnd, cameraId }),
  ]);

  return (
    <div className="mx-auto max-w-[1360px]">
      <header className="flex flex-col gap-4 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium tracking-[0.16em] text-[var(--primary)]">档期</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">拍摄安排。</h1>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">订单的时间视图，仅展示团队拍摄信息。</p>
        </div>
        <ScheduleFilters month={month} cameraId={cameraId} cameras={cameras} />
      </header>

      <div className="mt-6">
        <ScheduleCalendar month={month} orders={monthOrders} cameraId={cameraId} />
      </div>
      <div className="mt-8">
        <ScheduleRecentList orders={futureOrders} />
      </div>
    </div>
  );
}
