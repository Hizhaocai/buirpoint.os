"use client";

import Image from "next/image";
import { List, X } from "@phosphor-icons/react";
import { useState } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import type { Profile } from "@/types/database";

export function MobileNavigation({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false);
  return <><header className="flex h-16 items-center justify-between border-b border-[var(--border)] bg-[var(--background)] px-4 md:hidden"><div className="relative h-7 w-40"><Image src="/brand/buir-point-logo-green.png" alt="焦点 Buir Point" fill priority sizes="160px" className="object-contain object-left" /></div><button className="grid size-11 shrink-0 place-items-center rounded-lg text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]" onClick={() => setOpen(true)} aria-label="打开导航"><List size={23} /></button></header>{open && <div className="fixed inset-0 z-50 md:hidden"><button aria-label="关闭导航" className="absolute inset-0 bg-[rgba(17,24,20,0.32)]" onClick={() => setOpen(false)} /><div className="relative h-full w-[min(20rem,86vw)]"><button className="absolute right-4 top-2 z-10 grid size-11 place-items-center rounded-lg bg-[var(--secondary)]" onClick={() => setOpen(false)} aria-label="关闭导航"><X size={19} /></button><AppSidebar profile={profile} className="w-full" /></div></div>}</>;
}
