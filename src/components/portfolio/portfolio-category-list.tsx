import Link from "next/link";
import { PencilSimple } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { PortfolioCategoryActions } from "@/components/portfolio/portfolio-category-actions";
import { portfolioCategoryStatusLabels } from "@/lib/portfolio/category-schema";
import type { PortfolioCategoryWithWorkCount } from "@/lib/portfolio/category-queries";

export function PortfolioCategoryList({ categories, canEdit, canDelete }: { categories: PortfolioCategoryWithWorkCount[]; canEdit: boolean; canDelete: boolean }) {
  if (categories.length === 0) return <section className="border-y border-[var(--border)] py-12 text-center"><h2 className="font-semibold">还没有作品分类</h2><p className="mt-2 text-sm text-[var(--muted-foreground)]">创建第一个分类后，可在作品编辑页进行选择。</p></section>;
  return (
    <section aria-labelledby="category-list-heading" className="border-y border-[var(--border)]">
      <h2 id="category-list-heading" className="sr-only">作品分类列表</h2>
      <ul className="divide-y divide-[var(--border)]">
        {categories.map((category) => <li key={category.id} className="grid gap-5 py-6 lg:grid-cols-[8rem_minmax(0,1fr)_auto] lg:items-center">
          <div><p className="font-mono text-sm tabular-nums text-[var(--muted-foreground)]">{category.sort_order}</p><p className="mt-2 text-xs text-[var(--muted-foreground)]">排序</p></div>
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2.5"><h3 className="font-medium">{category.name}</h3><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${category.status === "active" ? "bg-[color-mix(in_srgb,var(--primary)_11%,var(--background))] text-[var(--primary)]" : "bg-[var(--muted)] text-[var(--muted-foreground)]"}`}>{portfolioCategoryStatusLabels[category.status]}</span></div><p className="mt-2 text-sm text-[var(--muted-foreground)]">{category.slug} · {category.work_count} 个关联作品</p></div>
          <div className="flex flex-wrap items-start justify-end gap-2">{canEdit ? <Button asChild size="sm" variant="ghost"><Link href={`/portfolio/categories/${category.id}/edit`}><PencilSimple size={16} />编辑</Link></Button> : null}<PortfolioCategoryActions categoryId={category.id} name={category.name} status={category.status} workCount={category.work_count} canEdit={canEdit} canDelete={canDelete} /></div>
        </li>)}
      </ul>
    </section>
  );
}
