import { AdBanner } from "./AdBanner";

export function AdSidebar() {
  return (
    <aside className="hidden lg:block w-80 border-l border-border bg-card p-4 overflow-y-auto">
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">الإعلانات</h3>
          <AdBanner
            slot="SIDEBAR_SLOT_1"
            format="vertical"
            style={{ minHeight: 600 }}
          >
            <div className="flex h-full w-full items-center justify-center rounded-md border border-dashed border-border bg-muted text-xs text-muted-foreground p-3">
              مساحة إعلانية (300x600)
            </div>
          </AdBanner>
        </div>

        <div>
          <AdBanner
            slot="SIDEBAR_SLOT_2"
            format="vertical"
            style={{ minHeight: 300 }}
          >
            <div className="flex h-full w-full items-center justify-center rounded-md border border-dashed border-border bg-muted text-xs text-muted-foreground p-3">
              مساحة إعلانية (300x300)
            </div>
          </AdBanner>
        </div>
      </div>
    </aside>
  );
}
