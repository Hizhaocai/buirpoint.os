import Link from "next/link";
import { CaretLeft } from "@phosphor-icons/react/dist/ssr";
import { PageIntro } from "@/components/layout/page-intro";
import { PortfolioCategoryForm } from "@/components/portfolio/portfolio-category-form";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/permissions";

export default async function NewPortfolioCategoryPage() {
  await requirePermission("portfolio_edit");
  return <div className="mx-auto max-w-[900px]"><Button asChild variant="ghost" size="sm" className="mb-5 -ml-3"><Link href="/portfolio/categories"><CaretLeft size={16} />返回分类管理</Link></Button><PageIntro eyebrow="创建分类" title="建立新的作品分类。" description="分类标识用于稳定识别；创建后仍可调整名称、排序和状态。" /><PortfolioCategoryForm /></div>;
}
