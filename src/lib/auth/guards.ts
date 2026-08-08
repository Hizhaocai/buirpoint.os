import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { hasRole } from "@/lib/auth/roles";
import type { Profile, UserRole } from "@/types/database";

export async function requireUser() {
  if (!isSupabaseConfigured()) {
    redirect("/login?reason=configuration");
  }

  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  return user;
}

export async function requireProfile(allowedRoles?: UserRole[]) {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, name, display_name, permissions, role, status, created_at, updated_at")
    .eq("id", user.id)
    .single<Profile>();

  if (error || !data || data.status !== "active") {
    redirect("/login?reason=access");
  }

  if (allowedRoles && !hasRole(data.role, allowedRoles)) {
    redirect("/?reason=forbidden");
  }

  return { user, profile: data };
}
