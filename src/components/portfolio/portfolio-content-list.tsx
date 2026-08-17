import Link from "next/link";
import { PencilSimple } from "@phosphor-icons/react/dist/ssr";
import { PortfolioContentActions } from "@/components/portfolio/portfolio-content-actions";
import { Button } from "@/components/ui/button";
import { aboutContentHref } from "@/lib/portfolio/content-queries";
import { portfolioAboutContentDescriptions, portfolioAboutContentLabels } from "@/lib/portfolio/content-schema";
import type { PortfolioAboutContent } from "@/types/database";

const dateFormatter = new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "short", day: "numeric" });

export function PortfolioContentList({ contents, canEdit, canPublish }: { contents: PortfolioAboutContent[]; canEdit: boolean; canPublish: boolean }) {
  return (
    <section aria-labelledby="about-content-list-heading" className="border-y border-[var(--border)]">
      <h2 id="about-content-list-heading" className="sr-only">About 内容列表</h2>
      <ul className="divide-y divide-[var(--border)]">
        {contents.map((item) => {
          const text = typeof item.content.text === "string" ? item.content.text : "";
          return (
            <li key={item.id} className="grid gap-5 py-6 lg:grid-cols-[10rem_minmax(0,1fr)_auto] lg:items-center">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--muted-foreground)]">{item.content_type}</p>
                <p className="mt-2 font-semibold">{portfolioAboutContentLabels[item.content_type]}</p>
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h3 className="truncate font-medium">{item.title}</h3>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${item.published ? "bg-[color-mix(in_srgb,var(--primary)_11%,var(--background))] text-[var(--primary)]" : "bg-[var(--muted)] text-[var(--muted-foreground)]"}`}>{item.published ? "已发布" : "已隐藏"}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{item.subtitle || text || portfolioAboutContentDescriptions[item.content_type]}</p>
                <p className="mt-2 text-xs text-[var(--muted-foreground)]">更新于 {dateFormatter.format(new Date(item.updated_at))}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                {canEdit ? <Button asChild size="sm" variant="ghost"><Link href={aboutContentHref(item.content_type)}><PencilSimple size={16} />编辑</Link></Button> : null}
                {canPublish ? <PortfolioContentActions contentType={item.content_type} published={item.published} /> : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

