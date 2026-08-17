import { z } from "zod";
import type { PortfolioAboutContentType } from "@/types/database";

export const portfolioAboutContentTypes = ["story", "concept", "process", "faq"] as const satisfies readonly PortfolioAboutContentType[];

export const portfolioAboutContentLabels: Record<PortfolioAboutContentType, string> = {
  story: "关于我们",
  concept: "拍摄理念",
  process: "服务流程",
  faq: "常见问题",
};

export const portfolioAboutContentDescriptions: Record<PortfolioAboutContentType, string> = {
  story: "工作室故事、团队背景与品牌由来。",
  concept: "关于镜头语言、人与空间的拍摄表达。",
  process: "从前期沟通到最终交付的服务说明。",
  faq: "客户在咨询与拍摄前经常确认的问题。",
};

const optionalText = (max: number, message: string) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    z.string().trim().max(max, message).nullable(),
  );

const optionalUrl = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.string().trim().url("请输入完整有效的图片 URL").max(2000, "图片 URL 最多 2000 个字符").nullable(),
);

export const portfolioAboutContentTypeSchema = z.enum(portfolioAboutContentTypes);
export const portfolioAboutContentInputSchema = z.object({
  title: z.string().trim().min(1, "请填写页面标题").max(160, "页面标题最多 160 个字符"),
  subtitle: optionalText(300, "副标题最多 300 个字符"),
  content: z.string().trim().max(20000, "正文最多 20000 个字符"),
  image_url: optionalUrl,
});

export type PortfolioAboutContentInput = z.infer<typeof portfolioAboutContentInputSchema>;
export type PortfolioAboutContentFormState = {
  error?: string;
  success?: string;
  fieldErrors?: Partial<Record<keyof PortfolioAboutContentInput, string>>;
};

export function toPortfolioAboutContentInput(formData: FormData) {
  return portfolioAboutContentInputSchema.safeParse({
    title: formData.get("title"),
    subtitle: formData.get("subtitle"),
    content: formData.get("content"),
    image_url: formData.get("image_url"),
  });
}

