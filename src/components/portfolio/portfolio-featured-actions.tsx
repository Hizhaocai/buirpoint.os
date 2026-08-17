"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FloppyDisk, SpinnerGap, Star } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setPortfolioWorkFeatured, updatePortfolioFeaturedSort, type PortfolioFeaturedActionState } from "@/lib/portfolio/featured-actions";

const initialState: PortfolioFeaturedActionState = {};

export function PortfolioFeaturedActions({ workId, featured, sortOrder }: { workId: string; featured: boolean; sortOrder: number }) {
  const router = useRouter();
  const [toggleMessage, setToggleMessage] = useState<string | null>(null);
  const [isToggling, startTransition] = useTransition();
  const [sortState, sortAction, isSorting] = useActionState(updatePortfolioFeaturedSort.bind(null, workId), initialState);

  function toggleFeatured() {
    setToggleMessage(null);
    startTransition(async () => {
      const result = await setPortfolioWorkFeatured(workId, !featured);
      setToggleMessage(result.error ?? result.success ?? null);
      if (!result.error) router.refresh();
    });
  }

  return (
    <div className="grid justify-items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {featured ? <form action={sortAction} className="flex items-center gap-2"><label className="sr-only" htmlFor={`featured-sort-${workId}`}>精选排序</label><Input id={`featured-sort-${workId}`} name="sort_order" type="number" min={0} max={9999} step={1} defaultValue={sortOrder} className="h-8 w-24" /><Button type="submit" size="sm" variant="ghost" disabled={isSorting}>{isSorting ? <SpinnerGap className="animate-spin" size={16} /> : <FloppyDisk size={16} />}保存排序</Button></form> : null}
        <Button type="button" size="sm" variant={featured ? "outline" : "default"} disabled={isToggling} onClick={toggleFeatured}>{isToggling ? <SpinnerGap className="animate-spin" size={16} /> : <Star size={16} weight={featured ? "fill" : "regular"} />}{isToggling ? "正在处理" : featured ? "取消精选" : "设为精选"}</Button>
      </div>
      {sortState.error || sortState.success ? <p role="status" className={`max-w-sm text-right text-xs ${sortState.error ? "text-[var(--destructive)]" : "text-[var(--muted-foreground)]"}`}>{sortState.error ?? sortState.success}</p> : null}
      {toggleMessage ? <p role="status" className="max-w-sm text-right text-xs text-[var(--muted-foreground)]">{toggleMessage}</p> : null}
    </div>
  );
}
