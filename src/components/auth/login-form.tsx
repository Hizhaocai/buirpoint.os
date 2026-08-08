"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Eye, EyeSlash, SpinnerGap } from "@phosphor-icons/react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

const loginSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址。"),
  password: z.string().min(1, "请输入密码。"),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginValues) => {
    setServerError(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword(values);
      if (error) {
        setServerError("邮箱或密码不正确，请重新输入。");
        return;
      }
      window.location.assign("/");
    } catch {
      setServerError("无法连接认证服务。请检查环境变量配置后重试。");
    }
  };

  return (
    <form className="grid gap-5" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="grid gap-2">
        <label className="text-sm font-medium text-[var(--foreground)]" htmlFor="email">邮箱</label>
        <Input id="email" type="email" autoComplete="email" placeholder="name@studio.com" aria-invalid={Boolean(errors.email)} {...register("email")} />
        {errors.email && <p className="text-sm text-[var(--destructive)]">{errors.email.message}</p>}
      </div>
      <div className="grid gap-2">
        <label className="text-sm font-medium text-[var(--foreground)]" htmlFor="password">密码</label>
        <div className="relative">
          <Input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="输入你的密码" className="pr-11" aria-invalid={Boolean(errors.password)} {...register("password")} />
          <button type="button" className="absolute inset-y-0 right-0 grid w-11 place-items-center text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "隐藏密码" : "显示密码"}>
            {showPassword ? <EyeSlash size={19} weight="regular" /> : <Eye size={19} weight="regular" />}
          </button>
        </div>
        {errors.password && <p className="text-sm text-[var(--destructive)]">{errors.password.message}</p>}
      </div>
      {serverError && <div className="rounded-[10px] border border-[color-mix(in_srgb,var(--destructive)_30%,transparent)] bg-[color-mix(in_srgb,var(--destructive)_8%,transparent)] px-3 py-2.5 text-sm text-[var(--destructive)]" role="alert">{serverError}</div>}
      <Button type="submit" className="mt-1 w-full" disabled={isSubmitting}>
        {isSubmitting ? <SpinnerGap className="animate-spin" size={18} /> : <ArrowRight size={18} />}
        登录工作台
      </Button>
    </form>
  );
}
