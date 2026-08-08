export type UserRole = "owner" | "camera";
export type UserStatus = "active" | "disabled";
export type OrderStatus = "draft" | "confirmed" | "completed" | "cancelled";
export type OrderShootStatus = "pending" | "completed";
export type OrderBackupStatus = "pending" | "uploaded" | "confirmed";
export type OrderEditingStatus = "pending" | "editing" | "completed";
export type OrderDeliveryStatus = "pending" | "delivered";
export type OrderSourceType = "wedding_company" | "direct_customer";
export type OrderCameraRole = "primary" | "secondary";
export type Permission = "orders_view" | "orders_create" | "orders_edit" | "orders_delete" | "attachments_manage" | "members_manage";
export type Permissions = Partial<Record<Permission, boolean>>;

export interface Profile {
  id: string;
  email: string;
  name: string | null;
  display_name: string | null;
  permissions: Permissions;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

export type Member = Pick<Profile, "id" | "name" | "display_name" | "permissions" | "role" | "status" | "created_at">;
export type AssignableCamera = Pick<Profile, "id" | "display_name" | "role">;

export interface Order {
  id: string;
  project_name: string;
  client_name: string;
  contact_name: string | null;
  contact_phone: string | null;
  shoot_date: string | null;
  total_price: number | string;
  status: OrderStatus;
  notes: string | null;
  assigned_camera_id: string | null;
  source_type: OrderSourceType;
  source_name: string;
  shoot_location: string | null;
  shoot_status: OrderShootStatus;
  backup_status: OrderBackupStatus;
  editing_status: OrderEditingStatus;
  delivery_status: OrderDeliveryStatus;
  created_by: string;
  deleted_at: string | null;
  deleted_by: string | null;
  created_at: string;
  updated_at: string;
}

export type OrderCameraAssignment = {
  id: string;
  order_id: string;
  camera_id: string;
  role: OrderCameraRole;
  camera: Pick<Profile, "id" | "name" | "display_name" | "email"> | null;
};

export type OrderWithCamera = Order & {
  assigned_camera: Pick<Profile, "id" | "name" | "display_name" | "email"> | null;
  camera_assignments: OrderCameraAssignment[];
};

export type OrderHistoryItem = Pick<Order, "id" | "project_name" | "shoot_date" | "status" | "total_price">;
export type SourceSummaryItem = { source_type: OrderSourceType; source_name: string; order_count: number };

export interface PublicOrderSchedule {
  id: string;
  shoot_date: string;
  project_name: string;
  shoot_location: string | null;
  assigned_camera_id: string | null;
  assigned_camera_name: string | null;
  assigned_camera_ids: string[];
  assigned_cameras: Array<{ id: string; name: string; role: OrderCameraRole }>;
  status: OrderStatus;
}

export interface OrderAttachment {
  id: string;
  order_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  uploaded_by: string;
  created_at: string;
  uploader: Pick<Profile, "id" | "name" | "email"> | null;
}

export type OrderLogAction = "created" | "client_changed" | "status_changed" | "shoot_date_changed" | "camera_changed" | "camera_assigned" | "camera_removed" | "price_changed" | "attachment_uploaded" | "attachment_deleted" | "deleted" | "restored" | "wedding_company_changed" | "shoot_location_changed" | "shoot_status_changed" | "backup_status_changed" | "editing_status_changed" | "delivery_status_changed" | "source_changed";

export interface OrderLog {
  id: string;
  order_id: string | null;
  actor_id: string | null;
  action: OrderLogAction;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  created_at: string;
  actor: Pick<Profile, "id" | "name" | "email"> | null;
}
