import { Button } from "@/components/ui/button";
import type { AssignableCamera } from "@/types/database";

export function ScheduleFilters({ month, cameraId, cameras }: { month: string; cameraId?: string; cameras: AssignableCamera[] }) {
  return (
    <form action="/schedule" className="flex items-end gap-2">
      <input type="hidden" name="month" value={month} />
      <label className="grid gap-1.5 text-xs font-medium text-[var(--muted-foreground)]">
        摄像人员
        <select
          name="camera"
          defaultValue={cameraId ?? ""}
          className="h-10 min-w-36 border border-[var(--border-strong)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] outline-none transition-colors focus:border-[var(--primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--primary)_18%,transparent)]"
        >
          <option value="">全部摄像师</option>
          {cameras.map((camera) => (
            <option key={camera.id} value={camera.id}>{camera.display_name}</option>
          ))}
        </select>
      </label>
      <Button type="submit" variant="secondary" className="h-10">筛选</Button>
    </form>
  );
}
