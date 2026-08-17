import "server-only";

import {
  MINIAPP_ABOUT_TYPES,
  type MiniappAboutItemDto,
  type MiniappCategoryDto,
  type MiniappFeaturedWorkDto,
  type MiniappWorkDetailDto,
  type MiniappWorkListItemDto,
  type MiniappWorksPageDto,
} from "@/lib/miniapp/contract";
import { createMiniappPublicClient } from "@/lib/miniapp/supabase";

type RawCategory = { id: string; slug: string; name: string; status: string };
type RawWork = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  cover_url: string | null;
  video_url: string | null;
  published_at: string | null;
  category: RawCategory | RawCategory[] | null;
};
type RawWorkDetail = RawWork & {
  credits: Array<{ display_name: string; credit_role: string; sort_order: number }>;
};

const categoryFields = "id, slug, name, status";
const workFields = `id, slug, title, summary, cover_url, video_url, published_at, category:portfolio_categories(${categoryFields})`;

function firstRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function publicCategory(value: RawWork["category"]): MiniappCategoryDto | null {
  const category = firstRelation(value);
  return category?.status === "active" ? { id: category.id, slug: category.slug, name: category.name } : null;
}

function featuredWorkDto(work: RawWork): MiniappFeaturedWorkDto {
  return {
    id: work.id,
    slug: work.slug,
    title: work.title,
    summary: work.summary,
    cover_url: work.cover_url,
    video_url: work.video_url,
    category: publicCategory(work.category),
  };
}

function workListDto(work: RawWork): MiniappWorkListItemDto {
  return {
    id: work.id,
    slug: work.slug,
    title: work.title,
    summary: work.summary,
    cover_url: work.cover_url,
    category: publicCategory(work.category),
    published_at: work.published_at,
  };
}

async function getPublicCategories(): Promise<MiniappCategoryDto[]> {
  const supabase = createMiniappPublicClient();
  const [{ data: categories, error: categoryError }, { data: workCategories, error: workError }] = await Promise.all([
    supabase
      .from("portfolio_categories")
      .select("id, slug, name, sort_order")
      .eq("status", "active")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true })
      .returns<Array<MiniappCategoryDto & { sort_order: number }>>(),
    supabase
      .from("portfolio_works")
      .select("category_id")
      .eq("status", "published")
      .not("category_id", "is", null)
      .returns<Array<{ category_id: string | null }>>(),
  ]);
  if (categoryError || workError) throw new Error("Public category query failed.");

  const usedCategoryIds = new Set((workCategories ?? []).flatMap((work) => work.category_id ? [work.category_id] : []));
  return (categories ?? [])
    .filter((category) => usedCategoryIds.has(category.id))
    .map(({ id, slug, name }) => ({ id, slug, name }));
}

export async function getMiniappHome() {
  const supabase = createMiniappPublicClient();
  const { data, error } = await supabase
    .from("portfolio_works")
    .select(workFields)
    .eq("status", "published")
    .eq("featured", true)
    .order("sort_order", { ascending: true })
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("id", { ascending: true })
    .limit(3)
    .returns<RawWork[]>();
  if (error) throw new Error("Public home query failed.");
  return { featured_works: (data ?? []).map(featuredWorkDto) };
}

export async function getMiniappWorks(input: { category?: string; page: number; page_size: number }): Promise<MiniappWorksPageDto> {
  const supabase = createMiniappPublicClient();
  const categories = await getPublicCategories();
  const selectedCategory = input.category ? categories.find((category) => category.slug === input.category) : undefined;
  if (input.category && !selectedCategory) {
    return { categories, items: [], pagination: { page: input.page, page_size: input.page_size, total: 0, total_pages: 0 } };
  }

  const from = (input.page - 1) * input.page_size;
  const to = from + input.page_size - 1;
  let query = supabase
    .from("portfolio_works")
    .select(workFields, { count: "exact" })
    .eq("status", "published")
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("id", { ascending: true })
    .range(from, to);
  if (selectedCategory) query = query.eq("category_id", selectedCategory.id);

  const { data, error, count } = await query.returns<RawWork[]>();
  if (error) throw new Error("Public works query failed.");
  const total = count ?? 0;
  return {
    categories,
    items: (data ?? []).map(workListDto),
    pagination: {
      page: input.page,
      page_size: input.page_size,
      total,
      total_pages: Math.ceil(total / input.page_size),
    },
  };
}

export async function getMiniappWorkDetail(workId: string): Promise<MiniappWorkDetailDto | null> {
  const supabase = createMiniappPublicClient();
  const { data, error } = await supabase
    .from("portfolio_works")
    .select(`${workFields}, credits:portfolio_credits(display_name, credit_role, sort_order)`)
    .eq("id", workId)
    .eq("status", "published")
    .maybeSingle<RawWorkDetail>();
  if (error) throw new Error("Public work detail query failed.");
  if (!data) return null;

  return {
    ...featuredWorkDto(data),
    published_at: data.published_at,
    credits: [...(data.credits ?? [])]
      .sort((left, right) => left.sort_order - right.sort_order)
      .map((credit) => ({ name: credit.display_name, role: credit.credit_role })),
  };
}

export async function getMiniappAbout() {
  const supabase = createMiniappPublicClient();
  const { data, error } = await supabase
    .from("portfolio_content")
    .select("content_type, title, subtitle, content, image_url, sort_order")
    .is("work_id", null)
    .eq("published", true)
    .in("content_type", MINIAPP_ABOUT_TYPES)
    .order("sort_order", { ascending: true })
    .returns<Array<{ content_type: string; title: string | null; subtitle: string | null; content: Record<string, unknown>; image_url: string | null; sort_order: number }>>();
  if (error) throw new Error("Public About query failed.");

  const allowedTypes = new Set<string>(MINIAPP_ABOUT_TYPES);
  const items: MiniappAboutItemDto[] = (data ?? []).flatMap((item) => {
    if (!allowedTypes.has(item.content_type) || !item.title) return [];
    return [{
      type: item.content_type as MiniappAboutItemDto["type"],
      title: item.title,
      subtitle: item.subtitle,
      body: typeof item.content?.text === "string" ? item.content.text : "",
      image_url: item.image_url,
    }];
  });
  return { items };
}
