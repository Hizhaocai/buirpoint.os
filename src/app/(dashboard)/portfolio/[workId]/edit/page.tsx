import Link from "next/link";
import { CaretLeft } from "@phosphor-icons/react/dist/ssr";
import { notFound } from "next/navigation";
import { PageIntro } from "@/components/layout/page-intro";
import { PortfolioMediaManager } from "@/components/portfolio/portfolio-media-manager";
import { PortfolioWorkForm } from "@/components/portfolio/portfolio-work-form";
import { Button } from "@/components/ui/button";
import { hasPermission } from "@/lib/auth/permission-model";
import { requirePermission } from "@/lib/auth/permissions";
import { getPortfolioCategories, getPortfolioWork } from "@/lib/portfolio/queries";

export default async function EditPortfolioWorkPage({ params }: { params: Promise<{ workId: string }> }) {
  const { profile } = await requirePermission("portfolio_edit");
  const { workId } = await params;
  const [work, categories] = await Promise.all([getPortfolioWork(workId), getPortfolioCategories({ includeInactive: true })]);
  if (!work) notFound();
  if (work.status === "published") await requirePermission("portfolio_publish");

  return (
    <div className="mx-auto max-w-[900px]">
      <Button asChild variant="ghost" size="sm" className="mb-5 -ml-3"><Link href="/portfolio"><CaretLeft size={16} />返回作品管理</Link></Button>
      <PageIntro eyebrow="编辑作品" title={work.title} description={work.status === "published" ? "该作品已经发布；保存修改需要同时具备发布权限。" : "更新作品档案不会自动改变当前发布状态。"} />
      <PortfolioWorkForm work={work} categories={categories} />
      <PortfolioMediaManager workId={work.id} coverUrl={work.cover_url} videoUrl={work.video_url} canDelete={hasPermission(profile, "portfolio_delete")} />
    </div>
  );
}
