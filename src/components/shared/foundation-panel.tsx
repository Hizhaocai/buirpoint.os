import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function FoundationPanel({ title, description, href, icon: Icon, className }: { title: string; description: string; href: string; icon: React.ComponentType<{ size?: number; weight?: "regular" | "fill" }>; className?: string }) {
  return <Link href={href} className={cn("group flex min-h-44 flex-col rounded-xl border border-[var(--border)] bg-[var(--background)] p-5 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:shadow-[0_16px_36px_rgba(20,36,29,0.07)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]", className)}><span className="grid size-9 place-items-center rounded-[10px] bg-[var(--secondary)] text-[var(--primary)]"><Icon size={20} weight="regular" /></span><span className="mt-auto"><span className="flex items-center justify-between"><strong className="text-base font-semibold">{title}</strong><ArrowRight className="text-[var(--muted-foreground)] transition-transform group-hover:translate-x-0.5" size={18} /></span><span className="mt-1 block text-sm leading-6 text-[var(--muted-foreground)]">{description}</span></span></Link>;
}
