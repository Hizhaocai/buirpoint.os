import { orderBackupStatusLabels, orderDeliveryStatusLabels, orderEditingStatusLabels, orderShootStatusLabels, orderSourceTypeLabels, orderStatusLabels } from "@/lib/orders/schema";
import type { OrderLog, OrderLogAction } from "@/types/database";

const labels: Record<OrderLogAction, string> = {
  client_changed: "更新了客户信息",
  restored: "恢复了订单",
  created: "创建了订单",
  status_changed: "更新了订单状态",
  shoot_date_changed: "调整了拍摄日期",
  camera_changed: "调整了主摄像人员",
  camera_assigned: "添加了摄像人员",
  camera_removed: "移除了摄像人员",
  price_changed: "调整了订单总价",
  attachment_uploaded: "添加了附件",
  attachment_deleted: "移除了附件",
  deleted: "删除了订单",
  wedding_company_changed: "更新了婚庆公司",
  shoot_location_changed: "更新了拍摄地点",
  shoot_status_changed: "更新了拍摄状态",
  backup_status_changed: "更新了素材备份",
  editing_status_changed: "更新了剪辑状态",
  delivery_status_changed: "更新了交付状态",
  source_changed: "更新了订单来源",
};

function valueText(value: Record<string, unknown> | null) {
  if (!value) return "未设置";
  if (typeof value.name === "string") return value.name;
  if (typeof value.status === "string") return orderStatusLabels[value.status as keyof typeof orderStatusLabels] ?? value.status;
  if (typeof value.shoot_status === "string") return orderShootStatusLabels[value.shoot_status as keyof typeof orderShootStatusLabels] ?? value.shoot_status;
  if (typeof value.backup_status === "string") return orderBackupStatusLabels[value.backup_status as keyof typeof orderBackupStatusLabels] ?? value.backup_status;
  if (typeof value.editing_status === "string") return orderEditingStatusLabels[value.editing_status as keyof typeof orderEditingStatusLabels] ?? value.editing_status;
  if (typeof value.delivery_status === "string") return orderDeliveryStatusLabels[value.delivery_status as keyof typeof orderDeliveryStatusLabels] ?? value.delivery_status;
  if (typeof value.shoot_date === "string") return value.shoot_date;
  if (typeof value.total_price === "number" || typeof value.total_price === "string") return `¥${Number(value.total_price).toLocaleString("zh-CN")}`;
  if (typeof value.wedding_company_name === "string") return value.wedding_company_name;
  if (typeof value.shoot_location === "string") return value.shoot_location;
  if (typeof value.source_name === "string") {
    const sourceType = typeof value.source_type === "string" ? orderSourceTypeLabels[value.source_type as keyof typeof orderSourceTypeLabels] : null;
    return sourceType ? `${sourceType} · ${value.source_name}` : value.source_name;
  }
  if (typeof value.file_name === "string") return value.file_name;
  if (typeof value.project_name === "string") return value.project_name;
  return "已更新";
}

function description(log: OrderLog) {
  if (!log.old_value && log.new_value && (log.action === "created" || log.action === "attachment_uploaded")) return valueText(log.new_value);
  if (log.old_value || log.new_value) return `${valueText(log.old_value)} → ${valueText(log.new_value)}`;
  return null;
}

export function OrderLogTimeline({ logs }: { logs: OrderLog[] }) {
  return <section aria-labelledby="log-heading" className="border-t border-[var(--border)] pt-8"><div><p className="text-xs font-medium tracking-[0.14em] text-[var(--muted-foreground)]">ORDER HISTORY</p><h2 id="log-heading" className="mt-2 text-lg font-semibold tracking-tight">变更记录</h2><p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">仅保留影响订单协作的关键业务变化。</p></div>{logs.length ? <ol className="mt-7 border-l border-[var(--border)] pl-5">{logs.map((log) => { const actor = log.actor?.name ?? log.actor?.email ?? "系统"; const detail = description(log); return <li key={log.id} className="relative pb-7 last:pb-0"><span aria-hidden className="absolute -left-[1.57rem] top-1.5 size-2 rounded-full bg-[var(--primary)]" /><p className="font-medium">{actor}<span className="font-normal text-[var(--muted-foreground)]"> {labels[log.action]}</span></p>{detail ? <p className="mt-1 text-sm text-[var(--muted-foreground)]">{detail}</p> : null}<time className="mt-2 block font-mono text-xs text-[var(--muted-foreground)]" dateTime={log.created_at}>{new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(log.created_at))}</time></li>; })}</ol> : <p className="mt-7 border-y border-dashed border-[var(--border)] py-7 text-sm text-[var(--muted-foreground)]">尚无关键业务变更记录。</p>}</section>;
}
