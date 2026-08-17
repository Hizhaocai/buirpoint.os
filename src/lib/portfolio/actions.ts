"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import {
  portfolioStatusSchema,
  portfolioWorkIdSchema,
  toPortfolioWorkInput,
  type PortfolioWorkFormState,
} from "@/lib/portfolio/schema";
import { createClient } from "@/lib/supabase/server";

type PortfolioActionState = { error?: string; success?: string };

function validationState(issues: Record<string, string[] | undefined>): PortfolioWorkFormState {
  return {
    error: "请检查标记的字段。",
    fieldErrors: Object.fromEntries(
      Object.entries(issues).map(([key, value]) => [key, value?.[0]]),
    ),
  };
}

function databaseErrorMessage(code?: string) {
  return code === "23505" ? "作品标识已被使用，请更换后重试。" : "作品未能保存，请稍后重试。";
}

function revalidatePortfolio(workId?: string) {
  revalidatePath("/portfolio");
  if (workId) revalidatePath(`/portfolio/${workId}/edit`);
}

export async function createPortfolioWork(_: PortfolioWorkFormState, formData: FormData): Promise<PortfolioWorkFormState> {
  const { user } = await requirePermission("portfolio_create");
  const parsed = toPortfolioWorkInput(formData);
  if (!parsed.success) return validationState(parsed.error.flatten().fieldErrors);

  const supabase = await createClient();
  if (parsed.data.category_id) {
    const { data: category } = await supabase.from("portfolio_categories").select("id").eq("id", parsed.data.category_id).eq("status", "active").maybeSingle();
    if (!category) return { error: "请选择已启用的作品分类。", fieldErrors: { category_id: "该分类已停用或不存在" } };
  }
  const { data, error } = await supabase
    .from("portfolio_works")
    .insert({ ...parsed.data, status: "draft", created_by: user.id, updated_by: user.id })
    .select("id")
    .single();
  if (error || !data) return { error: databaseErrorMessage(error?.code) };

  revalidatePortfolio(data.id);
  redirect(`/portfolio/${data.id}/edit`);
}

export async function updatePortfolioWork(workId: string, _: PortfolioWorkFormState, formData: FormData): Promise<PortfolioWorkFormState> {
  const parsedId = portfolioWorkIdSchema.safeParse(workId);
  if (!parsedId.success) return { error: "作品标识无效，请返回列表后重试。" };
  const { user } = await requirePermission("portfolio_edit");
  const parsed = toPortfolioWorkInput(formData);
  if (!parsed.success) return validationState(parsed.error.flatten().fieldErrors);

  const supabase = await createClient();
  const { data: current, error: readError } = await supabase
    .from("portfolio_works")
    .select("id, status, category_id")
    .eq("id", parsedId.data)
    .maybeSingle();
  if (readError || !current) return { error: "作品不存在或无权访问。" };
  if (current.status === "published") await requirePermission("portfolio_publish");
  if (parsed.data.category_id && parsed.data.category_id !== current.category_id) {
    const { data: category } = await supabase.from("portfolio_categories").select("id").eq("id", parsed.data.category_id).eq("status", "active").maybeSingle();
    if (!category) return { error: "请选择已启用的作品分类。", fieldErrors: { category_id: "该分类已停用或不存在" } };
  }

  const { data, error } = await supabase
    .from("portfolio_works")
    .update({ ...parsed.data, updated_by: user.id })
    .eq("id", parsedId.data)
    .select("id")
    .maybeSingle();
  if (error || !data) return { error: databaseErrorMessage(error?.code) };

  revalidatePortfolio(parsedId.data);
  redirect("/portfolio");
}

export async function setPortfolioWorkStatus(workId: string, nextStatus: string): Promise<PortfolioActionState> {
  const parsedId = portfolioWorkIdSchema.safeParse(workId);
  const parsedStatus = portfolioStatusSchema.safeParse(nextStatus);
  if (!parsedId.success || !parsedStatus.success) return { error: "作品状态请求无效，请刷新后重试。" };
  const { user } = await requirePermission("portfolio_publish");
  const supabase = await createClient();
  const { data: current, error: readError } = await supabase
    .from("portfolio_works")
    .select("id, status, published_at, featured")
    .eq("id", parsedId.data)
    .maybeSingle();
  if (readError || !current) return { error: "作品不存在或无权操作。" };
  if (current.status === parsedStatus.data) return { success: "作品状态未发生变化。" };

  const publishedAt = parsedStatus.data === "published"
    ? current.published_at ?? new Date().toISOString()
    : null;
  const { data, error } = await supabase
    .from("portfolio_works")
    .update({ status: parsedStatus.data, published_at: publishedAt, featured: parsedStatus.data === "published" ? current.featured : false, updated_by: user.id })
    .eq("id", parsedId.data)
    .eq("status", current.status)
    .select("id")
    .maybeSingle();
  if (error || !data) return { error: "作品状态已发生变化，请刷新后重试。" };

  revalidatePortfolio(parsedId.data);
  return { success: parsedStatus.data === "published" ? "作品已发布。" : parsedStatus.data === "archived" ? "作品已归档。" : "作品已转为草稿。" };
}

export async function deletePortfolioWork(workId: string): Promise<PortfolioActionState> {
  const parsedId = portfolioWorkIdSchema.safeParse(workId);
  if (!parsedId.success) return { error: "作品标识无效，请刷新后重试。" };
  await requirePermission("portfolio_delete");
  const supabase = await createClient();
  const { data: current, error: readError } = await supabase
    .from("portfolio_works")
    .select("id, cover_url, video_url")
    .eq("id", parsedId.data)
    .maybeSingle();
  if (readError || !current) return { error: "作品不存在、无权删除或已被移除。" };
  if (current.cover_url || current.video_url) return { error: "请先在编辑页移除作品封面和视频，再删除作品。" };

  const { data, error } = await supabase
    .from("portfolio_works")
    .delete()
    .eq("id", parsedId.data)
    .select("id")
    .maybeSingle();
  if (error || !data) return { error: "作品不存在、无权删除或已被移除。" };

  revalidatePortfolio();
  return { success: "作品已删除。" };
}
