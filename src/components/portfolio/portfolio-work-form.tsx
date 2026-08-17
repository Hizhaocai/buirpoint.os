"use client";

import { useActionState } from "react";
import { FloppyDisk, SpinnerGap } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createPortfolioWork, updatePortfolioWork } from "@/lib/portfolio/actions";
import { portfolioWorkStatusLabels, type PortfolioWorkFormState } from "@/lib/portfolio/schema";
import type { PortfolioCategory } from "@/types/database";
import type { PortfolioWorkWithCategory } from "@/lib/portfolio/queries";

const initialState: PortfolioWorkFormState = {};
const selectClass = "h-11 w-full rounded-[10px] border border-[var(--border-strong)] bg-[var(--background)] px-3 text-sm outline-none transition-colors focus:border-[var(--primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--primary)_18%,transparent)]";

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? <p id={id} className="text-xs font-medium text-[var(--destructive)]">{message}</p> : null;
}

export function PortfolioWorkForm({ work, categories }: { work?: PortfolioWorkWithCategory; categories: PortfolioCategory[] }) {
  const action = work ? updatePortfolioWork.bind(null, work.id) : createPortfolioWork;
  const [state, formAction, isPending] = useActionState(action, initialState);
  const fieldErrors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="grid gap-7" noValidate>
      {state.error ? <div role="alert" className="rounded-xl border border-[color-mix(in_srgb,var(--destructive)_28%,var(--border))] bg-[color-mix(in_srgb,var(--destructive)_7%,var(--background))] px-4 py-3 text-sm text-[var(--destructive)]">{state.error}</div> : null}

      <section className="grid gap-6 rounded-xl border border-[var(--border)] bg-[var(--background)] p-5 sm:p-6">
        <div className="flex flex-col gap-2 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-semibold">作品信息</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">先建立可识别的作品档案；发布状态在作品列表单独管理。</p>
          </div>
          {work ? <span className="w-fit rounded-full bg-[var(--secondary)] px-3 py-1 text-xs font-medium text-[var(--muted-foreground)]">{portfolioWorkStatusLabels[work.status]}</span> : null}
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium" htmlFor="title">
            作品名称
            <Input id="title" name="title" required maxLength={160} defaultValue={work?.title ?? ""} aria-invalid={Boolean(fieldErrors.title)} aria-describedby={fieldErrors.title ? "title-error" : undefined} />
            <FieldError id="title-error" message={fieldErrors.title} />
          </label>
          <label className="grid gap-2 text-sm font-medium" htmlFor="slug">
            作品标识
            <Input id="slug" name="slug" required maxLength={160} defaultValue={work?.slug ?? ""} placeholder="例如 mountain-morning" autoCapitalize="none" spellCheck={false} aria-invalid={Boolean(fieldErrors.slug)} aria-describedby={fieldErrors.slug ? "slug-error" : "slug-help"} />
            <span id="slug-help" className="text-xs font-normal leading-5 text-[var(--muted-foreground)]">用于稳定识别作品，仅支持小写字母、数字和连字符。</span>
            <FieldError id="slug-error" message={fieldErrors.slug} />
          </label>
          <label className="grid gap-2 text-sm font-medium" htmlFor="category_id">
            作品分类
            <select id="category_id" name="category_id" defaultValue={work?.category_id ?? ""} className={selectClass} aria-invalid={Boolean(fieldErrors.category_id)} aria-describedby={fieldErrors.category_id ? "category_id-error" : undefined}>
              <option value="">暂不分类</option>
              {categories.map((category) => <option key={category.id} value={category.id} disabled={category.status === "inactive" && category.id !== work?.category_id}>{category.name}{category.status === "inactive" ? "（已停用）" : ""}</option>)}
            </select>
            <FieldError id="category_id-error" message={fieldErrors.category_id} />
          </label>
          <div className="grid content-start gap-2 text-sm">
            <span className="font-medium">媒体资源</span>
            <p className="leading-6 text-[var(--muted-foreground)]">{work ? "保存作品信息后，可在下方独立管理封面和视频。" : "创建草稿后，可在编辑页上传封面和视频。"}</p>
          </div>
        </div>

        <label className="grid gap-2 text-sm font-medium" htmlFor="summary">
          作品简介
          <Textarea id="summary" name="summary" maxLength={1200} defaultValue={work?.summary ?? ""} placeholder="记录作品在后台和后续展示中使用的简短介绍。" aria-invalid={Boolean(fieldErrors.summary)} aria-describedby={fieldErrors.summary ? "summary-error" : undefined} />
          <FieldError id="summary-error" message={fieldErrors.summary} />
        </label>
      </section>

      <div className="flex justify-end border-t border-[var(--border)] pt-5">
        <Button type="submit" disabled={isPending}>
          {isPending ? <SpinnerGap size={18} className="animate-spin" /> : <FloppyDisk size={18} />}
          {isPending ? "正在保存" : work ? "保存修改" : "创建草稿"}
        </Button>
      </div>
    </form>
  );
}
