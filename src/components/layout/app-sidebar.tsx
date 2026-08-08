"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDots, Files, GearSix, House, SignOut, UsersThree } from "@phosphor-icons/react/dist/ssr";
import { displayName, hasPermission } from "@/lib/auth/permission-model";
import { roleLabels } from "@/lib/auth/roles";
import { cn } from "@/lib/utils";
import type { Profile } from "@/types/database";

const navigation = [
  { href: "/", label: "工作台", icon: House },
  { href: "/orders", label: "订单", icon: Files },
  { href: "/schedule", label: "档期", icon: CalendarDots },
  { href: "/members", label: "成员管理", icon: UsersThree, permission: "members_manage" as const },
  { href: "/settings", label: "设置", icon: GearSix },
];

export function AppSidebar({ profile, className }: { profile: Profile; className?: string }) {
  const pathname = usePathname();

  return (
    <aside className={cn("flex h-full w-64 flex-col border-r border-[var(--border)] bg-[var(--background)]", className)}>
      <div className="flex h-[60px] items-center px-5">
        <Link href="/" className="grid gap-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]" aria-label="焦点 Buir Point，返回工作台">
          <span className="relative block h-7 w-[13.5rem] max-w-full">
            <Image src="/brand/buir-point-logo-green.png" alt="焦点 Buir Point" fill priority sizes="216px" className="object-contain object-left" />
          </span>
          <span className="pl-px text-[10px] font-medium tracking-[0.08em] text-[var(--muted-foreground)]">Studio Operations</span>
        </Link>
      </div>

      <nav className="mt-2 flex flex-1 flex-col gap-1 px-3" aria-label="主导航">
        {navigation.filter((item) => !item.permission || hasPermission(profile, item.permission)).map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return <Link key={href} href={href} className={cn("relative flex h-10 items-center gap-3 px-3 text-sm font-medium text-[var(--muted-foreground)] transition-colors duration-150 hover:bg-[var(--secondary)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--ring)]", active && "bg-[var(--sidebar-active)] text-[var(--primary)] before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-[var(--primary)]")}><Icon size={19} weight={active ? "fill" : "regular"} />{label}</Link>;
        })}
      </nav>

      <footer className="border-t border-[var(--border)] px-5 py-4">
        <div className="-mx-2 px-2 py-1.5 transition-colors duration-150 hover:bg-[var(--secondary)]"><div className="flex items-center gap-2.5"><span className="grid size-9 place-items-center rounded-full bg-[var(--primary)] text-xs font-semibold text-white">{displayName(profile).slice(0, 1).toUpperCase()}</span><span className="min-w-0"><strong className="block truncate text-sm font-medium">{displayName(profile)}</strong><span className="block text-xs text-[var(--muted-foreground)]">{roleLabels[profile.role]}</span></span></div></div>
        <form action="/auth/signout" method="post" className="mt-2"><button className="flex w-full items-center gap-2 px-2 py-1 text-xs text-[var(--muted-foreground)] transition-colors duration-150 hover:text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"><SignOut size={16} />退出登录</button></form>
      </footer>
    </aside>
  );
}
