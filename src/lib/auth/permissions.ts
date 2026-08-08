import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/permission-model";
import type { Permission } from "@/types/database";

export { defaultPermissions, displayName, hasPermission, permissionGroups, permissionLabels } from "@/lib/auth/permission-model";

export async function requirePermission(permission: Permission) {
  const session = await requireProfile();
  if (!hasPermission(session.profile, permission)) redirect("/?reason=forbidden");
  return session;
}
