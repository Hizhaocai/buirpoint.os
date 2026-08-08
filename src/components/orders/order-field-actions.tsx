"use client";

import { useState, useTransition } from "react";
import { CheckCircle, SpinnerGap } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { advanceOrderWorkflow, type FieldWorkflowAction } from "@/lib/orders/actions";

export function OrderFieldActions({ orderId, action, label, requiresConfirmation = false }: { orderId: string; action: FieldWorkflowAction; label: string; requiresConfirmation?: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  function runAction() {
    if (requiresConfirmation && !window.confirm("确认标记为已交付吗？此操作会记录在订单变更中。")) return;
    startTransition(async () => {
      const result = await advanceOrderWorkflow(orderId, action);
      setMessage(result.error ?? result.success ?? null);
    });
  }
  return <section aria-labelledby="field-actions-heading" className="border-t border-[var(--border)] pt-8"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h2 id="field-actions-heading" className="font-semibold">现场操作</h2><p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">只显示当前流程中可直接推进的一步；所有变更都会记录。</p></div><Button type="button" onClick={runAction} disabled={isPending} className="shrink-0">{isPending ? <SpinnerGap size={18} className="animate-spin" /> : <CheckCircle size={18} />}{isPending ? "正在更新" : label}</Button></div>{message ? <p role="status" className="mt-3 text-sm text-[var(--muted-foreground)]">{message}</p> : null}</section>;
}
