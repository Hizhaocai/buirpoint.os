import { requirePermission } from "@/lib/auth/permissions";
import { portfolioAboutContentTypeSchema, portfolioAboutContentTypes } from "@/lib/portfolio/content-schema";
import { createClient } from "@/lib/supabase/server";
import type { PortfolioAboutContent, PortfolioAboutContentType } from "@/types/database";

const fields = "id, work_id, content_type, title, subtitle, content, image_url, published, sort_order, created_at, updated_at";

function normalizedContent(row: PortfolioAboutContent): PortfolioAboutContent {
  return {
    ...row,
    content: { text: typeof row.content?.text === "string" ? row.content.text : "" },
  };
}

export async function getPortfolioAboutContents() {
  await requirePermission("portfolio_view");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("portfolio_content")
    .select(fields)
    .in("content_type", portfolioAboutContentTypes)
    .order("sort_order", { ascending: true })
    .returns<PortfolioAboutContent[]>();
  if (error) throw new Error("无法读取 About 内容。");
  return (data ?? []).map(normalizedContent);
}

export async function getPortfolioAboutContent(contentType: string) {
  await requirePermission("portfolio_view");
  const parsedType = portfolioAboutContentTypeSchema.safeParse(contentType);
  if (!parsedType.success) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("portfolio_content")
    .select(fields)
    .eq("content_type", parsedType.data)
    .is("work_id", null)
    .maybeSingle<PortfolioAboutContent>();
  if (error) throw new Error("无法读取 About 内容。");
  return data ? normalizedContent(data) : null;
}

export function aboutContentHref(contentType: PortfolioAboutContentType) {
  return `/portfolio/content/${contentType}/edit`;
}

