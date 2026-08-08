"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

const attachmentMimeTypes = new Set([
  "application/pdf", "image/jpeg", "image/png", "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

export type AttachmentActionState = { error?: string; success?: string };

export async function uploadOrderAttachment(orderId: string, _: AttachmentActionState, formData: FormData): Promise<AttachmentActionState> {
  const { user } = await requirePermission("attachments_manage");
  const file = formData.get("attachment");
  if (!(file instanceof File) || file.size === 0) return { error: "请选择需要上传的资料。" };
  if (!attachmentMimeTypes.has(file.type)) return { error: "仅支持 PDF、图片、Word 或 Excel 文件。" };
  if (file.size > 20 * 1024 * 1024) return { error: "单个附件不能超过 20 MB。" };

  const supabase = await createClient();
  const { data: order } = await supabase.from("orders").select("id").eq("id", orderId).is("deleted_at", null).maybeSingle();
  if (!order) return { error: "订单不存在、已归档或无权访问。" };
  const id = randomUUID();
  const filePath = `orders/${orderId}/${id}`;
  const { error: uploadError } = await supabase.storage.from("order-attachments").upload(filePath, file, { contentType: file.type, upsert: false });
  if (uploadError) return { error: "附件上传失败，请稍后重试。" };
  const { error: metadataError } = await supabase.from("order_attachments").insert({ id, order_id: orderId, file_name: file.name, file_path: filePath, file_type: file.type, file_size: file.size, uploaded_by: user.id });
  if (metadataError) {
    await supabase.storage.from("order-attachments").remove([filePath]);
    return { error: "附件资料未能保存，请稍后重试。" };
  }
  const { error: logError } = await supabase.from("order_logs").insert({ order_id: orderId, actor_id: user.id, action: "attachment_uploaded", new_value: { file_name: file.name, file_type: file.type, file_size: file.size } });
  if (logError) return { error: "附件已上传，但操作记录未能保存，请联系负责人。" };
  revalidatePath(`/orders/${orderId}`);
  return { success: "资料已添加到订单。" };
}

export async function deleteOrderAttachment(orderId: string, attachmentId: string): Promise<AttachmentActionState> {
  const { user } = await requirePermission("attachments_manage");
  const supabase = await createClient();
  const { data: attachment, error: readError } = await supabase.from("order_attachments").select("id, file_name, file_path, file_type, file_size").eq("id", attachmentId).eq("order_id", orderId).maybeSingle();
  if (readError || !attachment) return { error: "附件不存在或无权操作。" };
  const { error: objectError } = await supabase.storage.from("order-attachments").remove([attachment.file_path]);
  if (objectError) return { error: "附件删除失败，请稍后重试。" };
  const { error: metadataError } = await supabase.from("order_attachments").delete().eq("id", attachmentId).eq("order_id", orderId);
  if (metadataError) return { error: "文件已移除，但附件记录未能清理，请联系负责人。" };
  const { error: logError } = await supabase.from("order_logs").insert({ order_id: orderId, actor_id: user.id, action: "attachment_deleted", old_value: { file_name: attachment.file_name, file_type: attachment.file_type, file_size: attachment.file_size } });
  if (logError) return { error: "附件已移除，但操作记录未能保存，请联系负责人。" };
  revalidatePath(`/orders/${orderId}`);
  return { success: "附件已移除。" };
}
