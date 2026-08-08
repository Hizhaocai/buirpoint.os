import Link from "next/link";
import { CaretLeft } from "@phosphor-icons/react/dist/ssr";
import { PageIntro } from "@/components/layout/page-intro";
import { OrderForm } from "@/components/orders/order-form";
import { Button } from "@/components/ui/button";
import { requireProfile } from "@/lib/auth/guards";
import { getSourceSuggestions } from "@/lib/orders/queries";
import { getAssignableCameras } from "@/lib/members/queries";

export default async function QuickNewOrderPage() {
  await requireProfile();
  const [cameras, sourceSuggestions] = await Promise.all([getAssignableCameras(), getSourceSuggestions("wedding_company")]);
  return <div className="mx-auto max-w-[720px]"><Button asChild variant="ghost" size="sm" className="mb-5 -ml-3"><Link href="/"><CaretLeft size={16} />返回工作台</Link></Button><PageIntro eyebrow="快速新建" title="先把这一场定下来。" description="填写现场最必要的信息，建立后可继续补全订单档案。" /><OrderForm mode="quick" cameras={cameras} sourceSuggestions={sourceSuggestions} /></div>;
}
