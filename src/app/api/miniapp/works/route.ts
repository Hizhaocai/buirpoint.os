import type { NextRequest } from "next/server";
import { parseMiniappWorksQuery } from "@/lib/miniapp/contract";
import { getMiniappWorks } from "@/lib/miniapp/portfolio-public-queries";
import { logMiniappApiError, miniappError, miniappSuccess } from "@/lib/miniapp/responses";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const parsed = parseMiniappWorksQuery(request.nextUrl.searchParams);
  if (!parsed.success) return miniappError("INVALID_QUERY", "查询参数无效。", 400);
  try {
    return miniappSuccess(await getMiniappWorks(parsed.data));
  } catch (error) {
    logMiniappApiError("works", error);
    return miniappError("INTERNAL_ERROR", "服务暂时不可用，请稍后重试。", 500);
  }
}
