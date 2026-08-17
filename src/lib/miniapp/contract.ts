import { z } from "zod";

export const MINIAPP_CONTRACT_VERSION = "portfolio-miniapp-v1";
export const MINIAPP_ABOUT_TYPES = ["story", "concept", "process", "faq"] as const;

export type MiniappCategoryDto = {
  id: string;
  slug: string;
  name: string;
};

export type MiniappFeaturedWorkDto = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  cover_url: string | null;
  video_url: string | null;
  category: MiniappCategoryDto | null;
};

export type MiniappWorkListItemDto = Omit<MiniappFeaturedWorkDto, "video_url"> & {
  published_at: string | null;
};

export type MiniappWorkDetailDto = MiniappFeaturedWorkDto & {
  published_at: string | null;
  credits: Array<{ name: string; role: string }>;
};

export type MiniappAboutItemDto = {
  type: (typeof MINIAPP_ABOUT_TYPES)[number];
  title: string;
  subtitle: string | null;
  body: string;
  image_url: string | null;
};

export type MiniappWorksPageDto = {
  categories: MiniappCategoryDto[];
  items: MiniappWorkListItemDto[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
};

export const miniappWorkIdSchema = z.string().uuid("作品 ID 必须是有效 UUID");
export const miniappWorksQuerySchema = z.object({
  category: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "分类标识格式无效").optional(),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(24).default(12),
}).strict();

export function parseMiniappWorksQuery(searchParams: URLSearchParams) {
  const raw: Record<string, string> = {};
  let hasDuplicate = false;
  for (const [key, value] of searchParams) {
    if (Object.hasOwn(raw, key)) hasDuplicate = true;
    raw[key] = value;
  }
  if (hasDuplicate) return { success: false as const };
  const parsed = miniappWorksQuerySchema.safeParse(raw);
  return parsed.success ? parsed : { success: false as const };
}

export function hasUnexpectedQuery(searchParams: URLSearchParams) {
  return searchParams.size > 0;
}
