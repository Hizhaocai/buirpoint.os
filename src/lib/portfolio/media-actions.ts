"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/permissions";
import { portfolioWorkIdSchema } from "@/lib/portfolio/schema";
import { createClient } from "@/lib/supabase/server";

const bucket = "portfolio-media";
const coverMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const videoMimeTypes = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const coverMaxBytes = 5 * 1024 * 1024;
const videoMaxBytes = 200 * 1024 * 1024;

export type PortfolioMediaKind = "cover" | "video";
export type PortfolioMediaActionState = { error?: string; success?: string };

const mediaConfig = {
  cover: {
    field: "cover_url",
    folder: "covers",
    label: "封面",
    maxBytes: coverMaxBytes,
    mimeTypes: coverMimeTypes,
  },
  video: {
    field: "video_url",
    folder: "videos",
    label: "视频",
    maxBytes: videoMaxBytes,
    mimeTypes: videoMimeTypes,
  },
} as const;

const extensionByMimeType: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

function fileSizeLabel(bytes: number) {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

function objectPathFromPublicUrl(url: string, workId: string, kind: PortfolioMediaKind) {
  try {
    const pathname = new URL(url).pathname;
    const marker = `/storage/v1/object/public/${bucket}/`;
    const markerIndex = pathname.indexOf(marker);
    if (markerIndex < 0) return null;
    const objectPath = decodeURIComponent(pathname.slice(markerIndex + marker.length));
    const expectedPrefix = `${mediaConfig[kind].folder}/${workId}/`;
    return objectPath.startsWith(expectedPrefix) && !objectPath.includes("..") ? objectPath : null;
  } catch {
    return null;
  }
}

function revalidatePortfolio(workId: string) {
  revalidatePath("/portfolio");
  revalidatePath(`/portfolio/${workId}/edit`);
}

export async function uploadPortfolioMedia(
  workId: string,
  kind: PortfolioMediaKind,
  _: PortfolioMediaActionState,
  formData: FormData,
): Promise<PortfolioMediaActionState> {
  const parsedId = portfolioWorkIdSchema.safeParse(workId);
  const config = mediaConfig[kind];
  if (!parsedId.success || !config) return { error: "媒体请求无效，请刷新后重试。" };

  const { user } = await requirePermission("portfolio_edit");
  const file = formData.get("media");
  if (!(file instanceof File) || file.size === 0) return { error: `请选择需要上传的${config.label}文件。` };
  if (!config.mimeTypes.has(file.type)) {
    return { error: kind === "cover" ? "封面仅支持 JPEG、PNG 或 WebP。" : "视频仅支持 MP4、WebM 或 MOV。" };
  }
  if (file.size > config.maxBytes) return { error: `${config.label}不能超过 ${fileSizeLabel(config.maxBytes)}。` };

  const supabase = await createClient();
  const { data: work, error: readError } = await supabase
    .from("portfolio_works")
    .select("id, status, cover_url, video_url")
    .eq("id", parsedId.data)
    .maybeSingle();
  if (readError || !work) return { error: "作品不存在或无权访问。" };
  if (work.status === "published") await requirePermission("portfolio_publish");
  if (work[config.field]) return { error: `请先移除当前${config.label}，再上传新的文件。` };

  const extension = extensionByMimeType[file.type];
  const objectPath = `${config.folder}/${parsedId.data}/${randomUUID()}.${extension}`;
  const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(objectPath);
  const publicUrl = publicUrlData.publicUrl;

  const { data: updated, error: updateError } = await supabase
    .from("portfolio_works")
    .update({ [config.field]: publicUrl, updated_by: user.id })
    .eq("id", parsedId.data)
    .is(config.field, null)
    .select("id")
    .maybeSingle();
  if (updateError || !updated) return { error: `${config.label}状态已发生变化，请刷新后重试。` };

  const { error: uploadError } = await supabase.storage.from(bucket).upload(objectPath, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) {
    await supabase.from("portfolio_works").update({ [config.field]: null, updated_by: user.id }).eq("id", parsedId.data).eq(config.field, publicUrl);
    return { error: `${config.label}上传失败，请稍后重试。` };
  }

  revalidatePortfolio(parsedId.data);
  return { success: `${config.label}已上传。` };
}

export async function deletePortfolioMedia(workId: string, kind: PortfolioMediaKind): Promise<PortfolioMediaActionState> {
  const parsedId = portfolioWorkIdSchema.safeParse(workId);
  const config = mediaConfig[kind];
  if (!parsedId.success || !config) return { error: "媒体请求无效，请刷新后重试。" };

  const { user } = await requirePermission("portfolio_delete");
  const supabase = await createClient();
  const { data: work, error: readError } = await supabase
    .from("portfolio_works")
    .select("id, status, cover_url, video_url")
    .eq("id", parsedId.data)
    .maybeSingle();
  if (readError || !work) return { error: "作品不存在或无权访问。" };
  if (work.status === "published") await requirePermission("portfolio_publish");

  const currentUrl = work[config.field];
  if (!currentUrl) return { success: `当前作品没有${config.label}资源。` };
  const objectPath = objectPathFromPublicUrl(currentUrl, parsedId.data, kind);
  if (!objectPath) return { error: `${config.label}地址不属于当前作品，未执行删除。` };

  const { data: updated, error: updateError } = await supabase
    .from("portfolio_works")
    .update({ [config.field]: null, updated_by: user.id })
    .eq("id", parsedId.data)
    .eq(config.field, currentUrl)
    .select("id")
    .maybeSingle();
  if (updateError || !updated) return { error: `${config.label}状态已发生变化，请刷新后重试。` };

  const { error: removeError } = await supabase.storage.from(bucket).remove([objectPath]);
  revalidatePortfolio(parsedId.data);
  if (removeError) return { error: `${config.label}引用已移除，但文件清理失败，请联系负责人。` };
  return { success: `${config.label}已移除。` };
}
