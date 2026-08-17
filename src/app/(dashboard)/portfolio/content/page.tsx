import Link from "next/link";
import { CaretLeft } from "@phosphor-icons/react/dist/ssr";
import { PageIntro } from "@/components/layout/page-intro";
import { PortfolioContentList } from "@/components/portfolio/portfolio-content-list";
import { Button } from "@/components/ui/button";
import { hasPermission } from "@/lib/auth/permission-model";
import { requirePermission } from "@/lib/auth/permissions";
import { getPortfolioAboutContents } from "@/lib/portfolio/content-queries";

export default async function PortfolioContentPage() {
  const { profile } = await requirePermission("portfolio_view");
  const contents = await getPortfolioAboutContents();

  return (
    <div className="mx-auto max-w-[1100px]">
      <Button asChild variant="ghost" size="sm" className="mb-5 -ml-3"><Link href="/portfolio"><CaretLeft size={16} />返回作品管理</Link></Button>
      <PageIntro eyebrow="About 内容" title="保持工作室表达一致。" description="四项固定内容分别维护；保存正文不会自动改变发布状态。" />
      <p className="mb-4 text-sm text-[var(--muted-foreground)]">{contents.length} 项固定内容</p>
      <PortfolioContentList contents={contents} canEdit={hasPermission(profile, "portfolio_edit")} canPublish={hasPermission(profile, "portfolio_publish")} />
    </div>
  );
}

