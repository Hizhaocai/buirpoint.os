import { requireProfile } from "@/lib/auth/guards";
import { formatOrderCameraTeam } from "@/lib/orders/camera-team";
import { createClient } from "@/lib/supabase/server";
import type { OrderAttachment, OrderHistoryItem, OrderLog, OrderSourceType, OrderStatus, OrderWithCamera, PublicOrderSchedule, SourceSummaryItem } from "@/types/database";

export type WorkflowFilter = "backup_pending" | "editing" | "delivery_pending";
export type OrderFilters = {
  query?: string;
  status?: OrderStatus | "all";
  start?: string;
  end?: string;
  cameraId?: string;
  workflow?: WorkflowFilter;
  sourceType?: OrderSourceType;
  phone?: string;
  archived?: boolean;
};

export type WorkflowAttention = { backupPending: number; editing: number; deliveryPending: number };
export type OrderOperationsSummary = WorkflowAttention & { todayShoots: number; draft: number };

const orderFields = "id, project_name, client_name, contact_name, contact_phone, source_type, source_name, shoot_location, shoot_date, total_price, status, shoot_status, backup_status, editing_status, delivery_status, notes, assigned_camera_id, created_by, deleted_at, deleted_by, created_at, updated_at, assigned_camera:profiles!orders_assigned_camera_id_fkey(id, name, display_name, email), camera_assignments:order_camera_assignments(id, order_id, camera_id, role, camera:profiles!order_camera_assignments_camera_id_fkey(id, name, display_name, email))";

function withCameraTeam(order: OrderWithCamera): OrderWithCamera {
  const team = formatOrderCameraTeam(order.camera_assignments ?? []);
  return team && order.assigned_camera ? { ...order, assigned_camera: { ...order.assigned_camera, display_name: team } } : order;
}

export async function getOrders(filters: OrderFilters = {}) {
  await requireProfile();
  const supabase = await createClient();
  let query = supabase.from("orders").select(orderFields).order("shoot_date", { ascending: true, nullsFirst: false }).order("created_at", { ascending: false });
  query = filters.archived ? query.not("deleted_at", "is", null) : query.is("deleted_at", null);

  const normalizedQuery = filters.query?.trim();
  if (normalizedQuery) {
    const escaped = normalizedQuery.replaceAll(",", " ");
    query = query.or(`project_name.ilike.%${escaped}%,client_name.ilike.%${escaped}%,source_name.ilike.%${escaped}%,contact_name.ilike.%${escaped}%,contact_phone.ilike.%${escaped}%`);
  }
  if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);
  if (filters.start) query = query.gte("shoot_date", filters.start);
  if (filters.end) query = query.lte("shoot_date", filters.end);
  if (filters.cameraId) {
    const { data: assignments, error: assignmentError } = await supabase.from("order_camera_assignments").select("order_id").eq("camera_id", filters.cameraId);
    if (assignmentError) throw new Error("无法筛选摄像人员。");
    const orderIds = [...new Set((assignments ?? []).map((assignment) => assignment.order_id))];
    if (!orderIds.length) return [];
    query = query.in("id", orderIds);
  }
  if (filters.sourceType) query = query.eq("source_type", filters.sourceType);
  if (filters.phone) query = query.eq("contact_phone", filters.phone);
  if (filters.workflow === "backup_pending") query = query.eq("shoot_status", "completed").eq("backup_status", "pending").neq("status", "cancelled");
  if (filters.workflow === "editing") query = query.eq("editing_status", "editing").neq("status", "cancelled");
  if (filters.workflow === "delivery_pending") query = query.eq("editing_status", "completed").eq("delivery_status", "pending").neq("status", "cancelled");

  const { data, error } = await query.returns<OrderWithCamera[]>();
  if (error) throw new Error("无法读取订单列表。");
  return (data ?? []).map(withCameraTeam);
}

export async function getTodayOrders(today: string) {
  await requireProfile();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select(orderFields)
    .is("deleted_at", null)
    .eq("shoot_date", today)
    .neq("status", "cancelled")
    .order("created_at", { ascending: true })
    .returns<OrderWithCamera[]>();
  if (error) throw new Error("无法读取今日拍摄订单。");
  return (data ?? []).map(withCameraTeam);
}

export async function getSourceSuggestions(sourceType: OrderSourceType) {
  await requireProfile();
  if (sourceType === "direct_customer") return ["直客"];
  const supabase = await createClient();
  const { data, error } = await supabase.from("orders").select("source_name").eq("source_type", sourceType).is("deleted_at", null).order("created_at", { ascending: false }).limit(100);
  if (error) throw new Error("无法读取历史来源。");
  return [...new Set((data ?? []).map((order) => order.source_name).filter(Boolean))].slice(0, 8);
}

export async function getOrder(orderId: string, options: { archived?: boolean } = {}) {
  await requireProfile();
  const supabase = await createClient();
  let query = supabase.from("orders").select(orderFields).eq("id", orderId);
  query = options.archived ? query.not("deleted_at", "is", null) : query.is("deleted_at", null);
  const { data, error } = await query.maybeSingle<OrderWithCamera>();
  if (error) throw new Error("无法读取订单详情。");
  return data ? withCameraTeam(data) : null;
}

export async function getOrderOperationsSummary(today: string): Promise<OrderOperationsSummary> {
  await requireProfile(["owner"]);
  const supabase = await createClient();
  const [todayShoots, draft, backup, editing, delivery] = await Promise.all([
    supabase.from("orders").select("id", { count: "exact", head: true }).is("deleted_at", null).eq("shoot_date", today).neq("status", "cancelled"),
    supabase.from("orders").select("id", { count: "exact", head: true }).is("deleted_at", null).eq("status", "draft"),
    supabase.from("orders").select("id", { count: "exact", head: true }).is("deleted_at", null).eq("shoot_status", "completed").eq("backup_status", "pending").neq("status", "cancelled"),
    supabase.from("orders").select("id", { count: "exact", head: true }).is("deleted_at", null).eq("editing_status", "editing").neq("status", "cancelled"),
    supabase.from("orders").select("id", { count: "exact", head: true }).is("deleted_at", null).eq("editing_status", "completed").eq("delivery_status", "pending").neq("status", "cancelled"),
  ]);
  if (todayShoots.error || draft.error || backup.error || editing.error || delivery.error) throw new Error("无法读取工作提醒。");
  return { todayShoots: todayShoots.count ?? 0, draft: draft.count ?? 0, backupPending: backup.count ?? 0, editing: editing.count ?? 0, deliveryPending: delivery.count ?? 0 };
}

export async function getOrderHistory(order: Pick<OrderWithCamera, "id" | "client_name" | "contact_phone">) {
  await requireProfile();
  const supabase = await createClient();
  const fields = "id, project_name, shoot_date, status, total_price";
  if (order.contact_phone) {
    const { data, error } = await supabase.from("orders").select(fields).is("deleted_at", null).eq("contact_phone", order.contact_phone).neq("id", order.id).order("shoot_date", { ascending: false, nullsFirst: false }).limit(5).returns<OrderHistoryItem[]>();
    if (error) throw new Error("无法读取客户历史订单。");
    if (data.length) return { match: "phone" as const, orders: data };
  }
  if (!order.client_name) return { match: null, orders: [] };
  const { data, error } = await supabase.from("orders").select(fields).is("deleted_at", null).eq("client_name", order.client_name).neq("id", order.id).order("shoot_date", { ascending: false, nullsFirst: false }).limit(5).returns<OrderHistoryItem[]>();
  if (error) throw new Error("无法读取客户历史订单。");
  return { match: "name" as const, orders: data };
}

export async function getSourceSummary(year: number): Promise<SourceSummaryItem[]> {
  await requireProfile(["owner"]);
  const supabase = await createClient();
  const start = `${year}-01-01`;
  const end = `${year}-12-31`;
  const { data, error } = await supabase.from("orders").select("source_type, source_name").is("deleted_at", null).gte("shoot_date", start).lte("shoot_date", end).neq("status", "cancelled");
  if (error) throw new Error("无法读取来源概览。");
  const summaries = new Map<string, SourceSummaryItem>();
  for (const order of data ?? []) {
    const key = `${order.source_type}:${order.source_name}`;
    const current = summaries.get(key);
    summaries.set(key, current ? { ...current, order_count: current.order_count + 1 } : { source_type: order.source_type, source_name: order.source_name, order_count: 1 });
  }
  return [...summaries.values()].sort((a, b) => b.order_count - a.order_count || a.source_name.localeCompare(b.source_name, "zh-CN")).slice(0, 4);
}

export async function getOrderAttachments(orderId: string) {
  await requireProfile();
  const supabase = await createClient();
  const { data, error } = await supabase.from("order_attachments").select("id, order_id, file_name, file_path, file_type, file_size, uploaded_by, created_at, uploader:profiles!order_attachments_uploaded_by_fkey(id, name, email)").eq("order_id", orderId).order("created_at", { ascending: false }).returns<OrderAttachment[]>();
  if (error) throw new Error("无法读取订单附件。");
  return data;
}

export async function getOrderLogs(orderId: string) {
  await requireProfile();
  const supabase = await createClient();
  const { data, error } = await supabase.from("order_logs").select("id, order_id, actor_id, action, old_value, new_value, created_at, actor:profiles!order_logs_actor_id_fkey(id, name, email)").eq("order_id", orderId).order("created_at", { ascending: false }).returns<OrderLog[]>();
  if (error) throw new Error("无法读取订单变更记录。");
  return data;
}

export async function getOrderAttachmentDownloadUrl(filePath: string) {
  await requireProfile();
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from("order-attachments").createSignedUrl(filePath, 60);
  if (error || !data?.signedUrl) throw new Error("无法创建附件下载链接。");
  return data.signedUrl;
}

export async function getPublicOrderSchedule(filters: Pick<OrderFilters, "start" | "end" | "cameraId"> = {}) {
  await requireProfile();
  const supabase = await createClient();
  let query = supabase.from("order_schedule_public").select("id, shoot_date, project_name, shoot_location, assigned_camera_id, assigned_camera_name, assigned_camera_ids, assigned_cameras, status").order("shoot_date", { ascending: true });
  if (filters.start) query = query.gte("shoot_date", filters.start);
  if (filters.end) query = query.lte("shoot_date", filters.end);
  if (filters.cameraId) query = query.contains("assigned_camera_ids", [filters.cameraId]);
  const { data, error } = await query.returns<PublicOrderSchedule[]>();
  if (error) throw new Error("无法读取拍摄安排。");
  return data;
}
