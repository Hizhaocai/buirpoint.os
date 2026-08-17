import Link from "next/link";
import { CaretLeft } from "@phosphor-icons/react/dist/ssr";
import { PageIntro } from "@/components/layout/page-intro";
import { PortfolioFeaturedList } from "@/components/portfolio/portfolio-featured-list";
import { Button } from "@/components/ui/button";
import { hasPermission } from "@/lib/auth/permission-model";
import { requirePermission } from "@/lib/auth/permissions";
import { getPublishedPortfolioWorksForFeatured } from "@/lib/portfolio/featured-queries";

export default async function PortfolioFeaturedPage() {
  const { profile } = await requirePermission("portfolio_view");
  const works = await getPublishedPortfolioWorksForFeatured();
  const featuredCount = works.filter((work) => work.featured).length;
  return <div className="mx-auto max-w-[1100px]"><Button asChild variant="ghost" size="sm" className="mb-5 -ml-3"><Link href="/portfolio"><CaretLeft size={16} />返回作品管理</Link></Button><PageIntro eyebrow="首页精选" title="决定首页首先展示什么。" description="这里只列出已发布作品；精选状态和显示顺序独立维护。" /><p className="mb-4 text-sm text-[var(--muted-foreground)]">{works.length} 个已发布作品 · {featuredCount} 个首页精选</p><PortfolioFeaturedList works={works} canPublish={hasPermission(profile, "portfolio_publish")} /></div>;
}
