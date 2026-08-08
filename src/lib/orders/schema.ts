import { z } from "zod";
import type { OrderBackupStatus, OrderDeliveryStatus, OrderEditingStatus, OrderShootStatus, OrderSourceType, OrderStatus } from "@/types/database";

export const orderStatuses = ["draft", "confirmed", "completed", "cancelled"] as const satisfies readonly OrderStatus[];
export const orderShootStatuses = ["pending", "completed"] as const satisfies readonly OrderShootStatus[];
export const orderBackupStatuses = ["pending", "uploaded", "confirmed"] as const satisfies readonly OrderBackupStatus[];
export const orderEditingStatuses = ["pending", "editing", "completed"] as const satisfies readonly OrderEditingStatus[];
export const orderDeliveryStatuses = ["pending", "delivered"] as const satisfies readonly OrderDeliveryStatus[];
export const orderSourceTypes = ["wedding_company", "direct_customer"] as const satisfies readonly OrderSourceType[];

export const orderStatusLabels: Record<OrderStatus, string> = { draft: "待确认", confirmed: "已确认", completed: "已完成", cancelled: "已取消" };
export const orderShootStatusLabels: Record<OrderShootStatus, string> = { pending: "待拍摄", completed: "已拍摄" };
export const orderBackupStatusLabels: Record<OrderBackupStatus, string> = { pending: "待备份", uploaded: "已上传", confirmed: "已确认" };
export const orderEditingStatusLabels: Record<OrderEditingStatus, string> = { pending: "待剪辑", editing: "剪辑中", completed: "已剪辑" };
export const orderDeliveryStatusLabels: Record<OrderDeliveryStatus, string> = { pending: "待交付", delivered: "已交付" };
export const orderSourceTypeLabels: Record<OrderSourceType, string> = { wedding_company: "婚庆订单", direct_customer: "直客订单" };

const optionalText = (maximum: number) => z.string().trim().max(maximum, `最多 ${maximum} 个字符`).transform((value) => value || null);
const cameraId = z.string().uuid("请选择有效的摄像人员");

export const orderInputSchema = z.object({
  project_name: z.string().trim().min(1, "请填写项目名称").max(160, "项目名称最多 160 个字符"),
  client_name: z.string().trim().min(1, "请填写客户名称").max(120, "客户名称最多 120 个字符"),
  contact_name: optionalText(80),
  contact_phone: optionalText(40),
  source_type: z.enum(orderSourceTypes),
  source_name: z.string().trim().min(1, "请填写来源名称").max(120, "来源名称最多 120 个字符"),
  shoot_location: optionalText(240),
  shoot_date: z.string().trim().refine((value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value), "请选择有效的拍摄日期").transform((value) => value || null),
  total_price: z.coerce.number({ error: "请填写有效的订单总价" }).finite("请填写有效的订单总价").min(0, "订单总价不能小于 0").max(9999999999.99, "订单总价超出支持范围"),
  status: z.enum(orderStatuses),
  assigned_camera_id: cameraId.or(z.literal("")).transform((value) => value || null),
  secondary_camera_ids: z.array(cameraId).default([]),
  shoot_status: z.enum(orderShootStatuses),
  backup_status: z.enum(orderBackupStatuses),
  editing_status: z.enum(orderEditingStatuses),
  delivery_status: z.enum(orderDeliveryStatuses),
  notes: optionalText(2000),
}).superRefine((value, context) => {
  if (value.source_type === "direct_customer" && value.source_name !== "直客") context.addIssue({ code: "custom", path: ["source_name"], message: "直客订单的来源名称固定为“直客”。" });
  if (value.assigned_camera_id && value.secondary_camera_ids.includes(value.assigned_camera_id)) context.addIssue({ code: "custom", path: ["secondary_camera_ids"], message: "主摄不能同时作为副摄。" });
  if (new Set(value.secondary_camera_ids).size !== value.secondary_camera_ids.length) context.addIssue({ code: "custom", path: ["secondary_camera_ids"], message: "副摄像人员不能重复。" });
});

export type OrderInput = z.infer<typeof orderInputSchema>;
export type OrderFormState = { error?: string; fieldErrors?: Partial<Record<keyof OrderInput, string>> };

export function toOrderInput(formData: FormData) {
  const isQuickCreate = formData.get("quick_create") === "true";
  const clientName = String(formData.get("client_name") ?? "").trim();
  const sourceType = formData.get("source_type");
  return orderInputSchema.safeParse({
    project_name: formData.get("project_name") || (isQuickCreate && clientName ? `${clientName} 婚礼跟拍` : ""),
    client_name: clientName,
    contact_name: formData.get("contact_name"),
    contact_phone: formData.get("contact_phone"),
    source_type: sourceType,
    source_name: sourceType === "direct_customer" ? "直客" : formData.get("source_name"),
    shoot_location: formData.get("shoot_location"),
    shoot_date: formData.get("shoot_date"),
    total_price: formData.get("total_price"),
    status: formData.get("status"),
    assigned_camera_id: formData.get("assigned_camera_id"),
    secondary_camera_ids: formData.getAll("secondary_camera_ids").filter((value): value is string => typeof value === "string" && value.length > 0),
    shoot_status: formData.get("shoot_status"),
    backup_status: formData.get("backup_status"),
    editing_status: formData.get("editing_status"),
    delivery_status: formData.get("delivery_status"),
    notes: formData.get("notes"),
  });
}
