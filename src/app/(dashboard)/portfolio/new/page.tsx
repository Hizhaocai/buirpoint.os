import Link from "next/link";
import { CaretLeft } from "@phosphor-icons/react/dist/ssr";
import { PageIntro } from "@/components/layout/page-intro";
import { PortfolioWorkForm } from "@/components/portfolio/portfolio-work-form";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/permissions";
import { getPortfolioCategories } from "@/lib/portfolio/queries";

export default async function NewPortfolioWorkPage() {
  await requirePermission("portfolio_create");
  const categories = await getPortfolioCategories();

  return (
    <div className="mx-auto max-w-[900px]">
      <Button asChild variant="ghost" size="sm" className="mb-5 -ml-3"><Link href="/portfolio"><CaretLeft size={16} />返回作品管理</Link></Button>
      <PageIntro eyebrow="新建作品" title="建立一份作品草稿。" description="先记录作品名称、分类和基础说明，发布操作将在作品列表中单独确认。" />
      <PortfolioWorkForm categories={categories} />
    </div>
  );
}
