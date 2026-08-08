"use client";

import { useState, useTransition } from "react";
import { displayName } from "@/lib/auth/permission-model";
import { updateMemberRole, updateMemberStatus } from "@/lib/members/actions";
import type { Member } from "@/types/database";

export function MemberActions({ member }: { member: Member }) {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const name = displayName(member);
  const nextRole = member.role === "owner" ? "camera" : "owner";
  const nextRoleLabel = nextRole === "owner" ? "管理员" : "摄像师";
  const nextStatus = member.status === "active" ? "disabled" : "active";
  const statusLabel = nextStatus === "active" ? "启用" : "停用";

  function runAction(confirmText: string, action: () => Promise<{ error?: string; success?: string }>) {
    if (!window.confirm(confirmText)) return;
    setMessage(null);
    startTransition(async () => {
      const result = await action();
      setMessage(result.error ?? result.success ?? null);
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 text-sm">
      <button type="button" disabled={isPending} onClick={() => runAction(`确定将${name}调整为${nextRoleLabel}？`, () => updateMemberRole(member.id, nextRole))} className="font-medium text-[var(--primary)] transition-colors hover:underline disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]">调整为{nextRoleLabel}</button>
      <button type="button" disabled={isPending} onClick={() => runAction(`确定${statusLabel}该成员？`, () => updateMemberStatus(member.id, nextStatus))} className="text-[var(--muted-foreground)] transition-colors hover:text-[var(--primary)] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]">{statusLabel}</button>
      {message ? <p role="status" className="basis-full text-right text-xs text-[var(--muted-foreground)]">{message}</p> : null}
    </div>
  );
}
