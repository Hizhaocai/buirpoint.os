import Link from "next/link";
import { CaretLeft } from "@phosphor-icons/react/dist/ssr";
import { notFound } from "next/navigation";
import { PageIntro } from "@/components/layout/page-intro";
import { PortfolioCategoryForm } from "@/components/portfolio/portfolio-category-form";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/permissions";
import { getPortfolioCategory } from "@/lib/portfolio/category-queries";

export default async function EditPortfolioCategoryPage({ params }: { params: Promise<{ categoryId: string }> }) {
  await requirePermission("portfolio_edit");
  const { categoryId } = await params;
  const category = await getPortfolioCategory(categoryId);
  if (!category) notFound();
  return <div className="mx-auto max-w-[900px]"><Button asChild variant="ghost" size="sm" className="mb-5 -ml-3"><Link href="/portfolio/categories"><CaretLeft size={16} />返回分类管理</Link></Button><PageIntro eyebrow="编辑分类" title={category.name} description="修改分类信息不会改变已有作品内容。" /><PortfolioCategoryForm category={category} /></div>;
}
