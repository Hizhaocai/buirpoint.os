import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

function redirectToLogin(reason?: "configuration") {
  const location = reason ? `/login?reason=${reason}` : "/login";
  return new NextResponse(null, { status: 303, headers: { Location: location } });
}

export async function POST() {
  if (!isSupabaseConfigured()) {
    return redirectToLogin("configuration");
  }

  const supabase = await createClient();
  await supabase.auth.signOut();
  return redirectToLogin();
}
