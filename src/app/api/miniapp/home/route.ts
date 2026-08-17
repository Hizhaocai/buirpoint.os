import type { NextRequest } from "next/server";
import { hasUnexpectedQuery } from "@/lib/miniapp/contract";
import { getMiniappHome } from "@/lib/miniapp/portfolio-public-queries";
import { logMiniappApiError, miniappError, miniappSuccess } from "@/lib/miniapp/responses";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (hasUnexpectedQuery(request.nextUrl.searchParams)) {
    return miniappError("INVALID_QUERY", "该接口不接受查询参数。", 400);
  }
  try {
    return miniappSuccess(await getMiniappHome());
  } catch (error) {
    logMiniappApiError("home", error);
    return miniappError("INTERNAL_ERROR", "服务暂时不可用，请稍后重试。", 500);
  }
}
