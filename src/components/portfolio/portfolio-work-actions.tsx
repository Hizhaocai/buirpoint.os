"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArchiveBoxIcon, ArrowCounterClockwise, PaperPlaneTilt, SpinnerGap, Trash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { deletePortfolioWork, setPortfolioWorkStatus } from "@/lib/portfolio/actions";
import type { PortfolioWorkStatus } from "@/types/database";

export function PortfolioWorkActions({ workId, title, status, canPublish, canDelete }: { workId: string; title: string; status: PortfolioWorkStatus; canPublish: boolean; canDelete: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function changeStatus(nextStatus: PortfolioWorkStatus) {
    setMessage(null);
    startTransition(async () => {
      const result = await setPortfolioWorkStatus(workId, nextStatus);
      setMessage(result.error ?? result.success ?? null);
      if (!result.error) router.refresh();
    });
  }

  function remove() {
    if (!window.confirm(`确认永久删除“${title}”吗？关联的团队与内容记录也会被删除，此操作不可恢复。`)) return;
    setMessage(null);
    startTransition(async () => {
      const result = await deletePortfolioWork(workId);
      setMessage(result.error ?? result.success ?? null);
      if (!result.error) router.refresh();
    });
  }

  return (
    <div className="grid justify-items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        {canPublish && status === "draft" ? <Button type="button" size="sm" variant="outline" disabled={isPending} onClick={() => changeStatus("published")}><PaperPlaneTilt size={16} />发布</Button> : null}
        {canPublish && status === "published" ? <Button type="button" size="sm" variant="outline" disabled={isPending} onClick={() => changeStatus("draft")}><ArrowCounterClockwise size={16} />撤回</Button> : null}
        {canPublish && status !== "archived" ? <Button type="button" size="sm" variant="ghost" disabled={isPending} onClick={() => changeStatus("archived")}><ArchiveBoxIcon size={16} />归档</Button> : null}
        {canPublish && status === "archived" ? <Button type="button" size="sm" variant="ghost" disabled={isPending} onClick={() => changeStatus("draft")}><ArrowCounterClockwise size={16} />恢复草稿</Button> : null}
        {canDelete ? <Button type="button" size="sm" variant="ghost" className="text-[var(--destructive)] hover:bg-[color-mix(in_srgb,var(--destructive)_8%,transparent)] hover:text-[var(--destructive)]" disabled={isPending} onClick={remove}><Trash size={16} />删除</Button> : null}
        {isPending ? <SpinnerGap size={17} className="self-center animate-spin text-[var(--muted-foreground)]" aria-label="正在处理" /> : null}
      </div>
      {message ? <p role="status" className="max-w-sm text-right text-xs text-[var(--muted-foreground)]">{message}</p> : null}
    </div>
  );
}
