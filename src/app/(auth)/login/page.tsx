import Image from "next/image";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export default async function LoginPage() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) redirect("/");
  }

  return <main className="grid min-h-[100dvh] place-items-center bg-[var(--canvas)] p-4"><section className="w-full max-w-[26rem] rounded-2xl border border-[var(--border)] bg-[var(--background)] p-6 shadow-[0_24px_80px_rgba(20,36,29,0.08)] sm:p-8"><div className="mb-8 text-center"><div className="relative mx-auto h-10 w-80 max-w-full"><Image src="/brand/buir-point-logo-green.png" alt="焦点 Buir Point" fill priority sizes="320px" className="object-contain" /></div><p className="mt-3 text-xs font-medium tracking-[0.1em] text-[var(--muted-foreground)]">Studio Operations</p><h1 className="mt-5 text-2xl font-semibold tracking-tight">进入工作台</h1><p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">使用工作室账号查看拍摄协作信息。</p></div>{isSupabaseConfigured() ? <LoginForm /> : <div className="rounded-xl border border-[var(--border)] bg-[var(--secondary)] p-4 text-sm leading-6 text-[var(--muted-foreground)]">请先在 <code className="rounded bg-[var(--background)] px-1.5 py-0.5 text-xs">.env.local</code> 中配置 Supabase 地址和发布密钥。</div>}<p className="mt-7 text-xs leading-5 text-[var(--muted-foreground)]">账号由工作室负责人统一维护。如无法登录，请联系负责人。</p></section></main>;
}
