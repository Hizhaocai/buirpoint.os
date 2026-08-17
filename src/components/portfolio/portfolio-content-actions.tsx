"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Eye, EyeSlash, SpinnerGap } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { setPortfolioAboutContentPublished } from "@/lib/portfolio/content-actions";
import type { PortfolioAboutContentType } from "@/types/database";

export function PortfolioContentActions({ contentType, published }: { contentType: PortfolioAboutContentType; published: boolean }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateStatus() {
    setMessage(null);
    startTransition(async () => {
      const result = await setPortfolioAboutContentPublished(contentType, !published);
      setMessage(result.error ?? result.success ?? null);
      if (!result.error) router.refresh();
    });
  }

  return (
    <div className="grid justify-items-end gap-2">
      <Button type="button" size="sm" variant="outline" disabled={isPending} onClick={updateStatus}>
        {isPending ? <SpinnerGap className="animate-spin" size={16} /> : published ? <EyeSlash size={16} /> : <Eye size={16} />}
        {isPending ? "正在处理" : published ? "隐藏" : "发布"}
      </Button>
      {message ? <p role="status" className="max-w-52 text-right text-xs text-[var(--muted-foreground)]">{message}</p> : null}
    </div>
  );
}

