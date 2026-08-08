import Link from "next/link";
import { MagnifyingGlass, Plus } from "@phosphor-icons/react/dist/ssr";
import { PageIntro } from "@/components/layout/page-intro";
import { Button } from "@/components/ui/button";
import { OrderList } from "@/components/orders/order-list";
import { requireProfile } from "@/lib/auth/guards";
import { getOrders, type WorkflowFilter } from "@/lib/orders/queries";
import { getAssignableCameras } from "@/lib/members/queries";
import { orderStatusLabels, orderStatuses } from "@/lib/orders/schema";
import type { OrderSourceType, OrderStatus } from "@/types/database";

type OrdersPageProps = {
  searchParams: Promise<{
    q?: string;
    phone?: string;
    status?: string;
    source?: string;
    start?: string;
    end?: string;
    camera?: string;
    workflow?: string;
    archive?: string;
  }>;
};

const workflowOptions: { value: WorkflowFilter; label: string }[] = [
  { value: "backup_pending", label: "待备份" },
  { value: "editing", label: "剪辑中" },
  { value: "delivery_pending", label: "待交付" },
];
const sourceOptions: { value: OrderSourceType; label: string }[] = [
  { value: "wedding_company", label: "婚庆订单" },
  { value: "direct_customer", label: "直客订单" },
];
const controlClass =
  "h-11 w-full rounded-[10px] border border-[var(--border-strong)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--primary)_18%,transparent)]";

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  await requireProfile();
  const params = await searchParams;
  const archived = params.archive === "true";
  const status = orderStatuses.includes(params.status as OrderStatus)
    ? (params.status as OrderStatus)
    : "all";
  const sourceType = sourceOptions.some((option) => option.value === params.source)
    ? (params.source as OrderSourceType)
    : undefined;
  const workflow = workflowOptions.some((option) => option.value === params.workflow)
    ? (params.workflow as WorkflowFilter)
    : undefined;
  const [orders, cameras] = await Promise.all([
    getOrders({
      query: params.q,
      phone: params.phone,
      status,
      sourceType,
      start: params.start,
      end: params.end,
      cameraId: params.camera,
      workflow,
      archived,
    }),
    getAssignableCameras(),
  ]);
  const filtered = Boolean(
    params.q ||
      params.phone ||
      status !== "all" ||
      sourceType ||
      params.start ||
      params.end ||
      params.camera ||
      workflow,
  );

  return (
    <div className="mx-auto max-w-[1360px]">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <PageIntro
          eyebrow="订单"
          title={archived ? "已归档的项目记录。" : "工作室的项目档案。"}
          description={
            archived
              ? "归档订单不会出现在日常工作节奏或默认查询中；恢复后会重新回到项目档案。"
              : "订单是拍摄安排的唯一来源；用日期、人员与制作进度保持每一次交接清晰。"
          }
        />
        <Button asChild className="shrink-0">
          <Link href="/orders/new">
            <Plus size={18} />
            新建订单
          </Link>
        </Button>
      </div>

      <nav aria-label="订单快捷处理" className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-[var(--border)] pt-4 text-sm">
        <span className="text-[var(--muted-foreground)]">快捷处理</span>
        {archived ? (
          <Link href="/orders" className="font-medium hover:text-[var(--primary)] hover:underline">
            返回项目档案
          </Link>
        ) : (
          <>
            <Link href="/orders?status=draft" className="font-medium hover:text-[var(--primary)] hover:underline">待确认</Link>
            {workflowOptions.map((option) => (
              <Link key={option.value} href={`/orders?workflow=${option.value}`} className="font-medium hover:text-[var(--primary)] hover:underline">
                {option.label}
              </Link>
            ))}
            <Link href="/orders?archive=true" className="font-medium hover:text-[var(--primary)] hover:underline">归档</Link>
          </>
        )}
      </nav>

      {!archived ? (
        <form className="mb-5 grid gap-3 border-y border-[var(--border)] py-4 lg:grid-cols-[minmax(0,1.25fr)_8rem_8rem_8rem_9rem_9rem_9rem_auto] lg:items-center" action="/orders">
          <label className="relative block">
            <span className="sr-only">搜索订单</span>
            <MagnifyingGlass aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" size={18} />
            <input name="q" type="search" defaultValue={params.q ?? ""} placeholder="搜索项目、客户、来源、联系人或电话" className={`${controlClass} pl-10 pr-3`} />
          </label>
          <label><span className="sr-only">开始日期</span><input name="start" type="date" defaultValue={params.start ?? ""} className={controlClass} /></label>
          <label><span className="sr-only">结束日期</span><input name="end" type="date" defaultValue={params.end ?? ""} className={controlClass} /></label>
          <label><span className="sr-only">订单状态</span><select name="status" defaultValue={status} className={controlClass}><option value="all">订单状态</option>{orderStatuses.map((value) => <option key={value} value={value}>{orderStatusLabels[value]}</option>)}</select></label>
          <label><span className="sr-only">订单来源</span><select name="source" defaultValue={sourceType ?? ""} className={controlClass}><option value="">全部来源</option>{sourceOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label><span className="sr-only">摄像人员</span><select name="camera" defaultValue={params.camera ?? ""} className={controlClass}><option value="">摄像人员</option>{cameras.map((camera) => <option key={camera.id} value={camera.id}>{camera.display_name}</option>)}</select></label>
          <label><span className="sr-only">制作关注</span><select name="workflow" defaultValue={workflow ?? ""} className={controlClass}><option value="">制作关注</option>{workflowOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <Button type="submit" variant="secondary">筛选</Button>
        </form>
      ) : null}

      <p className="mb-3 text-sm text-[var(--muted-foreground)]">
        {orders.length} 笔{archived ? "归档订单" : "订单"}{filtered ? " · 当前为筛选结果" : ""}
      </p>
      <OrderList orders={orders} archived={archived} />
    </div>
  );
}
