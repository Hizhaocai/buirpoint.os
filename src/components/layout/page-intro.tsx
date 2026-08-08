export function PageIntro({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <header className="mb-8 max-w-2xl"><p className="mb-2 text-xs font-semibold tracking-[0.14em] text-[var(--primary)]">{eyebrow}</p><h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)] sm:text-4xl">{title}</h1><p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)] sm:text-base">{description}</p></header>;
}
