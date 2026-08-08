import Link from "next/link";
import { CaretLeft } from "@phosphor-icons/react/dist/ssr";
import { PageIntro } from "@/components/layout/page-intro";
import { Button } from "@/components/ui/button";
import { OrderForm } from "@/components/orders/order-form";
import { requireProfile } from "@/lib/auth/guards";
import { getSourceSuggestions } from "@/lib/orders/queries";
import { getAssignableCameras } from "@/lib/members/queries";

export default async function NewOrderPage() {
  await requireProfile();
  const [cameras, sourceSuggestions] = await Promise.all([getAssignableCameras(), getSourceSuggestions("wedding_company")]);
  return <div className="mx-auto max-w-[900px]"><Button asChild variant="ghost" size="sm" className="mb-5 -ml-3"><Link href="/orders"><CaretLeft size={16} />返回订单</Link></Button><PageIntro eyebrow="新建订单" title="先把下一场拍摄说清楚。" description="必填项保持精简；未确认的信息可以后补。" /><OrderForm cameras={cameras} sourceSuggestions={sourceSuggestions} /></div>;
}
