"use server";

import { revalidatePath } from "next/cache";
import { defaultPermissions, hasPermission } from "@/lib/auth/permission-model";
import { requirePermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import type { Permissions, UserRole, UserStatus } from "@/types/database";

export type MemberActionResult = { error?: string; success?: string };

type MutableMember = { id: string; role: UserRole; status: UserStatus; permissions: Permissions };

async function getMemberForChange(memberId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, status, permissions")
    .eq("id", memberId)
    .maybeSingle<MutableMember>();
  if (error || !data) return { error: "成员不存在或已无法访问。" } as const;
  return { data, supabase } as const;
}

async function ensureAnotherManagingOwner(member: MutableMember, nextRole: UserRole, nextStatus: UserStatus, nextPermissions: Permissions): Promise<MemberActionResult | null> {
  if (member.role !== "owner" || member.status !== "active" || hasPermission({ role: nextRole, permissions: nextPermissions }, "members_manage")) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, status, permissions")
    .eq("role", "owner")
    .eq("status", "active");
  if (error) return { error: "无法确认管理员权限，请稍后重试。" };
  const otherManagingOwners = (data ?? []).filter((owner) => owner.id !== member.id && hasPermission(owner as Pick<MutableMember, "role" | "permissions">, "members_manage")).length;
  if (otherManagingOwners < 1) return { error: "系统至少需要保留一位拥有成员管理权限的正常管理员。" };
  return null;
}

function revalidateMembers() {
  revalidatePath("/members");
  revalidatePath("/orders");
  revalidatePath("/schedule");
  revalidatePath("/", "layout");
}

async function warnAssignedOrdersOnDisable(memberId: string, supabase: Awaited<ReturnType<typeof createClient>>) {
  const { count, error } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("assigned_camera_id", memberId);

  if (error) {
    console.warn(`[成员停用检查] 无法读取成员 ${memberId} 的订单分配关系。`);
    return;
  }
  if ((count ?? 0) > 0) {
    console.warn(`[成员停用] 成员 ${memberId} 仍关联 ${count} 笔日常订单；历史分配已保留，后续新订单不可再分配给该成员。`);
  }
}

export async function updateMemberRole(memberId: string, role: UserRole): Promise<MemberActionResult> {
  await requirePermission("members_manage");
  if (role !== "owner" && role !== "camera") return { error: "无效的成员角色。" };
  const target = await getMemberForChange(memberId);
  if ("error" in target) return target;
  if (target.data.role === role) return { success: "成员角色未发生变化。" };
  const permissions = defaultPermissions(role);
  const protectedOwner = await ensureAnotherManagingOwner(target.data, role, target.data.status, permissions);
  if (protectedOwner) return protectedOwner;

  const { error } = await target.supabase.from("profiles").update({ role, permissions }).eq("id", memberId);
  if (error) return { error: "角色未能更新，请稍后重试。" };
  revalidateMembers();
  return { success: "成员角色已更新，并已应用该角色的默认权限。" };
}

export async function updateMemberStatus(memberId: string, status: UserStatus): Promise<MemberActionResult> {
  await requirePermission("members_manage");
  if (status !== "active" && status !== "disabled") return { error: "无效的成员状态。" };
  const target = await getMemberForChange(memberId);
  if ("error" in target) return target;
  if (target.data.status === status) return { success: "成员状态未发生变化。" };
  const protectedOwner = await ensureAnotherManagingOwner(target.data, target.data.role, status, target.data.permissions);
  if (protectedOwner) return protectedOwner;

  if (status === "disabled") await warnAssignedOrdersOnDisable(memberId, target.supabase);

  const { error } = await target.supabase.from("profiles").update({ status }).eq("id", memberId);
  if (error) return { error: "成员状态未能更新，请稍后重试。" };
  revalidateMembers();
  return { success: status === "active" ? "成员已恢复访问。" : "成员已停用。" };
}

export async function updateMemberProfile(memberId: string, displayName: string, permissions: Permissions): Promise<MemberActionResult> {
  await requirePermission("members_manage");
  const target = await getMemberForChange(memberId);
  if ("error" in target) return target;
  const normalizedName = displayName.trim().slice(0, 80) || null;
  const nextPermissions: Permissions = {};
  for (const key of ["orders_view", "orders_create", "orders_edit", "orders_delete", "attachments_manage", "members_manage", "portfolio_view", "portfolio_create", "portfolio_edit", "portfolio_publish", "portfolio_delete"] as const) {
    if (typeof permissions[key] === "boolean") nextPermissions[key] = permissions[key];
  }
  if (nextPermissions.portfolio_create || nextPermissions.portfolio_edit || nextPermissions.portfolio_publish || nextPermissions.portfolio_delete) {
    nextPermissions.portfolio_view = true;
  }
  const protectedOwner = await ensureAnotherManagingOwner(target.data, target.data.role, target.data.status, nextPermissions);
  if (protectedOwner) return protectedOwner;

  const { error } = await target.supabase.from("profiles").update({ display_name: normalizedName, permissions: nextPermissions }).eq("id", memberId);
  if (error) return { error: "成员资料未能保存，请稍后重试。" };
  revalidateMembers();
  return { success: "成员资料与权限已保存。" };
}
