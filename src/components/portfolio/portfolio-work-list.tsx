import Link from "next/link";
import { PencilSimple } from "@phosphor-icons/react/dist/ssr";
import { PortfolioWorkActions } from "@/components/portfolio/portfolio-work-actions";
import { Button } from "@/components/ui/button";
import { portfolioWorkStatusLabels } from "@/lib/portfolio/schema";
import type { PortfolioWorkWithCategory } from "@/lib/portfolio/queries";

const statusStyles = {
  draft: "bg-[var(--secondary)] text-[var(--secondary-foreground)]",
  published: "bg-[color-mix(in_srgb,var(--primary)_11%,var(--background))] text-[var(--primary)]",
  archived: "bg-[var(--muted)] text-[var(--muted-foreground)]",
} as const;

const dateFormatter = new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "short", day: "numeric" });

export function PortfolioWorkList({ works, canEdit, canPublish, canDelete }: { works: PortfolioWorkWithCategory[]; canEdit: boolean; canPublish: boolean; canDelete: boolean }) {
  if (!works.length) {
    return <div className="border-y border-[var(--border)] py-16 text-center"><h2 className="font-medium">还没有符合条件的作品</h2><p className="mt-2 text-sm text-[var(--muted-foreground)]">创建第一份作品草稿，或调整当前筛选条件。</p></div>;
  }

  return (
    <section aria-labelledby="portfolio-list-heading" className="border-y border-[var(--border)]">
      <h2 id="portfolio-list-heading" className="sr-only">作品列表</h2>
      <ul className="divide-y divide-[var(--border)]">
        {works.map((work) => (
          <li key={work.id} className="grid gap-5 py-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h3 className="truncate text-base font-semibold">{work.title}</h3>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[work.status]}`}>{portfolioWorkStatusLabels[work.status]}</span>
              </div>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]"><span>{work.category?.name ?? "未分类"}</span><span className="mx-2 text-[var(--border-strong)]">/</span><span>{work.slug}</span></p>
              {work.summary ? <p className="mt-2 line-clamp-2 max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">{work.summary}</p> : null}
              <p className="mt-2 text-xs text-[var(--muted-foreground)]">更新于 {dateFormatter.format(new Date(work.updated_at))}{work.published_at ? ` · 发布于 ${dateFormatter.format(new Date(work.published_at))}` : ""}</p>
            </div>
            <div className="flex flex-col items-start gap-3 lg:items-end">
              {canEdit && (work.status !== "published" || canPublish) ? <Button asChild size="sm" variant="ghost"><Link href={`/portfolio/${work.id}/edit`}><PencilSimple size={16} />编辑</Link></Button> : null}
              <PortfolioWorkActions workId={work.id} title={work.title} status={work.status} canPublish={canPublish} canDelete={canDelete} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
