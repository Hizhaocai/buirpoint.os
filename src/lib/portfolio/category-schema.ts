import { z } from "zod";
import type { PortfolioCategoryStatus } from "@/types/database";

export const portfolioCategoryStatuses = ["active", "inactive"] as const satisfies readonly PortfolioCategoryStatus[];

export const portfolioCategoryStatusLabels: Record<PortfolioCategoryStatus, string> = {
  active: "已启用",
  inactive: "已停用",
};

export const portfolioCategoryIdSchema = z.string().uuid("分类标识无效");
export const portfolioCategoryStatusSchema = z.enum(portfolioCategoryStatuses);
export const portfolioCategoryInputSchema = z.object({
  name: z.string().trim().min(1, "请填写分类名称").max(80, "分类名称最多 80 个字符"),
  slug: z
    .string()
    .trim()
    .min(1, "请填写分类标识")
    .max(80, "分类标识最多 80 个字符")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "仅支持小写字母、数字和连字符，且不能以连字符开头或结尾"),
  sort_order: z.coerce.number().int("排序必须是整数").min(0, "排序不能小于 0").max(9999, "排序不能大于 9999"),
  status: portfolioCategoryStatusSchema,
});

export type PortfolioCategoryInput = z.infer<typeof portfolioCategoryInputSchema>;
export type PortfolioCategoryFormState = {
  error?: string;
  fieldErrors?: Partial<Record<keyof PortfolioCategoryInput, string>>;
};

export function toPortfolioCategoryInput(formData: FormData) {
  return portfolioCategoryInputSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    sort_order: formData.get("sort_order"),
    status: formData.get("status"),
  });
}
