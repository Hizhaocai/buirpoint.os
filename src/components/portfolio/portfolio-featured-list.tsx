import { PortfolioFeaturedActions } from "@/components/portfolio/portfolio-featured-actions";
import type { PortfolioWorkWithCategory } from "@/lib/portfolio/queries";

const dateFormatter = new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "short", day: "numeric" });

export function PortfolioFeaturedList({ works, canPublish }: { works: PortfolioWorkWithCategory[]; canPublish: boolean }) {
  if (works.length === 0) return <section className="border-y border-[var(--border)] py-12 text-center"><h2 className="font-semibold">还没有已发布作品</h2><p className="mt-2 text-sm text-[var(--muted-foreground)]">先在作品管理中发布作品，再设置首页精选。</p></section>;
  return (
    <section aria-labelledby="featured-list-heading" className="border-y border-[var(--border)]">
      <h2 id="featured-list-heading" className="sr-only">首页精选作品列表</h2>
      <ul className="divide-y divide-[var(--border)]">
        {works.map((work) => <li key={work.id} className="grid gap-5 py-6 lg:grid-cols-[8rem_minmax(0,1fr)_auto] lg:items-center">
          <div><p className="font-mono text-sm tabular-nums text-[var(--muted-foreground)]">{work.featured ? work.sort_order : "—"}</p><p className="mt-2 text-xs text-[var(--muted-foreground)]">{work.featured ? "精选排序" : "未精选"}</p></div>
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2.5"><h3 className="font-medium">{work.title}</h3><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${work.featured ? "bg-[color-mix(in_srgb,var(--primary)_11%,var(--background))] text-[var(--primary)]" : "bg-[var(--muted)] text-[var(--muted-foreground)]"}`}>{work.featured ? "首页精选" : "普通发布"}</span></div><p className="mt-2 text-sm text-[var(--muted-foreground)]">{work.category?.name ?? "未分类"}{work.published_at ? ` · 发布于 ${dateFormatter.format(new Date(work.published_at))}` : ""}</p></div>
          {canPublish ? <PortfolioFeaturedActions workId={work.id} featured={work.featured} sortOrder={work.sort_order} /> : null}
        </li>)}
      </ul>
    </section>
  );
}
