"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import {
  portfolioCategoryIdSchema,
  portfolioCategoryStatusSchema,
  toPortfolioCategoryInput,
  type PortfolioCategoryFormState,
} from "@/lib/portfolio/category-schema";
import { createClient } from "@/lib/supabase/server";

export type PortfolioCategoryActionState = { error?: string; success?: string };

function validationState(issues: Record<string, string[] | undefined>): PortfolioCategoryFormState {
  return {
    error: "请检查标记的字段。",
    fieldErrors: Object.fromEntries(Object.entries(issues).map(([key, value]) => [key, value?.[0]])),
  };
}

function categoryError(code?: string) {
  return code === "23505" ? "分类标识已被使用，请更换后重试。" : "分类未能保存，请稍后重试。";
}

function revalidateCategories(categoryId?: string) {
  revalidatePath("/portfolio");
  revalidatePath("/portfolio/categories");
  revalidatePath("/portfolio/new");
  if (categoryId) {
    revalidatePath(`/portfolio/categories/${categoryId}/edit`);
  }
}

export async function createPortfolioCategory(_: PortfolioCategoryFormState, formData: FormData): Promise<PortfolioCategoryFormState> {
  await requirePermission("portfolio_edit");
  const parsed = toPortfolioCategoryInput(formData);
  if (!parsed.success) return validationState(parsed.error.flatten().fieldErrors);

  const supabase = await createClient();
  const { error } = await supabase.from("portfolio_categories").insert(parsed.data);
  if (error) return { error: categoryError(error.code) };
  revalidateCategories();
  redirect("/portfolio/categories");
}

export async function updatePortfolioCategory(categoryId: string, _: PortfolioCategoryFormState, formData: FormData): Promise<PortfolioCategoryFormState> {
  const parsedId = portfolioCategoryIdSchema.safeParse(categoryId);
  if (!parsedId.success) return { error: "分类标识无效，请返回列表后重试。" };
  await requirePermission("portfolio_edit");
  const parsed = toPortfolioCategoryInput(formData);
  if (!parsed.success) return validationState(parsed.error.flatten().fieldErrors);

  const supabase = await createClient();
  const { data, error } = await supabase.from("portfolio_categories").update(parsed.data).eq("id", parsedId.data).select("id").maybeSingle();
  if (error || !data) return { error: categoryError(error?.code) };
  revalidateCategories(parsedId.data);
  redirect("/portfolio/categories");
}

export async function setPortfolioCategoryStatus(categoryId: string, status: string): Promise<PortfolioCategoryActionState> {
  const parsedId = portfolioCategoryIdSchema.safeParse(categoryId);
  const parsedStatus = portfolioCategoryStatusSchema.safeParse(status);
  if (!parsedId.success || !parsedStatus.success) return { error: "分类状态请求无效，请刷新后重试。" };
  await requirePermission("portfolio_edit");

  const supabase = await createClient();
  const { data, error } = await supabase.from("portfolio_categories").update({ status: parsedStatus.data }).eq("id", parsedId.data).neq("status", parsedStatus.data).select("id").maybeSingle();
  if (error) return { error: "分类状态未能更新，请稍后重试。" };
  if (!data) return { success: "分类状态未发生变化。" };
  revalidateCategories(parsedId.data);
  return { success: parsedStatus.data === "active" ? "分类已启用。" : "分类已停用。" };
}

export async function deletePortfolioCategory(categoryId: string): Promise<PortfolioCategoryActionState> {
  const parsedId = portfolioCategoryIdSchema.safeParse(categoryId);
  if (!parsedId.success) return { error: "分类标识无效，请刷新后重试。" };
  await requirePermission("portfolio_delete");
  const supabase = await createClient();
  const { count, error: countError } = await supabase.from("portfolio_works").select("id", { count: "exact", head: true }).eq("category_id", parsedId.data);
  if (countError) return { error: "无法确认分类关联作品，请稍后重试。" };
  if ((count ?? 0) > 0) return { error: `该分类仍关联 ${count} 个作品，不能删除。` };

  const { data, error } = await supabase.from("portfolio_categories").delete().eq("id", parsedId.data).select("id").maybeSingle();
  if (error?.code === "23503") return { error: "该分类仍有关联作品，不能删除。" };
  if (error || !data) return { error: "分类不存在、无权删除或已被移除。" };
  revalidateCategories();
  return { success: "分类已删除。" };
}
