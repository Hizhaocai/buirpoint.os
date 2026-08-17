"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { replaceOrderCameraAssignments, validateActiveCameraAssignments } from "@/lib/orders/camera-assignments";
import { toOrderInput, type OrderFormState } from "@/lib/orders/schema";
import { createClient } from "@/lib/supabase/server";

function validationState(issues: Record<string, string[] | undefined>): OrderFormState {
  return { error: "请检查标记的字段。", fieldErrors: Object.fromEntries(Object.entries(issues).map(([key, value]) => [key, value?.[0]])) };
}

function assignmentIds(primaryCameraId: string | null, secondaryCameraIds: string[]) {
  return [primaryCameraId, ...secondaryCameraIds].filter((id): id is string => Boolean(id));
}

function revalidateOrderSurfaces(orderId?: string) {
  revalidatePath("/");
  revalidatePath("/orders");
  revalidatePath("/schedule");
  if (orderId) revalidatePath(`/orders/${orderId}`);
}

export async function createOrder(_: OrderFormState, formData: FormData): Promise<OrderFormState> {
  const { user, profile } = await requirePermission("orders_create");
  const isQuickCreate = formData.get("quick_create") === "true";
  const parsed = toOrderInput(formData);
  if (!parsed.success) return validationState(parsed.error.flatten().fieldErrors);
  const assignedCameraId = parsed.data.assigned_camera_id ?? (profile.role === "camera" ? profile.id : null);
  if (!await validateActiveCameraAssignments(assignmentIds(assignedCameraId, parsed.data.secondary_camera_ids))) return { error: "所选摄像人员不可用，请重新选择。" };

  const { secondary_camera_ids: secondaryCameraIds, ...orderInput } = parsed.data;
  const supabase = await createClient();
  const { data: order, error } = await supabase.from("orders").insert({ ...orderInput, assigned_camera_id: assignedCameraId, created_by: user.id }).select("id").single();
  if (error) {
    console.error("order create failed", {
      code: error.code,
      message: error.message,
      hint: error.hint,
    });
    return { error: "订单未能保存，请稍后重试。" };
  }
  const assignmentError = await replaceOrderCameraAssignments(order.id, assignedCameraId, secondaryCameraIds);
  if (assignmentError) return { error: "订单已建立，但摄像人员分配未能保存。" };
  revalidateOrderSurfaces(order.id);
  redirect(isQuickCreate ? `/orders/${order.id}` : "/orders");
}

export async function updateOrder(orderId: string, _: OrderFormState, formData: FormData): Promise<OrderFormState> {
  await requirePermission("orders_edit");
  const parsed = toOrderInput(formData);
  if (!parsed.success) return validationState(parsed.error.flatten().fieldErrors);
  if (!await validateActiveCameraAssignments(assignmentIds(parsed.data.assigned_camera_id, parsed.data.secondary_camera_ids))) return { error: "所选摄像人员不可用，请重新选择。" };
  const { secondary_camera_ids: secondaryCameraIds, ...orderInput } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("orders").update(orderInput).eq("id", orderId).is("deleted_at", null);
  if (error) return { error: "订单未能更新，请稍后重试。" };
  const assignmentError = await replaceOrderCameraAssignments(orderId, parsed.data.assigned_camera_id, secondaryCameraIds);
  if (assignmentError) return { error: "订单信息已更新，但摄像人员分配未能保存。" };
  revalidateOrderSurfaces(orderId);
  redirect(`/orders/${orderId}`);
}

export async function deleteOrder(orderId: string): Promise<{ error?: string }> {
  const { user } = await requirePermission("orders_delete");
  const supabase = await createClient();
  const { error } = await supabase.from("orders").update({ deleted_at: new Date().toISOString(), deleted_by: user.id }).eq("id", orderId).is("deleted_at", null);
  if (error) return { error: "订单未能移入归档，请稍后重试。" };
  revalidateOrderSurfaces();
  redirect("/orders");
}

export async function restoreOrder(orderId: string): Promise<{ error?: string }> {
  await requirePermission("orders_delete");
  const supabase = await createClient();
  const { error } = await supabase.from("orders").update({ deleted_at: null, deleted_by: null }).eq("id", orderId).not("deleted_at", "is", null);
  if (error) return { error: "订单未能恢复，请稍后重试。" };
  revalidateOrderSurfaces(orderId);
  return {};
}

export type FieldWorkflowAction = "shoot_completed" | "backup_uploaded" | "editing_completed" | "delivery_delivered";
const fieldWorkflowChanges: Record<FieldWorkflowAction, { field: "shoot_status" | "backup_status" | "editing_status" | "delivery_status"; expected: string; next: string }> = {
  shoot_completed: { field: "shoot_status", expected: "pending", next: "completed" }, backup_uploaded: { field: "backup_status", expected: "pending", next: "uploaded" }, editing_completed: { field: "editing_status", expected: "editing", next: "completed" }, delivery_delivered: { field: "delivery_status", expected: "pending", next: "delivered" },
};
export async function advanceOrderWorkflow(orderId: string, action: FieldWorkflowAction): Promise<{ error?: string; success?: string }> {
  await requirePermission("orders_edit");
  const change = fieldWorkflowChanges[action];
  const supabase = await createClient();
  const { data: current, error: readError } = await supabase.from("orders").select("shoot_status, backup_status, editing_status, delivery_status").eq("id", orderId).is("deleted_at", null).maybeSingle();
  if (readError || !current) return { error: "订单不存在、已归档或无权操作。" };
  const allowed = (action === "shoot_completed" && current.shoot_status === "pending") || (action === "backup_uploaded" && current.shoot_status === "completed" && current.backup_status === "pending") || (action === "editing_completed" && current.editing_status === "editing") || (action === "delivery_delivered" && current.editing_status === "completed" && current.delivery_status === "pending");
  if (!allowed) return { error: "当前订单不满足这一步操作的条件，请刷新后确认制作进度。" };
  const { data, error } = await supabase.from("orders").update({ [change.field]: change.next }).eq("id", orderId).is("deleted_at", null).eq(change.field, change.expected).select("id").maybeSingle();
  if (error || !data) return { error: "订单状态已变化，请刷新后重试。" };
  revalidateOrderSurfaces(orderId);
  return { success: "现场状态已更新。" };
}
