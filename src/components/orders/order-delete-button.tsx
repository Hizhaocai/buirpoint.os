"use client";

import { useState, useTransition } from "react";
import { ArchiveBoxIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { deleteOrder } from "@/lib/orders/actions";

// The existing import name is preserved while the user-facing operation is archival.
export function OrderDeleteButton({ orderId, projectName }: { orderId: string; projectName: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return <div className="flex flex-col items-end gap-1"><Button type="button" variant="ghost" className="text-[var(--destructive)] hover:bg-[color-mix(in_srgb,var(--destructive)_8%,transparent)] hover:text-[var(--destructive)]" disabled={isPending} onClick={() => {
    if (window.confirm(`确认将“${projectName}”移入归档吗？订单和附件会被保留，可从归档中恢复。`)) startTransition(async () => {
      const result = await deleteOrder(orderId);
      if (result?.error) setError(result.error);
    });
  }}><ArchiveBoxIcon size={18} />{isPending ? "正在归档" : "移入归档"}</Button>{error ? <p className="text-xs text-[var(--destructive)]">{error}</p> : null}</div>;
}
