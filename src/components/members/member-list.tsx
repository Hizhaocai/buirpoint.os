import { MemberActions } from "@/components/members/member-actions";
import { MemberPermissionEditor } from "@/components/members/member-permission-editor";
import { displayName, hasPermission, permissionLabels } from "@/lib/auth/permission-model";
import type { Member, Permission } from "@/types/database";

const roleLabels = { owner: "管理员", camera: "摄像师" } as const;
const summaryPermissions: Permission[] = ["orders_create", "orders_edit", "orders_delete", "attachments_manage", "members_manage"];

export function MemberList({ members }: { members: Member[] }) {
  return (
    <section aria-labelledby="member-list-heading" className="border-y border-[var(--border)]">
      <h2 id="member-list-heading" className="sr-only">工作室成员</h2>
      <ul className="divide-y divide-[var(--border)]">
        {members.map((member) => {
          const inactive = member.status === "disabled";
          const name = displayName(member);
          const permissions = summaryPermissions.filter((permission) => hasPermission(member, permission)).map((permission) => permissionLabels[permission]);
          return (
            <li key={member.id} className={`py-5 ${inactive ? "opacity-55" : ""}`}>
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div className="flex min-w-0 items-center gap-3.5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--primary)] text-xs font-semibold text-white">{name.slice(0, 1).toUpperCase()}</span>
                  <div className="min-w-0">
                    <h3 className="truncate font-medium">{name}</h3>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]"><span>{roleLabels[member.role]}</span><span className="mx-2 text-[var(--border-strong)]">/</span><span>{inactive ? "已停用" : "正常"}</span></p>
                    <p className="mt-1.5 text-xs text-[var(--muted-foreground)]">权限：{permissions.length ? permissions.join("、") : "无业务权限"}</p>
                  </div>
                </div>
                <MemberActions member={member} />
              </div>
              <div className="mt-4 pl-0 sm:pl-[3.25rem]">
                <MemberPermissionEditor member={member} />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
