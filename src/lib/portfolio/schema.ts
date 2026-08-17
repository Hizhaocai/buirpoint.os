import { z } from "zod";
import type { PortfolioWorkStatus } from "@/types/database";

export const portfolioWorkStatuses = ["draft", "published", "archived"] as const satisfies readonly PortfolioWorkStatus[];

export const portfolioWorkStatusLabels: Record<PortfolioWorkStatus, string> = {
  draft: "草稿",
  published: "已发布",
  archived: "已归档",
};

const optionalText = (max: number, message: string) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    z.string().trim().max(max, message).nullable(),
  );

const optionalCategoryId = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.string().uuid("请选择有效的作品分类").nullable(),
);

export const portfolioWorkInputSchema = z.object({
  title: z.string().trim().min(1, "请填写作品名称").max(160, "作品名称最多 160 个字符"),
  slug: z
    .string()
    .trim()
    .min(1, "请填写作品标识")
    .max(160, "作品标识最多 160 个字符")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "仅支持小写字母、数字和连字符，且不能以连字符开头或结尾"),
  category_id: optionalCategoryId,
  summary: optionalText(1200, "作品简介最多 1200 个字符"),
});

export const portfolioWorkIdSchema = z.string().uuid("作品标识无效");
export const portfolioStatusSchema = z.enum(portfolioWorkStatuses);

export type PortfolioWorkInput = z.infer<typeof portfolioWorkInputSchema>;
export type PortfolioWorkFormState = {
  error?: string;
  fieldErrors?: Partial<Record<keyof PortfolioWorkInput, string>>;
};

export function toPortfolioWorkInput(formData: FormData) {
  return portfolioWorkInputSchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    category_id: formData.get("category_id"),
    summary: formData.get("summary"),
  });
}
