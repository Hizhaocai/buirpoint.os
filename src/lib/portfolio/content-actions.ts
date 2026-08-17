"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/permissions";
import {
  portfolioAboutContentTypeSchema,
  toPortfolioAboutContentInput,
  type PortfolioAboutContentFormState,
} from "@/lib/portfolio/content-schema";
import { createClient } from "@/lib/supabase/server";

export type PortfolioContentStatusActionState = { error?: string; success?: string };

function revalidatePortfolioContent(contentType: string) {
  revalidatePath("/portfolio/content");
  revalidatePath(`/portfolio/content/${contentType}/edit`);
}

function validationState(issues: Record<string, string[] | undefined>): PortfolioAboutContentFormState {
  return {
    error: "请检查标记的字段。",
    fieldErrors: Object.fromEntries(Object.entries(issues).map(([key, value]) => [key, value?.[0]])),
  };
}

export async function updatePortfolioAboutContent(
  contentType: string,
  _: PortfolioAboutContentFormState,
  formData: FormData,
): Promise<PortfolioAboutContentFormState> {
  const parsedType = portfolioAboutContentTypeSchema.safeParse(contentType);
  if (!parsedType.success) return { error: "内容类型无效，请返回列表后重试。" };
  await requirePermission("portfolio_edit");
  const parsed = toPortfolioAboutContentInput(formData);
  if (!parsed.success) return validationState(parsed.error.flatten().fieldErrors);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("portfolio_content")
    .update({
      title: parsed.data.title,
      subtitle: parsed.data.subtitle,
      content: { text: parsed.data.content },
      image_url: parsed.data.image_url,
    })
    .eq("content_type", parsedType.data)
    .is("work_id", null)
    .select("id")
    .maybeSingle();
  if (error || !data) return { error: "内容未能保存，请稍后重试。" };

  revalidatePortfolioContent(parsedType.data);
  return { success: "内容已保存。" };
}

export async function setPortfolioAboutContentPublished(contentType: string, published: boolean): Promise<PortfolioContentStatusActionState> {
  const parsedType = portfolioAboutContentTypeSchema.safeParse(contentType);
  if (!parsedType.success || typeof published !== "boolean") return { error: "发布请求无效，请刷新后重试。" };
  await requirePermission("portfolio_publish");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("portfolio_content")
    .update({ published })
    .eq("content_type", parsedType.data)
    .is("work_id", null)
    .neq("published", published)
    .select("id")
    .maybeSingle();
  if (error) return { error: "发布状态未能更新，请稍后重试。" };
  if (!data) return { success: "发布状态未发生变化。" };

  revalidatePortfolioContent(parsedType.data);
  return { success: published ? "内容已发布。" : "内容已隐藏。" };
}

