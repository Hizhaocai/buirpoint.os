import { z } from "zod";

export const portfolioFeaturedWorkIdSchema = z.string().uuid("作品标识无效");
export const portfolioFeaturedSortSchema = z.coerce.number().int("排序必须是整数").min(0, "排序不能小于 0").max(9999, "排序不能大于 9999");

export function toPortfolioFeaturedSort(formData: FormData) {
  return portfolioFeaturedSortSchema.safeParse(formData.get("sort_order"));
}
