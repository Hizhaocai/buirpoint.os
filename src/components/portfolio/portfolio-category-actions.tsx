"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Eye, EyeSlash, SpinnerGap, Trash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { deletePortfolioCategory, setPortfolioCategoryStatus } from "@/lib/portfolio/category-actions";
import type { PortfolioCategoryStatus } from "@/types/database";

export function PortfolioCategoryActions({ categoryId, name, status, workCount, canEdit, canDelete }: { categoryId: string; name: string; status: PortfolioCategoryStatus; workCount: number; canEdit: boolean; canDelete: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function changeStatus() {
    setMessage(null);
    startTransition(async () => {
      const result = await setPortfolioCategoryStatus(categoryId, status === "active" ? "inactive" : "active");
      setMessage(result.error ?? result.success ?? null);
      if (!result.error) router.refresh();
    });
  }

  function remove() {
    if (!window.confirm(`确认删除分类“${name}”吗？此操作不可恢复。`)) return;
    setMessage(null);
    startTransition(async () => {
      const result = await deletePortfolioCategory(categoryId);
      setMessage(result.error ?? result.success ?? null);
      if (!result.error) router.refresh();
    });
  }

  return (
    <div className="grid justify-items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        {canEdit ? <Button type="button" size="sm" variant="outline" disabled={isPending} onClick={changeStatus}>{status === "active" ? <EyeSlash size={16} /> : <Eye size={16} />}{status === "active" ? "停用" : "启用"}</Button> : null}
        {canDelete ? <Button type="button" size="sm" variant="ghost" className="text-[var(--destructive)] hover:bg-[color-mix(in_srgb,var(--destructive)_8%,transparent)] hover:text-[var(--destructive)]" disabled={isPending || workCount > 0} title={workCount > 0 ? "存在关联作品，不能删除" : undefined} onClick={remove}><Trash size={16} />删除</Button> : null}
        {isPending ? <SpinnerGap size={17} className="self-center animate-spin text-[var(--muted-foreground)]" aria-label="正在处理" /> : null}
      </div>
      {workCount > 0 && canDelete ? <p className="text-right text-xs text-[var(--muted-foreground)]">有关联作品，禁止删除</p> : null}
      {message ? <p role="status" className="max-w-sm text-right text-xs text-[var(--muted-foreground)]">{message}</p> : null}
    </div>
  );
}
