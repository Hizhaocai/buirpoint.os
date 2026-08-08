"use client";

import { useState, useTransition } from "react";
import { defaultPermissions, displayName, hasPermission, permissionGroups, permissionLabels } from "@/lib/auth/permission-model";
import { updateMemberProfile } from "@/lib/members/actions";
import type { Member, Permission, Permissions } from "@/types/database";

function effectivePermissions(member: Member): Permissions {
  const defaults = defaultPermissions(member.role);
  return Object.fromEntries((Object.keys(defaults) as Permission[]).map((permission) => [permission, hasPermission(member, permission)])) as Permissions;
}

export function MemberPermissionEditor({ member }: { member: Member }) {
  const [name, setName] = useState(member.display_name ?? member.name ?? "");
  const [permissions, setPermissions] = useState<Permissions>(() => effectivePermissions(member));
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggle(permission: Permission) {
    setPermissions((current) => ({ ...current, [permission]: !current[permission] }));
  }

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const result = await updateMemberProfile(member.id, name, permissions);
      setMessage(result.error ?? result.success ?? null);
    });
  }

  return (
    <details className="border-t border-[var(--border)] pt-3">
      <summary className="cursor-pointer text-sm font-medium text-[var(--primary)] transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]">编辑资料与权限</summary>
      <form onSubmit={save} className="mt-5 grid gap-6 lg:grid-cols-[minmax(12rem,0.7fr)_minmax(0,1.3fr)_auto] lg:items-end">
        <label className="grid gap-2 text-sm">
          <span className="font-medium">显示名称</span>
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder={displayName(member)} maxLength={80} className="h-10 border border-[var(--border-strong)] bg-[var(--background)] px-3 text-sm outline-none transition-colors focus:border-[var(--primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--primary)_18%,transparent)]" />
        </label>
        <div className="grid gap-4 sm:grid-cols-3">
          {permissionGroups.map((group) => (
            <fieldset key={group.label} className="grid content-start gap-2">
              <legend className="text-sm font-medium">{group.label}</legend>
              {group.permissions.map((permission) => (
                <label key={permission} className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                  <input type="checkbox" checked={Boolean(permissions[permission])} onChange={() => toggle(permission)} className="size-4 accent-[var(--primary)]" />
                  {permissionLabels[permission]}
                </label>
              ))}
            </fieldset>
          ))}
        </div>
        <button type="submit" disabled={isPending} className="h-10 border border-[var(--border-strong)] px-4 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--secondary)] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]">保存</button>
        {message ? <p role="status" className="text-sm text-[var(--muted-foreground)] lg:col-span-3">{message}</p> : null}
      </form>
    </details>
  );
}
