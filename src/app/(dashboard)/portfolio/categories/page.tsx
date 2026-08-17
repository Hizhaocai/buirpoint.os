import Link from "next/link";
import { CaretLeft, Plus } from "@phosphor-icons/react/dist/ssr";
import { PageIntro } from "@/components/layout/page-intro";
import { PortfolioCategoryList } from "@/components/portfolio/portfolio-category-list";
import { Button } from "@/components/ui/button";
import { hasPermission } from "@/lib/auth/permission-model";
import { requirePermission } from "@/lib/auth/permissions";
import { getPortfolioCategoryList } from "@/lib/portfolio/category-queries";

export default async function PortfolioCategoriesPage() {
  const { profile } = await requirePermission("portfolio_view");
  const categories = await getPortfolioCategoryList();
  const canEdit = hasPermission(profile, "portfolio_edit");
  const canDelete = hasPermission(profile, "portfolio_delete");
  return (
    <div className="mx-auto max-w-[1100px]">
      <Button asChild variant="ghost" size="sm" className="mb-5 -ml-3"><Link href="/portfolio"><CaretLeft size={16} />返回作品管理</Link></Button>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><PageIntro eyebrow="分类管理" title="让作品归档保持清晰。" description="分类可启用或停用；已有作品的关联不会因停用而改变。" />{canEdit ? <Button asChild><Link href="/portfolio/categories/new"><Plus size={18} />创建分类</Link></Button> : null}</div>
      <p className="mb-4 text-sm text-[var(--muted-foreground)]">{categories.length} 个分类</p>
      <PortfolioCategoryList categories={categories} canEdit={canEdit} canDelete={canDelete} />
    </div>
  );
}
