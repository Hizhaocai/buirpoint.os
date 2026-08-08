import Link from "next/link";
import { CaretLeft } from "@phosphor-icons/react/dist/ssr";
import { notFound } from "next/navigation";
import { PageIntro } from "@/components/layout/page-intro";
import { Button } from "@/components/ui/button";
import { OrderForm } from "@/components/orders/order-form";
import { requireProfile } from "@/lib/auth/guards";
import { getOrder, getSourceSuggestions } from "@/lib/orders/queries";
import { getAssignableCameras } from "@/lib/members/queries";

export default async function EditOrderPage({ params }: { params: Promise<{ orderId: string }> }) {
  await requireProfile();
  const { orderId } = await params;
  const [order, cameras, sourceSuggestions] = await Promise.all([getOrder(orderId), getAssignableCameras(), getSourceSuggestions("wedding_company")]);
  if (!order) notFound();
  return <div className="mx-auto max-w-[900px]"><Button asChild variant="ghost" size="sm" className="mb-5 -ml-3"><Link href={`/orders/${order.id}`}><CaretLeft size={16} />返回详情</Link></Button><PageIntro eyebrow="编辑订单" title={order.project_name} description="更新后会立即反映到订单列表中。" /><OrderForm order={order} cameras={cameras} sourceSuggestions={sourceSuggestions} /></div>;
}
