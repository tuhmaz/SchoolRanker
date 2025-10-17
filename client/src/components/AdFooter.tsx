import { AdBanner } from "./AdBanner";

export function AdFooter() {
  return (
    <footer className="border-t border-border bg-card p-4 mt-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
          <div className="w-full md:w-auto">
            <AdBanner
              slot="FOOTER_SLOT_1"
              format="horizontal"
              style={{ minHeight: 90 }}
            >
              <div className="flex h-full w-full items-center justify-center rounded-md border border-dashed border-border bg-muted text-xs text-muted-foreground p-3">
                مساحة إعلانية (728x90)
              </div>
            </AdBanner>
          </div>
        </div>
      </div>
    </footer>
  );
}
