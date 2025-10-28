import { AdBanner } from "./AdBanner";

export function AdContentTop() {
  return (
    <div className="mb-6">
      <AdBanner slot="CONTENT_TOP_SLOT" format="horizontal" style={{ minHeight: 90 }}>
        <div className="flex h-full w-full items-center justify-center rounded-md border border-dashed border-border bg-muted p-3 text-xs text-muted-foreground">
          مساحة إعلانية (728x90)
        </div>
      </AdBanner>
    </div>
  );
}
