import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv, isSupabaseConfigured } from "@/lib/supabase/config";

const publicPaths = ["/login"];
const desktopApiPrefix = "/api/desktop";
const miniappApiPrefix = "/api/miniapp";

function isDesktopApiRequest(pathname: string) {
  return pathname === desktopApiPrefix || pathname.startsWith(`${desktopApiPrefix}/`);
}

function isPublicRequest(pathname: string) {
  return publicPaths.includes(pathname)
    || pathname === miniappApiPrefix
    || pathname.startsWith(`${miniappApiPrefix}/`);
}

function isMiniappApiRequest(pathname: string) {
  return pathname === miniappApiPrefix || pathname.startsWith(`${miniappApiPrefix}/`);
}

export async function updateSession(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);
  let response = NextResponse.next({ request: { headers: requestHeaders } });
  const { pathname } = request.nextUrl;
  const isPublicPath = isPublicRequest(pathname);
  const isDesktopApi = isDesktopApiRequest(pathname);

  // Public API requests do not need a user session. Skipping the Auth lookup
  // keeps this read-only path independent from the Dashboard session flow.
  if (isMiniappApiRequest(pathname)) return response;

  if (!isSupabaseConfigured()) {
    if (isDesktopApi) {
      return NextResponse.json(
        { error: "Service unavailable" },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }

    if (isPublicPath) {
      return response;
    }

    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("reason", "configuration");
    return NextResponse.redirect(url);
  }

  const { url, key } = getSupabaseEnv();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request: { headers: requestHeaders } });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user && !isPublicPath) {
    if (isDesktopApi) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    }

    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
