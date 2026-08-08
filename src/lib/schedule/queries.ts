import { requireProfile } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import type { PublicOrderSchedule } from "@/types/database";

export type ScheduleFilters = {
  start: string;
  end: string;
  cameraId?: string;
};

const scheduleFields = "id, shoot_date, project_name, shoot_location, assigned_camera_id, assigned_camera_name, assigned_camera_ids, assigned_cameras, status";

/**
 * A read-only time view derived from orders. The public view intentionally
 * excludes contact details, pricing, notes, and attachments.
 */
export async function getScheduleOrders({ start, end, cameraId }: ScheduleFilters) {
  await requireProfile();
  const supabase = await createClient();
  let query = supabase
    .from("order_schedule_public")
    .select(scheduleFields)
    .gte("shoot_date", start)
    .lte("shoot_date", end)
    .order("shoot_date", { ascending: true });

  if (cameraId) query = query.contains("assigned_camera_ids", [cameraId]);

  const { data, error } = await query.returns<PublicOrderSchedule[]>();
  if (error) throw new Error("无法读取档期安排。");
  return data;
}
