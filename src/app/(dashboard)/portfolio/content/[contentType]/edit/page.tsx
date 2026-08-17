import Link from "next/link";
import { CaretLeft } from "@phosphor-icons/react/dist/ssr";
import { notFound } from "next/navigation";
import { PageIntro } from "@/components/layout/page-intro";
import { PortfolioContentForm } from "@/components/portfolio/portfolio-content-form";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/permissions";
import { getPortfolioAboutContent } from "@/lib/portfolio/content-queries";
import { portfolioAboutContentDescriptions, portfolioAboutContentLabels } from "@/lib/portfolio/content-schema";

export default async function EditPortfolioContentPage({ params }: { params: Promise<{ contentType: string }> }) {
  await requirePermission("portfolio_edit");
  const { contentType } = await params;
  const item = await getPortfolioAboutContent(contentType);
  if (!item) notFound();

  return (
    <div className="mx-auto max-w-[900px]">
      <Button asChild variant="ghost" size="sm" className="mb-5 -ml-3"><Link href="/portfolio/content"><CaretLeft size={16} />返回 About 内容</Link></Button>
      <PageIntro eyebrow={portfolioAboutContentLabels[item.content_type]} title={item.title} description={portfolioAboutContentDescriptions[item.content_type]} />
      <PortfolioContentForm item={item} />
    </div>
  );
}

