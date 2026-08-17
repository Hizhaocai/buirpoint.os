import { requirePermission } from "@/lib/auth/permissions";
import { portfolioCategoryIdSchema } from "@/lib/portfolio/category-schema";
import { createClient } from "@/lib/supabase/server";
import type { PortfolioCategory } from "@/types/database";

export type PortfolioCategoryWithWorkCount = PortfolioCategory & { work_count: number };

const fields = "id, name, slug, description, sort_order, status, created_at, updated_at";

export async function getPortfolioCategoryList() {
  await requirePermission("portfolio_view");
  const supabase = await createClient();
  const [{ data: categories, error: categoryError }, { data: works, error: workError }] = await Promise.all([
    supabase.from("portfolio_categories").select(fields).order("sort_order", { ascending: true }).order("name", { ascending: true }).returns<PortfolioCategory[]>(),
    supabase.from("portfolio_works").select("category_id").not("category_id", "is", null).returns<Array<{ category_id: string | null }>>(),
  ]);
  if (categoryError || workError) throw new Error("无法读取作品分类。");

  const counts = new Map<string, number>();
  for (const work of works ?? []) {
    if (work.category_id) counts.set(work.category_id, (counts.get(work.category_id) ?? 0) + 1);
  }
  return (categories ?? []).map((category) => ({ ...category, work_count: counts.get(category.id) ?? 0 }));
}

export async function getPortfolioCategory(categoryId: string) {
  await requirePermission("portfolio_view");
  const parsedId = portfolioCategoryIdSchema.safeParse(categoryId);
  if (!parsedId.success) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.from("portfolio_categories").select(fields).eq("id", parsedId.data).maybeSingle<PortfolioCategory>();
  if (error) throw new Error("无法读取分类信息。");
  return data;
}
