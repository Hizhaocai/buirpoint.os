import { createClient } from "@/lib/supabase/server";

export async function validateActiveCameraAssignments(cameraIds: string[]) {
  if (!cameraIds.length) return true;
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("id").in("id", cameraIds).eq("role", "camera").eq("status", "active");
  return !error && (data?.length ?? 0) === cameraIds.length;
}

export async function replaceOrderCameraAssignments(orderId: string, primaryCameraId: string | null, secondaryCameraIds: string[]) {
  const supabase = await createClient();
  const { error: deleteError } = await supabase.from("order_camera_assignments").delete().eq("order_id", orderId);
  if (deleteError) return deleteError;
  const assignments = [
    ...(primaryCameraId ? [{ order_id: orderId, camera_id: primaryCameraId, role: "primary" as const }] : []),
    ...secondaryCameraIds.map((camera_id) => ({ order_id: orderId, camera_id, role: "secondary" as const })),
  ];
  if (!assignments.length) return null;
  const { error } = await supabase.from("order_camera_assignments").insert(assignments);
  return error;
}
