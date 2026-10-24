import { PluginGridSkeleton } from "@/components/plugin-grid";

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6">
      <div className="space-y-2 pt-2">
        <div className="h-8 w-64 rounded bg-muted/70" />
        <div className="h-4 w-96 max-w-full rounded bg-muted/50" />
      </div>
      <PluginGridSkeleton />
    </div>
  );
}
