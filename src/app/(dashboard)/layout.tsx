import { requireProfile } from "@/lib/auth/guards";
import { WorkspaceShell } from "@/components/layout/workspace-shell";

export default async function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { profile } = await requireProfile();
  return <WorkspaceShell profile={profile}>{children}</WorkspaceShell>;
}
