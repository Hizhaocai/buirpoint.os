import { requirePermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import type { AssignableCamera, Member } from "@/types/database";

export async function getMembers() {
  await requirePermission("members_manage");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, display_name, permissions, role, status, created_at")
    .order("status", { ascending: true })
    .order("role", { ascending: true })
    .order("created_at", { ascending: true })
    .returns<Member[]>();

  if (error) throw new Error("无法读取成员资料。");
  return data;
}

/**
 * The single assignment source for orders and schedule filters.
 * Disabled members deliberately remain attached to past orders, but cannot be
 * selected for new assignments.
 */
export async function getAssignableCameras(): Promise<AssignableCamera[]> {
  await requirePermission("orders_view");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, role")
    .eq("role", "camera")
    .eq("status", "active")
    .order("display_name", { ascending: true, nullsFirst: false });

  if (error) throw new Error("无法读取可分配的摄像人员。");
  return (data ?? []).map((camera) => ({
    id: camera.id,
    display_name: camera.display_name?.trim() || "未命名摄像师",
    role: camera.role as AssignableCamera["role"],
  }));
}
