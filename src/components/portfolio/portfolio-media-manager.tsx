"use client";
/* eslint-disable @next/next/no-img-element -- Supabase public media URLs are generated at runtime. */

import { useActionState, useState, useTransition } from "react";
import { FilmStrip, ImageSquare, SpinnerGap, Trash, UploadSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  deletePortfolioMedia,
  uploadPortfolioMedia,
  type PortfolioMediaActionState,
  type PortfolioMediaKind,
} from "@/lib/portfolio/media-actions";

const initialState: PortfolioMediaActionState = {};

function MediaUploadForm({ workId, kind }: { workId: string; kind: PortfolioMediaKind }) {
  const [state, formAction, isUploading] = useActionState(uploadPortfolioMedia.bind(null, workId, kind), initialState);
  const isCover = kind === "cover";

  return (
    <form action={formAction} className="grid gap-2">
      <input
        name="media"
        type="file"
        required
        accept={isCover ? "image/jpeg,image/png,image/webp" : "video/mp4,video/webm,video/quicktime"}
        className="block min-w-0 text-sm text-[var(--muted-foreground)] file:mr-3 file:rounded-md file:border-0 file:bg-[var(--secondary)] file:px-3 file:py-2 file:text-sm file:font-medium file:text-[var(--foreground)] hover:file:bg-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
      />
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs leading-5 text-[var(--muted-foreground)]">
          {isCover ? "JPEG、PNG、WebP · 最大 5 MB" : "MP4、WebM、MOV · 最大 200 MB"}
        </p>
        <Button type="submit" size="sm" disabled={isUploading}>
          {isUploading ? <SpinnerGap className="animate-spin" size={16} /> : <UploadSimple size={16} />}
          {isUploading ? "正在上传" : `上传${isCover ? "封面" : "视频"}`}
        </Button>
      </div>
      {state.error ? <p role="alert" className="text-sm text-[var(--destructive)]">{state.error}</p> : null}
      {state.success ? <p role="status" className="text-sm text-[var(--muted-foreground)]">{state.success}</p> : null}
    </form>
  );
}

function MediaItem({ workId, kind, url, canDelete }: { workId: string; kind: PortfolioMediaKind; url: string; canDelete: boolean }) {
  const [message, setMessage] = useState<string | null>(null);
  const [isDeleting, startTransition] = useTransition();
  const isCover = kind === "cover";
  const label = isCover ? "封面" : "视频";

  function remove() {
    if (!window.confirm(`确认移除当前${label}吗？Storage 中的文件也会被永久删除。`)) return;
    setMessage(null);
    startTransition(async () => {
      const result = await deletePortfolioMedia(workId, kind);
      setMessage(result.error ?? result.success ?? null);
    });
  }

  return (
    <div className="grid gap-4 sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] sm:items-center">
      <div className="aspect-video overflow-hidden rounded-xl bg-[var(--secondary)]">
        {isCover ? (
          <img src={url} alt="当前作品封面" className="size-full object-cover" />
        ) : (
          <video src={url} controls preload="metadata" playsInline className="size-full bg-black object-contain">当前浏览器不支持视频预览。</video>
        )}
      </div>
      <div className="min-w-0">
        <p className="font-medium">当前{label}</p>
        <p className="mt-1 break-all text-xs leading-5 text-[var(--muted-foreground)]">{url}</p>
        {canDelete ? (
          <Button type="button" size="sm" variant="ghost" className="mt-3 text-[var(--destructive)] hover:text-[var(--destructive)]" disabled={isDeleting} onClick={remove}>
            {isDeleting ? <SpinnerGap className="animate-spin" size={16} /> : <Trash size={16} />}
            {isDeleting ? "正在移除" : `移除${label}`}
          </Button>
        ) : <p className="mt-3 text-xs text-[var(--muted-foreground)]">需要作品删除权限才能移除此资源。</p>}
        {message ? <p role="status" className="mt-2 text-sm text-[var(--muted-foreground)]">{message}</p> : null}
      </div>
    </div>
  );
}

function EmptyMedia({ kind }: { kind: PortfolioMediaKind }) {
  const isCover = kind === "cover";
  const Icon = isCover ? ImageSquare : FilmStrip;
  return (
    <div className="grid aspect-video max-w-60 place-items-center rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--canvas)] text-center">
      <div>
        <Icon aria-hidden size={28} weight="light" className="mx-auto text-[var(--primary)]" />
        <p className="mt-2 text-sm font-medium">尚未上传{isCover ? "封面" : "视频"}</p>
      </div>
    </div>
  );
}

export function PortfolioMediaManager({ workId, coverUrl, videoUrl, canDelete }: { workId: string; coverUrl: string | null; videoUrl: string | null; canDelete: boolean }) {
  const items = [
    { kind: "cover" as const, title: "作品封面", description: "用于作品列表与详情展示，建议使用 16:9 横向画面。", url: coverUrl },
    { kind: "video" as const, title: "作品视频", description: "用于确认上传文件与播放效果；视频不会自动播放。", url: videoUrl },
  ];

  return (
    <section aria-labelledby="portfolio-media-heading" className="mt-10 border-y border-[var(--border)]">
      <div className="py-6">
        <h2 id="portfolio-media-heading" className="text-lg font-semibold tracking-tight">作品媒体</h2>
        <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">封面与视频独立保存在 Portfolio Storage，不会进入订单附件。</p>
      </div>
      <div className="divide-y divide-[var(--border)] border-t border-[var(--border)]">
        {items.map((item) => (
          <article key={item.kind} className="grid gap-5 py-7 lg:grid-cols-[12rem_minmax(0,1fr)]">
            <div>
              <h3 className="font-medium">{item.title}</h3>
              <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">{item.description}</p>
            </div>
            {item.url ? <MediaItem workId={workId} kind={item.kind} url={item.url} canDelete={canDelete} /> : (
              <div className="grid gap-5 sm:grid-cols-[15rem_minmax(0,1fr)] sm:items-center">
                <EmptyMedia kind={item.kind} />
                <MediaUploadForm workId={workId} kind={item.kind} />
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
