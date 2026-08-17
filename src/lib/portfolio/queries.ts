import { requirePermission } from "@/lib/auth/permissions";
import { portfolioWorkIdSchema } from "@/lib/portfolio/schema";
import { createClient } from "@/lib/supabase/server";
import type { PortfolioCategory, PortfolioWork, PortfolioWorkStatus } from "@/types/database";

export type PortfolioWorkWithCategory = PortfolioWork & {
  category: Pick<PortfolioCategory, "id" | "name" | "slug"> | null;
};

export type PortfolioWorkFilters = {
  query?: string;
  status?: PortfolioWorkStatus | "all";
};

const workFields = "id, category_id, title, slug, summary, cover_path, cover_url, video_url, status, featured, sort_order, published_at, created_by, updated_by, created_at, updated_at, category:portfolio_categories(id, name, slug)";

export async function getPortfolioWorks(filters: PortfolioWorkFilters = {}) {
  await requirePermission("portfolio_view");
  const supabase = await createClient();
  let query = supabase
    .from("portfolio_works")
    .select(workFields)
    .order("updated_at", { ascending: false });

  const normalizedQuery = filters.query?.trim();
  if (normalizedQuery) {
    const escaped = normalizedQuery.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
    query = query.or(`title.ilike."%${escaped}%",slug.ilike."%${escaped}%",summary.ilike."%${escaped}%"`);
  }
  if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);

  const { data, error } = await query.returns<PortfolioWorkWithCategory[]>();
  if (error) throw new Error("无法读取作品列表。");
  return data ?? [];
}

export async function getPortfolioWork(workId: string) {
  await requirePermission("portfolio_view");
  const parsedId = portfolioWorkIdSchema.safeParse(workId);
  if (!parsedId.success) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("portfolio_works")
    .select(workFields)
    .eq("id", parsedId.data)
    .maybeSingle<PortfolioWorkWithCategory>();
  if (error) throw new Error("无法读取作品信息。");
  return data;
}

export async function getPortfolioCategories(options: { includeInactive?: boolean } = {}) {
  await requirePermission("portfolio_view");
  const supabase = await createClient();
  let query = supabase
    .from("portfolio_categories")
    .select("id, name, slug, description, sort_order, status, created_at, updated_at")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (!options.includeInactive) query = query.eq("status", "active");
  const { data, error } = await query.returns<PortfolioCategory[]>();
  if (error) throw new Error("无法读取作品分类。");
  return data ?? [];
}
