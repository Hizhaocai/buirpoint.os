import { requirePermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import type { PortfolioWorkWithCategory } from "@/lib/portfolio/queries";

const fields = "id, category_id, title, slug, summary, cover_path, cover_url, video_url, status, featured, sort_order, published_at, created_by, updated_by, created_at, updated_at, category:portfolio_categories(id, name, slug)";

export async function getPublishedPortfolioWorksForFeatured() {
  await requirePermission("portfolio_view");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("portfolio_works")
    .select(fields)
    .eq("status", "published")
    .order("featured", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("published_at", { ascending: false })
    .returns<PortfolioWorkWithCategory[]>();
  if (error) throw new Error("无法读取已发布作品。");
  return data ?? [];
}
