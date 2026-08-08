import type { UserRole } from "@/types/database";

export const roleLabels: Record<UserRole, string> = {
  owner: "负责人",
  camera: "摄像师",
};

export function hasRole(role: UserRole, allowedRoles: UserRole[]) {
  return allowedRoles.includes(role);
}
