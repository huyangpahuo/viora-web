import { PluginGridSkeleton } from "@/components/plugin-grid";

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      <div className="h-5 w-24 rounded bg-muted/60" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <div className="aspect-[16/10] rounded-2xl bg-muted/50" />
        <div className="space-y-3 rounded-2xl border p-5">
          <div className="h-7 w-2/3 rounded bg-muted/70" />
          <div className="h-4 w-1/3 rounded bg-muted/50" />
          <div className="h-4 w-1/2 rounded bg-muted/50" />
          <div className="h-9 w-full rounded-lg bg-muted/60" />
          <div className="h-9 w-full rounded-lg bg-muted/40" />
        </div>
      </div>
      <PluginGridSkeleton count={6} />
    </div>
  );
}
