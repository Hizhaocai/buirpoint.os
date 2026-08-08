import type { OrderCameraAssignment, PublicOrderSchedule } from "@/types/database";

export function cameraDisplayName(camera: OrderCameraAssignment["camera"]) {
  return camera?.display_name ?? camera?.name ?? camera?.email ?? "未命名摄像师";
}

export function formatOrderCameraTeam(assignments: OrderCameraAssignment[]) {
  return assignments
    .slice()
    .sort((a, b) => (a.role === "primary" ? -1 : 1) - (b.role === "primary" ? -1 : 1))
    .map((assignment) => `${cameraDisplayName(assignment.camera)}（${assignment.role === "primary" ? "主" : "副"}）`)
    .join(" · ");
}

export function formatScheduleCameraTeam(order: Pick<PublicOrderSchedule, "assigned_cameras" | "assigned_camera_name">) {
  if (order.assigned_cameras?.length) {
    return order.assigned_cameras
      .map((camera) => `${camera.name}（${camera.role === "primary" ? "主" : "副"}）`)
      .join(" · ");
  }
  return order.assigned_camera_name ?? "未分配摄像人员";
}
