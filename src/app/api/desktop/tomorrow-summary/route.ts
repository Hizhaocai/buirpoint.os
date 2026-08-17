import { NextResponse } from "next/server";
import { hasPermission } from "@/lib/auth/permission-model";
import { tomorrowBusinessDateKey } from "@/lib/calendar/business-time";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStoreHeaders });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, role, permissions, status")
      .eq("id", user.id)
      .maybeSingle<Pick<Profile, "id" | "role" | "permissions" | "status">>();

    if (profileError || !profile || profile.status !== "active") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: noStoreHeaders });
    }

    if (!hasPermission(profile, "orders_view")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: noStoreHeaders });
    }

    const tomorrow = tomorrowBusinessDateKey();
    const { count, error } = await supabase
      .from("order_schedule_public")
      .select("id", { count: "exact", head: true })
      .eq("shoot_date", tomorrow)
      .neq("status", "cancelled");

    if (error) {
      console.error("desktop tomorrow summary query failed", error.message);
      return NextResponse.json({ error: "Unable to load summary" }, { status: 500, headers: noStoreHeaders });
    }

    return NextResponse.json({ shootCount: count ?? 0 }, { headers: noStoreHeaders });
  } catch (error) {
    console.error("desktop tomorrow summary failed", error);
    return NextResponse.json({ error: "Unable to load summary" }, { status: 500, headers: noStoreHeaders });
  }
}
