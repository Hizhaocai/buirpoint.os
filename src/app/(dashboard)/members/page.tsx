import { MemberList } from "@/components/members/member-list";
import { requirePermission } from "@/lib/auth/permissions";
import { getMembers } from "@/lib/members/queries";

export default async function MembersPage() {
  await requirePermission("members_manage");
  const members = await getMembers();

  return (
    <div className="mx-auto max-w-[1120px]">
      <header className="border-b border-[var(--border)] pb-5">
        <p className="text-xs font-medium tracking-[0.16em] text-[var(--primary)]">ACCESS</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">成员。</h1>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">管理可以进入工作室系统的成员。</p>
      </header>
      <div className="mt-6">
        <MemberList members={members} />
      </div>
    </div>
  );
}
