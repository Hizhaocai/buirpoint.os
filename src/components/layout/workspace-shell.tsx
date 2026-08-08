import { AppSidebar } from "@/components/layout/app-sidebar";
import { MobileNavigation } from "@/components/layout/mobile-navigation";
import type { Profile } from "@/types/database";

export function WorkspaceShell({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-[var(--canvas)]">
      <MobileNavigation profile={profile} />
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-[1600px] md:min-h-[100dvh]">
        <AppSidebar profile={profile} className="hidden min-h-[100dvh] self-stretch md:flex" />
        <main className="w-full min-w-0 px-4 py-6 sm:px-7 sm:py-7 md:w-auto md:flex-1 lg:px-12 xl:px-16 md:py-9">
          <div className="mx-auto w-full max-w-[1400px]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
