"use client";

import { useState, useTransition } from "react";
import { ArrowCounterClockwise } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { restoreOrder } from "@/lib/orders/actions";

export function OrderRestoreButton({ orderId }: { orderId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return <div className="flex flex-col items-end gap-1"><Button type="button" variant="outline" disabled={isPending} onClick={() => startTransition(async () => {
    const result = await restoreOrder(orderId);
    if (result.error) setError(result.error);
  })}><ArrowCounterClockwise size={18} />{isPending ? "正在恢复" : "恢复订单"}</Button>{error ? <p className="text-xs text-[var(--destructive)]">{error}</p> : null}</div>;
}
