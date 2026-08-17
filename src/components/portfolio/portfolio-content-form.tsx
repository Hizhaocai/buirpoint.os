"use client";

import { useActionState } from "react";
import { FloppyDisk, SpinnerGap } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updatePortfolioAboutContent } from "@/lib/portfolio/content-actions";
import type { PortfolioAboutContentFormState } from "@/lib/portfolio/content-schema";
import type { PortfolioAboutContent } from "@/types/database";

const initialState: PortfolioAboutContentFormState = {};

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? <p id={id} className="text-xs font-medium text-[var(--destructive)]">{message}</p> : null;
}

export function PortfolioContentForm({ item }: { item: PortfolioAboutContent }) {
  const [state, formAction, isPending] = useActionState(updatePortfolioAboutContent.bind(null, item.content_type), initialState);
  const fieldErrors = state.fieldErrors ?? {};
  const text = typeof item.content.text === "string" ? item.content.text : "";

  return (
    <form action={formAction} className="grid gap-7" noValidate>
      {state.error ? <div role="alert" className="rounded-xl border border-[color-mix(in_srgb,var(--destructive)_28%,var(--border))] bg-[color-mix(in_srgb,var(--destructive)_7%,var(--background))] px-4 py-3 text-sm text-[var(--destructive)]">{state.error}</div> : null}
      {state.success ? <div role="status" className="rounded-xl border border-[var(--border)] bg-[var(--secondary)] px-4 py-3 text-sm text-[var(--secondary-foreground)]">{state.success}</div> : null}

      <section className="grid gap-6 rounded-xl border border-[var(--border)] bg-[var(--background)] p-5 sm:p-6">
        <div className="flex flex-col gap-2 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-semibold">页面内容</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">第一阶段仅保存纯文本；换行会在展示端按段落保留。</p>
          </div>
          <span className={`w-fit rounded-full px-3 py-1 text-xs font-medium ${item.published ? "bg-[color-mix(in_srgb,var(--primary)_11%,var(--background))] text-[var(--primary)]" : "bg-[var(--muted)] text-[var(--muted-foreground)]"}`}>{item.published ? "已发布" : "已隐藏"}</span>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium" htmlFor="title">
            页面标题
            <Input id="title" name="title" required maxLength={160} defaultValue={item.title} aria-invalid={Boolean(fieldErrors.title)} aria-describedby={fieldErrors.title ? "title-error" : undefined} />
            <FieldError id="title-error" message={fieldErrors.title} />
          </label>
          <label className="grid gap-2 text-sm font-medium" htmlFor="subtitle">
            副标题
            <Input id="subtitle" name="subtitle" maxLength={300} defaultValue={item.subtitle ?? ""} placeholder="可暂时留空" aria-invalid={Boolean(fieldErrors.subtitle)} aria-describedby={fieldErrors.subtitle ? "subtitle-error" : undefined} />
            <FieldError id="subtitle-error" message={fieldErrors.subtitle} />
          </label>
        </div>

        <label className="grid gap-2 text-sm font-medium" htmlFor="content">
          正文
          <Textarea id="content" name="content" maxLength={20000} rows={14} defaultValue={text} placeholder="输入页面正文，不支持富文本格式。" aria-invalid={Boolean(fieldErrors.content)} aria-describedby={fieldErrors.content ? "content-error" : "content-help"} />
          <span id="content-help" className="text-xs font-normal leading-5 text-[var(--muted-foreground)]">支持普通文字与换行，不解析 HTML、Markdown 或嵌入代码。</span>
          <FieldError id="content-error" message={fieldErrors.content} />
        </label>

        <label className="grid gap-2 text-sm font-medium" htmlFor="image_url">
          图片 URL
          <Input id="image_url" name="image_url" type="url" maxLength={2000} defaultValue={item.image_url ?? ""} placeholder="https://…" aria-invalid={Boolean(fieldErrors.image_url)} aria-describedby={fieldErrors.image_url ? "image-url-error" : "image-url-help"} />
          <span id="image-url-help" className="text-xs font-normal leading-5 text-[var(--muted-foreground)]">填写完整图片地址；本阶段不在此页面提供图片上传。</span>
          <FieldError id="image-url-error" message={fieldErrors.image_url} />
        </label>
      </section>

      <div className="flex justify-end border-t border-[var(--border)] pt-5">
        <Button type="submit" disabled={isPending}>
          {isPending ? <SpinnerGap className="animate-spin" size={18} /> : <FloppyDisk size={18} />}
          {isPending ? "正在保存" : "保存内容"}
        </Button>
      </div>
    </form>
  );
}

