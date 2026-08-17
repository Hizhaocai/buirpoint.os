import type { NextRequest } from "next/server";
import { hasUnexpectedQuery, miniappWorkIdSchema } from "@/lib/miniapp/contract";
import { getMiniappWorkDetail } from "@/lib/miniapp/portfolio-public-queries";
import { logMiniappApiError, miniappError, miniappSuccess } from "@/lib/miniapp/responses";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (hasUnexpectedQuery(request.nextUrl.searchParams)) {
    return miniappError("INVALID_QUERY", "该接口不接受查询参数。", 400);
  }
  const parsedId = miniappWorkIdSchema.safeParse((await params).id);
  if (!parsedId.success) return miniappError("INVALID_QUERY", "作品 ID 格式无效。", 400);
  try {
    const work = await getMiniappWorkDetail(parsedId.data);
    return work ? miniappSuccess(work) : miniappError("NOT_FOUND", "内容不存在或尚未发布。", 404);
  } catch (error) {
    logMiniappApiError("works/[id]", error);
    return miniappError("INTERNAL_ERROR", "服务暂时不可用，请稍后重试。", 500);
  }
}
