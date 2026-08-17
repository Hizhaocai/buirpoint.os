"use client";

import { useActionState } from "react";
import { FloppyDisk, SpinnerGap } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createPortfolioCategory, updatePortfolioCategory } from "@/lib/portfolio/category-actions";
import { portfolioCategoryStatuses, portfolioCategoryStatusLabels, type PortfolioCategoryFormState } from "@/lib/portfolio/category-schema";
import type { PortfolioCategory } from "@/types/database";

const initialState: PortfolioCategoryFormState = {};
const selectClass = "h-11 w-full rounded-[10px] border border-[var(--border-strong)] bg-[var(--background)] px-3 text-sm outline-none transition-colors focus:border-[var(--primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--primary)_18%,transparent)]";

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? <p id={id} className="text-xs font-medium text-[var(--destructive)]">{message}</p> : null;
}

export function PortfolioCategoryForm({ category }: { category?: PortfolioCategory }) {
  const action = category ? updatePortfolioCategory.bind(null, category.id) : createPortfolioCategory;
  const [state, formAction, isPending] = useActionState(action, initialState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="grid gap-7" noValidate>
      {state.error ? <div role="alert" className="rounded-xl border border-[color-mix(in_srgb,var(--destructive)_28%,var(--border))] bg-[color-mix(in_srgb,var(--destructive)_7%,var(--background))] px-4 py-3 text-sm text-[var(--destructive)]">{state.error}</div> : null}
      <section className="grid gap-6 rounded-xl border border-[var(--border)] bg-[var(--background)] p-5 sm:p-6">
        <div className="border-b border-[var(--border)] pb-5">
          <h2 className="font-semibold">分类信息</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">停用后保留已有作品关联，但不再提供给新作品选择。</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium" htmlFor="name">分类名称<Input id="name" name="name" required maxLength={80} defaultValue={category?.name ?? ""} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "name-error" : undefined} /><FieldError id="name-error" message={errors.name} /></label>
          <label className="grid gap-2 text-sm font-medium" htmlFor="slug">分类标识<Input id="slug" name="slug" required maxLength={80} defaultValue={category?.slug ?? ""} placeholder="例如 wedding-film" autoCapitalize="none" spellCheck={false} aria-invalid={Boolean(errors.slug)} aria-describedby={errors.slug ? "slug-error" : "slug-help"} /><span id="slug-help" className="text-xs font-normal leading-5 text-[var(--muted-foreground)]">仅支持小写字母、数字和连字符。</span><FieldError id="slug-error" message={errors.slug} /></label>
          <label className="grid gap-2 text-sm font-medium" htmlFor="sort_order">排序<Input id="sort_order" name="sort_order" type="number" min={0} max={9999} step={1} defaultValue={category?.sort_order ?? 0} aria-invalid={Boolean(errors.sort_order)} aria-describedby={errors.sort_order ? "sort-error" : "sort-help"} /><span id="sort-help" className="text-xs font-normal leading-5 text-[var(--muted-foreground)]">数字越小，在分类选择和列表中越靠前。</span><FieldError id="sort-error" message={errors.sort_order} /></label>
          <label className="grid gap-2 text-sm font-medium" htmlFor="status">状态<select id="status" name="status" defaultValue={category?.status ?? "active"} className={selectClass} aria-invalid={Boolean(errors.status)} aria-describedby={errors.status ? "status-error" : undefined}>{portfolioCategoryStatuses.map((status) => <option key={status} value={status}>{portfolioCategoryStatusLabels[status]}</option>)}</select><FieldError id="status-error" message={errors.status} /></label>
        </div>
      </section>
      <div className="flex justify-end border-t border-[var(--border)] pt-5"><Button type="submit" disabled={isPending}>{isPending ? <SpinnerGap size={18} className="animate-spin" /> : <FloppyDisk size={18} />}{isPending ? "正在保存" : category ? "保存修改" : "创建分类"}</Button></div>
    </form>
  );
}
