"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/permissions";
import { portfolioFeaturedWorkIdSchema, toPortfolioFeaturedSort } from "@/lib/portfolio/featured-schema";
import { createClient } from "@/lib/supabase/server";

export type PortfolioFeaturedActionState = { error?: string; success?: string };

function revalidateFeatured(workId?: string) {
  revalidatePath("/portfolio");
  revalidatePath("/portfolio/featured");
  if (workId) revalidatePath(`/portfolio/${workId}/edit`);
}

export async function setPortfolioWorkFeatured(workId: string, featured: boolean): Promise<PortfolioFeaturedActionState> {
  const parsedId = portfolioFeaturedWorkIdSchema.safeParse(workId);
  if (!parsedId.success || typeof featured !== "boolean") return { error: "精选请求无效，请刷新后重试。" };
  const { user } = await requirePermission("portfolio_publish");
  const supabase = await createClient();
  const { data: work, error: readError } = await supabase.from("portfolio_works").select("id, status, featured").eq("id", parsedId.data).maybeSingle();
  if (readError || !work) return { error: "作品不存在或无权操作。" };
  if (work.status !== "published") return { error: "只有已发布作品可以设为首页精选。" };
  if (work.featured === featured) return { success: "精选状态未发生变化。" };

  const { data, error } = await supabase.from("portfolio_works").update({ featured, updated_by: user.id }).eq("id", parsedId.data).eq("status", "published").eq("featured", work.featured).select("id").maybeSingle();
  if (error || !data) return { error: "精选状态已发生变化，请刷新后重试。" };
  revalidateFeatured(parsedId.data);
  return { success: featured ? "作品已加入首页精选。" : "作品已取消精选。" };
}

export async function updatePortfolioFeaturedSort(workId: string, _: PortfolioFeaturedActionState, formData: FormData): Promise<PortfolioFeaturedActionState> {
  const parsedId = portfolioFeaturedWorkIdSchema.safeParse(workId);
  const parsedSort = toPortfolioFeaturedSort(formData);
  if (!parsedId.success) return { error: "作品标识无效，请刷新后重试。" };
  if (!parsedSort.success) return { error: parsedSort.error.issues[0]?.message ?? "排序无效。" };
  const { user } = await requirePermission("portfolio_publish");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("portfolio_works")
    .update({ sort_order: parsedSort.data, updated_by: user.id })
    .eq("id", parsedId.data)
    .eq("status", "published")
    .eq("featured", true)
    .select("id")
    .maybeSingle();
  if (error || !data) return { error: "仅精选中的已发布作品可以调整排序。" };
  revalidateFeatured(parsedId.data);
  return { success: "精选排序已保存。" };
}
