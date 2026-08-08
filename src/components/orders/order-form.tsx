"use client";

import { useActionState, useState } from "react";
import { FloppyDisk, SpinnerGap } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createOrder, updateOrder } from "@/lib/orders/actions";
import { orderBackupStatusLabels, orderBackupStatuses, orderDeliveryStatusLabels, orderDeliveryStatuses, orderEditingStatusLabels, orderEditingStatuses, orderShootStatusLabels, orderShootStatuses, orderSourceTypeLabels, orderSourceTypes, orderStatusLabels, orderStatuses, type OrderFormState } from "@/lib/orders/schema";
import type { AssignableCamera, OrderSourceType, OrderWithCamera } from "@/types/database";

const initialState: OrderFormState = {};
const selectClass = "h-11 w-full rounded-[10px] border border-[var(--border-strong)] bg-[var(--background)] px-3 text-sm outline-none transition-colors focus:border-[var(--primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--primary)_18%,transparent)]";

function FieldError({ message, id }: { message?: string; id: string }) {
  return message ? <p id={id} className="mt-1.5 text-xs font-medium text-[var(--destructive)]">{message}</p> : null;
}

export function OrderForm({ order, cameras, sourceSuggestions = [], mode = "full" }: { order?: OrderWithCamera; cameras: AssignableCamera[]; sourceSuggestions?: string[]; mode?: "full" | "quick" }) {
  const action = order ? updateOrder.bind(null, order.id) : createOrder;
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [sourceType, setSourceType] = useState<OrderSourceType>(order?.source_type ?? "wedding_company");
  const fieldErrors = state.fieldErrors ?? {};
  const quick = mode === "quick";
  const secondaryCameraIds = new Set(order?.camera_assignments?.filter((assignment) => assignment.role === "secondary").map((assignment) => assignment.camera_id) ?? []);

  return <form action={formAction} className="grid gap-8" noValidate>
    {quick ? <input type="hidden" name="quick_create" value="true" /> : null}
    {state.error ? <div role="alert" className="rounded-xl border border-[color-mix(in_srgb,var(--destructive)_28%,var(--border))] bg-[color-mix(in_srgb,var(--destructive)_7%,var(--background))] px-4 py-3 text-sm text-[var(--destructive)]">{state.error}</div> : null}

    <fieldset className="grid gap-3 border-y border-[var(--border)] py-4">
      <legend className="text-sm font-semibold">副摄像人员</legend>
      <p className="text-xs leading-5 text-[var(--muted-foreground)]">可选多位副摄；主摄无需在此重复选择。</p>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {cameras.map((camera) => <label key={camera.id} className="inline-flex min-h-9 items-center gap-2 text-sm text-[var(--foreground)]"><input type="checkbox" name="secondary_camera_ids" value={camera.id} defaultChecked={secondaryCameraIds.has(camera.id)} className="size-4 accent-[var(--primary)]" />{camera.display_name}</label>)}
      </div>
      {fieldErrors.secondary_camera_ids ? <FieldError id="secondary_camera_ids-error" message={fieldErrors.secondary_camera_ids} /> : null}
    </fieldset>

    <section className="grid gap-5 rounded-xl border border-[var(--border)] bg-[var(--background)] p-5 sm:p-6">
      <div><h2 className="font-semibold">{quick ? "这一场拍摄" : "订单与拍摄"}</h2><p className="mt-1 text-sm text-[var(--muted-foreground)]">{quick ? "完成必要信息后即可建立订单，其他细节可在详情页补充。" : "记录拍摄协调所需的项目、来源与现场信息。"}</p></div>
      <div className="grid gap-5 md:grid-cols-2">
        {!quick ? <label className="grid gap-2 text-sm font-medium" htmlFor="project_name">项目名称<Input id="project_name" name="project_name" required maxLength={160} defaultValue={order?.project_name} aria-invalid={Boolean(fieldErrors.project_name)} aria-describedby={fieldErrors.project_name ? "project_name-error" : undefined} /><FieldError id="project_name-error" message={fieldErrors.project_name} /></label> : null}
        <label className="grid gap-2 text-sm font-medium" htmlFor="client_name">客户/新人姓名<Input id="client_name" name="client_name" required maxLength={120} defaultValue={order?.client_name} aria-invalid={Boolean(fieldErrors.client_name)} aria-describedby={fieldErrors.client_name ? "client_name-error" : undefined} /><FieldError id="client_name-error" message={fieldErrors.client_name} /></label>
        <label className="grid gap-2 text-sm font-medium" htmlFor="contact_phone">联系电话<Input id="contact_phone" name="contact_phone" type="tel" required={quick} maxLength={40} defaultValue={order?.contact_phone ?? ""} aria-invalid={Boolean(fieldErrors.contact_phone)} aria-describedby={fieldErrors.contact_phone ? "contact_phone-error" : undefined} /><FieldError id="contact_phone-error" message={fieldErrors.contact_phone} /></label>
        {!quick ? <label className="grid gap-2 text-sm font-medium" htmlFor="contact_name">联系人<Input id="contact_name" name="contact_name" maxLength={80} defaultValue={order?.contact_name ?? ""} aria-invalid={Boolean(fieldErrors.contact_name)} aria-describedby={fieldErrors.contact_name ? "contact_name-error" : undefined} /><FieldError id="contact_name-error" message={fieldErrors.contact_name} /></label> : <input type="hidden" name="contact_name" value="" />}
        <label className="grid gap-2 text-sm font-medium" htmlFor="source_type">来源类型<select id="source_type" name="source_type" value={sourceType} onChange={(event) => setSourceType(event.target.value as OrderSourceType)} className={selectClass}>{orderSourceTypes.map((type) => <option key={type} value={type}>{orderSourceTypeLabels[type]}</option>)}</select></label>
        {sourceType === "direct_customer" ? <><input type="hidden" name="source_name" value="直客" /><div className="grid gap-2 text-sm font-medium"><span>来源名称</span><div className="flex h-11 items-center rounded-[10px] border border-[var(--border)] bg-[var(--secondary)] px-3 text-sm text-[var(--muted-foreground)]">直客</div></div></> : <label className="grid gap-2 text-sm font-medium" htmlFor="source_name">来源名称<Input id="source_name" name="source_name" required maxLength={120} list="wedding-company-suggestions" defaultValue={order?.source_type === "wedding_company" ? order.source_name : ""} placeholder="输入或选择历史婚庆公司" aria-invalid={Boolean(fieldErrors.source_name)} aria-describedby={fieldErrors.source_name ? "source_name-error" : undefined} /><datalist id="wedding-company-suggestions">{sourceSuggestions.map((source) => <option key={source} value={source} />)}</datalist><FieldError id="source_name-error" message={fieldErrors.source_name} /></label>}
        <label className="grid gap-2 text-sm font-medium" htmlFor="shoot_date">拍摄日期<Input id="shoot_date" name="shoot_date" type="date" required={quick} defaultValue={order?.shoot_date ?? ""} aria-invalid={Boolean(fieldErrors.shoot_date)} aria-describedby={fieldErrors.shoot_date ? "shoot_date-error" : undefined} /><FieldError id="shoot_date-error" message={fieldErrors.shoot_date} /></label>
        <label className="grid gap-2 text-sm font-medium" htmlFor="shoot_location">拍摄地点<Input id="shoot_location" name="shoot_location" required={quick} maxLength={240} defaultValue={order?.shoot_location ?? ""} aria-invalid={Boolean(fieldErrors.shoot_location)} aria-describedby={fieldErrors.shoot_location ? "shoot_location-error" : undefined} /><FieldError id="shoot_location-error" message={fieldErrors.shoot_location} /></label>
        <label className="grid gap-2 text-sm font-medium" htmlFor="assigned_camera_id">主摄像人员<select id="assigned_camera_id" name="assigned_camera_id" required={quick} defaultValue={order?.assigned_camera_id ?? ""} className={selectClass}><option value="">暂不分配</option>{cameras.map((camera) => <option key={camera.id} value={camera.id}>{camera.display_name}</option>)}</select></label>
        <label className="grid gap-2 text-sm font-medium" htmlFor="total_price">订单总价<Input id="total_price" name="total_price" type="number" min="0" max="9999999999.99" step="0.01" inputMode="decimal" required defaultValue={order ? String(order.total_price) : "0"} aria-invalid={Boolean(fieldErrors.total_price)} aria-describedby={fieldErrors.total_price ? "total_price-error" : undefined} /><FieldError id="total_price-error" message={fieldErrors.total_price} /></label>
        {quick ? <><input type="hidden" name="status" value="draft" /><input type="hidden" name="shoot_status" value="pending" /><input type="hidden" name="backup_status" value="pending" /><input type="hidden" name="editing_status" value="pending" /><input type="hidden" name="delivery_status" value="pending" /><input type="hidden" name="notes" value="" /></> : <label className="grid gap-2 text-sm font-medium" htmlFor="status">订单状态<select id="status" name="status" defaultValue={order?.status ?? "draft"} className={selectClass}>{orderStatuses.map((status) => <option key={status} value={status}>{orderStatusLabels[status]}</option>)}</select></label>}
      </div>
    </section>

    {!quick ? <><section className="grid gap-5 rounded-xl border border-[var(--border)] bg-[var(--background)] p-5 sm:p-6"><div><h2 className="font-semibold">制作进度</h2><p className="mt-1 text-sm text-[var(--muted-foreground)]">制作进度独立于订单状态，用于交接与后续制作提醒。</p></div><div className="grid gap-5 sm:grid-cols-2"><label className="grid gap-2 text-sm font-medium" htmlFor="shoot_status">拍摄状态<select id="shoot_status" name="shoot_status" defaultValue={order?.shoot_status ?? "pending"} className={selectClass}>{orderShootStatuses.map((status) => <option key={status} value={status}>{orderShootStatusLabels[status]}</option>)}</select></label><label className="grid gap-2 text-sm font-medium" htmlFor="backup_status">素材备份<select id="backup_status" name="backup_status" defaultValue={order?.backup_status ?? "pending"} className={selectClass}>{orderBackupStatuses.map((status) => <option key={status} value={status}>{orderBackupStatusLabels[status]}</option>)}</select></label><label className="grid gap-2 text-sm font-medium" htmlFor="editing_status">剪辑状态<select id="editing_status" name="editing_status" defaultValue={order?.editing_status ?? "pending"} className={selectClass}>{orderEditingStatuses.map((status) => <option key={status} value={status}>{orderEditingStatusLabels[status]}</option>)}</select></label><label className="grid gap-2 text-sm font-medium" htmlFor="delivery_status">交付状态<select id="delivery_status" name="delivery_status" defaultValue={order?.delivery_status ?? "pending"} className={selectClass}>{orderDeliveryStatuses.map((status) => <option key={status} value={status}>{orderDeliveryStatusLabels[status]}</option>)}</select></label></div></section><section className="grid gap-5 rounded-xl border border-[var(--border)] bg-[var(--background)] p-5 sm:p-6"><div><h2 className="font-semibold">内部备注</h2><p className="mt-1 text-sm text-[var(--muted-foreground)]">这些信息仅供工作室内部协调使用。</p></div><label className="grid gap-2 text-sm font-medium" htmlFor="notes">内部备注<Textarea id="notes" name="notes" maxLength={2000} defaultValue={order?.notes ?? ""} placeholder="例如拍摄偏好、沟通重点或现场注意事项。" aria-invalid={Boolean(fieldErrors.notes)} aria-describedby={fieldErrors.notes ? "notes-error" : undefined} /><FieldError id="notes-error" message={fieldErrors.notes} /></label></section></> : null}

    <div className="flex flex-col-reverse gap-3 border-t border-[var(--border)] pt-5 sm:flex-row sm:items-center sm:justify-end"><Button type="submit" disabled={isPending}>{isPending ? <SpinnerGap size={18} className="animate-spin" /> : <FloppyDisk size={18} />}{isPending ? "正在保存" : quick ? "建立订单" : order ? "保存修改" : "创建订单"}</Button></div>
  </form>;
}
