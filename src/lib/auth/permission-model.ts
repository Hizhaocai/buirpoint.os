import type { Permission, Permissions, Profile, UserRole } from "@/types/database";

export const permissionGroups = [
  { label: "订单", permissions: ["orders_view", "orders_create", "orders_edit", "orders_delete"] as const },
  { label: "附件", permissions: ["attachments_manage"] as const },
  { label: "成员", permissions: ["members_manage"] as const },
] as const;

export const permissionLabels: Record<Permission, string> = {
  orders_view: "查看订单",
  orders_create: "创建订单",
  orders_edit: "编辑订单",
  orders_delete: "归档订单",
  attachments_manage: "上传与删除附件",
  members_manage: "管理成员",
};

const defaultPermissionsByRole: Record<UserRole, Record<Permission, boolean>> = {
  owner: { orders_view: true, orders_create: true, orders_edit: true, orders_delete: true, attachments_manage: true, members_manage: true },
  camera: { orders_view: true, orders_create: true, orders_edit: true, orders_delete: false, attachments_manage: true, members_manage: false },
};

export function defaultPermissions(role: UserRole): Permissions {
  return { ...defaultPermissionsByRole[role] };
}

export function hasPermission(profile: Pick<Profile, "role" | "permissions">, permission: Permission) {
  const explicit = profile.permissions?.[permission];
  return typeof explicit === "boolean" ? explicit : defaultPermissionsByRole[profile.role][permission];
}

export function displayName(profile: Pick<Profile, "display_name" | "name"> & { email?: string | null }) {
  return profile.display_name?.trim() || profile.name?.trim() || profile.email?.trim() || "未命名成员";
}
