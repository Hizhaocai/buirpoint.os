import Link from "next/link";
import { CaretLeft, MapPin, PencilSimple, Phone } from "@phosphor-icons/react/dist/ssr";
import { notFound } from "next/navigation";
import { OrderAttachments } from "@/components/orders/order-attachments";
import { OrderDeleteButton } from "@/components/orders/order-delete-button";
import { OrderRestoreButton } from "@/components/orders/order-restore-button";
import { OrderFieldActions } from "@/components/orders/order-field-actions";
import { OrderLogTimeline } from "@/components/orders/order-log-timeline";
import { OrderHistory } from "@/components/orders/order-history";
import { OrderStatusBadge, displayDate, displayPrice } from "@/components/orders/order-list";
import { Button } from "@/components/ui/button";
import { PageIntro } from "@/components/layout/page-intro";
import { requireProfile } from "@/lib/auth/guards";
import { orderBackupStatusLabels, orderDeliveryStatusLabels, orderEditingStatusLabels, orderShootStatusLabels, orderSourceTypeLabels } from "@/lib/orders/schema";
import { getOrder, getOrderAttachmentDownloadUrl, getOrderAttachments, getOrderHistory, getOrderLogs } from "@/lib/orders/queries";
import type { OrderWithCamera } from "@/types/database";

function DetailItem({ label, children }: { label: string; children: React.ReactNode }) { return <div><dt className="text-xs font-medium text-[var(--muted-foreground)]">{label}</dt><dd className="mt-1.5 font-medium">{children}</dd></div>; }

function nextFieldAction(order: OrderWithCamera) {
  if (order.shoot_status === "pending") return { action: "shoot_completed" as const, label: "拍摄完成" };
  if (order.backup_status === "pending") return { action: "backup_uploaded" as const, label: "标记已备份" };
  if (order.editing_status === "editing") return { action: "editing_completed" as const, label: "剪辑完成" };
  if (order.editing_status === "completed" && order.delivery_status === "pending") return { action: "delivery_delivered" as const, label: "确认已交付", requiresConfirmation: true };
  return null;
}

export default async function OrderDetailPage({ params, searchParams }: { params: Promise<{ orderId: string }>; searchParams: Promise<{ archive?: string }> }) {
  await requireProfile();
  const { orderId } = await params;
  const archived = (await searchParams).archive === "true";
  const [order, attachments, logs] = await Promise.all([getOrder(orderId, { archived }), getOrderAttachments(orderId), getOrderLogs(orderId)]);
  if (!order) notFound();
  const attachmentsWithUrls = await Promise.all(attachments.map(async (attachment) => ({ ...attachment, downloadUrl: await getOrderAttachmentDownloadUrl(attachment.file_path) })));
  const history = archived ? { match: null, orders: [] } : await getOrderHistory(order);
  const allOrdersHref = order.contact_phone ? `/orders?phone=${encodeURIComponent(order.contact_phone)}` : `/orders?q=${encodeURIComponent(order.client_name)}`;
  const backHref = archived ? "/orders?archive=true" : "/orders";
  const action = archived ? null : nextFieldAction(order);
  const mapHref = order.shoot_location ? `https://uri.amap.com/search?query=${encodeURIComponent(order.shoot_location)}` : null;

  return <div className="mx-auto max-w-[1000px]"><Button asChild variant="ghost" size="sm" className="mb-5 -ml-3"><Link href={backHref}><CaretLeft size={16} />返回订单</Link></Button><div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between"><PageIntro eyebrow={archived ? "归档订单" : "订单详情"} title={order.project_name} description={archived ? "这笔订单已从日常工作节奏中移出。" : order.client_name} /><div className="flex shrink-0 items-center gap-2">{archived ? <OrderRestoreButton orderId={order.id} /> : <><Button asChild variant="outline"><Link href={`/orders/${order.id}/edit`}><PencilSimple size={18} />编辑</Link></Button><OrderDeleteButton orderId={order.id} projectName={order.project_name} /></>}</div></div><div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]"><section className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><h2 className="font-semibold">拍摄与订单</h2><OrderStatusBadge status={order.status} /></div><dl className="mt-6 grid gap-5 sm:grid-cols-2"><DetailItem label="拍摄日期">{displayDate(order.shoot_date)}</DetailItem><DetailItem label="拍摄地点"><span className="flex flex-wrap items-center gap-2">{order.shoot_location ?? "未记录"}{mapHref ? <a href={mapHref} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-[var(--border-strong)] px-2 text-xs font-medium text-[var(--primary)] transition-colors hover:bg-[var(--secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"><MapPin aria-hidden size={15} />导航</a> : null}</span></DetailItem><DetailItem label="主摄像">{order.assigned_camera?.display_name ?? order.assigned_camera?.name ?? order.assigned_camera?.email ?? "暂未分配"}</DetailItem><DetailItem label="订单总价"><span className="font-mono">{displayPrice(order.total_price)}</span></DetailItem><DetailItem label="订单来源">{orderSourceTypeLabels[order.source_type]} · {order.source_name}</DetailItem><DetailItem label="创建时间"><span className="text-sm">{new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long", day: "numeric" }).format(new Date(order.created_at))}</span></DetailItem></dl></section><section className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-5 sm:p-6"><h2 className="font-semibold">联系人</h2><dl className="mt-6 grid gap-5"><DetailItem label="姓名">{order.contact_name ?? order.client_name}</DetailItem><DetailItem label="电话">{order.contact_phone ? <a href={`tel:${order.contact_phone}`} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-[var(--border-strong)] px-2 text-sm text-[var(--primary)] transition-colors hover:bg-[var(--secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"><Phone aria-hidden size={16} />{order.contact_phone}</a> : "未记录"}</DetailItem></dl>{!archived ? <OrderHistory orders={history.orders} match={history.match} allOrdersHref={allOrdersHref} /> : null}</section></div><section className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--background)] p-5 sm:p-6"><h2 className="font-semibold">制作进度</h2><p className="mt-1 text-sm text-[var(--muted-foreground)]">订单状态与制作交接分别记录。</p><dl className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4"><DetailItem label="拍摄">{orderShootStatusLabels[order.shoot_status]}</DetailItem><DetailItem label="素材备份">{orderBackupStatusLabels[order.backup_status]}</DetailItem><DetailItem label="剪辑">{orderEditingStatusLabels[order.editing_status]}</DetailItem><DetailItem label="交付">{orderDeliveryStatusLabels[order.delivery_status]}</DetailItem></dl></section>{action ? <OrderFieldActions orderId={order.id} {...action} /> : null}<section className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--background)] p-5 sm:p-6"><h2 className="font-semibold">内部备注</h2><p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[var(--muted-foreground)]">{order.notes ?? "暂无备注。"}</p></section>{!archived ? <div className="mt-10 space-y-10"><OrderAttachments orderId={order.id} attachments={attachmentsWithUrls} /><OrderLogTimeline logs={logs} /></div> : <div className="mt-10"><OrderLogTimeline logs={logs} /></div>}</div>;
}
