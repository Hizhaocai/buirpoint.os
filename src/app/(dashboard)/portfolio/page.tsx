import Link from "next/link";
import { Folders, MagnifyingGlass, Plus, Star, TextAlignLeft } from "@phosphor-icons/react/dist/ssr";
import { PageIntro } from "@/components/layout/page-intro";
import { PortfolioWorkList } from "@/components/portfolio/portfolio-work-list";
import { Button } from "@/components/ui/button";
import { hasPermission } from "@/lib/auth/permission-model";
import { requirePermission } from "@/lib/auth/permissions";
import { getPortfolioWorks } from "@/lib/portfolio/queries";
import { portfolioWorkStatusLabels, portfolioWorkStatuses } from "@/lib/portfolio/schema";
import type { PortfolioWorkStatus } from "@/types/database";

type PortfolioPageProps = { searchParams: Promise<{ q?: string; status?: string }> };
const controlClass = "h-11 w-full rounded-[10px] border border-[var(--border-strong)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--primary)_18%,transparent)]";

export default async function PortfolioPage({ searchParams }: PortfolioPageProps) {
  const { profile } = await requirePermission("portfolio_view");
  const params = await searchParams;
  const status = portfolioWorkStatuses.includes(params.status as PortfolioWorkStatus) ? params.status as PortfolioWorkStatus : "all";
  const works = await getPortfolioWorks({ query: params.q, status });
  const canCreate = hasPermission(profile, "portfolio_create");
  const canEdit = hasPermission(profile, "portfolio_edit");
  const canPublish = hasPermission(profile, "portfolio_publish");
  const canDelete = hasPermission(profile, "portfolio_delete");

  return (
    <div className="mx-auto max-w-[1240px]">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <PageIntro eyebrow="作品管理" title="整理可以被看见的作品。" description="作品先以草稿建立，经确认后发布；封面与视频在作品编辑页独立管理。" />
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="shrink-0"><Link href="/portfolio/categories"><Folders size={18} />分类管理</Link></Button>
          <Button asChild variant="outline" className="shrink-0"><Link href="/portfolio/featured"><Star size={18} />首页精选</Link></Button>
          <Button asChild variant="outline" className="shrink-0"><Link href="/portfolio/content"><TextAlignLeft size={18} />About 内容</Link></Button>
          {canCreate ? <Button asChild className="shrink-0"><Link href="/portfolio/new"><Plus size={18} />新建作品</Link></Button> : null}
        </div>
      </div>

      <nav aria-label="作品状态" className="flex flex-wrap gap-x-5 gap-y-2 border-t border-[var(--border)] pt-4 text-sm">
        <span className="text-[var(--muted-foreground)]">状态</span>
        <Link href="/portfolio" aria-current={status === "all" ? "page" : undefined} className={`font-medium hover:text-[var(--primary)] hover:underline ${status === "all" ? "text-[var(--primary)]" : ""}`}>全部</Link>
        {portfolioWorkStatuses.map((value) => <Link key={value} href={`/portfolio?status=${value}`} aria-current={status === value ? "page" : undefined} className={`font-medium hover:text-[var(--primary)] hover:underline ${status === value ? "text-[var(--primary)]" : ""}`}>{portfolioWorkStatusLabels[value]}</Link>)}
      </nav>

      <form action="/portfolio" className="my-5 grid gap-3 border-y border-[var(--border)] py-4 sm:grid-cols-[minmax(0,1fr)_9rem_auto] sm:items-center">
        <label className="relative block">
          <span className="sr-only">搜索作品</span>
          <MagnifyingGlass aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" size={18} />
          <input name="q" type="search" defaultValue={params.q ?? ""} placeholder="搜索作品名称、标识或简介" className={`${controlClass} pl-10`} />
        </label>
        <label><span className="sr-only">作品状态</span><select name="status" defaultValue={status} className={controlClass}><option value="all">全部状态</option>{portfolioWorkStatuses.map((value) => <option key={value} value={value}>{portfolioWorkStatusLabels[value]}</option>)}</select></label>
        <Button type="submit" variant="secondary">筛选</Button>
      </form>

      <p className="mb-3 text-sm text-[var(--muted-foreground)]">{works.length} 个作品{params.q || status !== "all" ? " · 当前为筛选结果" : ""}</p>
      <PortfolioWorkList works={works} canEdit={canEdit} canPublish={canPublish} canDelete={canDelete} />
    </div>
  );
}
