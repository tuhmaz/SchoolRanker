import { useEffect, useRef, type CSSProperties } from "react";
import { ADSENSE_CLIENT_ID } from "@/config/ads";
import { cn } from "@/lib/utils";

interface AdSlotProps {
  slot: string;
  className?: string;
  format?: string;
  layout?: string;
  fullWidthResponsive?: boolean;
  showLabel?: boolean;
  skeleton?: boolean;
  insStyle?: CSSProperties;
}

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

const scriptId = "adsense-sdk";

export function AdSlot({
  slot,
  className,
  format = "auto",
  layout,
  fullWidthResponsive = true,
  showLabel = true,
  skeleton = false,
  insStyle,
}: AdSlotProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ADSENSE_CLIENT_ID || !slot) return;
    if (typeof window === "undefined") return;

    const ensureScript = () => {
      return new Promise<void>((resolve, reject) => {
        if (document.getElementById(scriptId)) {
          resolve();
          return;
        }

        const script = document.createElement("script");
        script.id = scriptId;
        script.async = true;
        script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`;
        script.crossOrigin = "anonymous";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load Google AdSense"));
        document.head.appendChild(script);
      });
    };

    const loadAd = () => {
      try {
        window.adsbygoogle = window.adsbygoogle || [];
        window.adsbygoogle.push({});
      } catch (error) {
        console.warn("AdSense push error", error);
      }
    };

    ensureScript()
      .then(() => {
        const container = containerRef.current;
        const ad = container?.querySelector<HTMLModElement>("ins.adsbygoogle");
        if (!ad) return;
        // Reset the ad slot before pushing a new request
        ad.innerHTML = "";
        loadAd();
      })
      .catch((error) => {
        console.warn(error);
      });
  }, [slot]);

  const slotConfigured = typeof slot === "string" && slot.trim().length > 0;
  const shouldRenderPlaceholder = !ADSENSE_CLIENT_ID || !slotConfigured;
  const isDev = import.meta.env.DEV;

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative overflow-hidden rounded-lg border border-border/60 bg-background/40 px-4 py-3 text-center",
        className,
        shouldRenderPlaceholder ? "flex flex-col items-center justify-center gap-2" : "",
      )}
      aria-label="مساحة إعلانية"
    >
      {showLabel ? (
        <span className="absolute left-4 top-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          إعلان
        </span>
      ) : null}
      {shouldRenderPlaceholder ? (
        isDev ? (
          <div className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
            <span>مساحة إعلانية</span>
            <span className="text-[10px] text-muted-foreground/70">(ستظهر هنا بعد ربط AdSense)</span>
          </div>
        ) : (
          <div className="inline-flex items-center rounded-md bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
            جار تحميل الإعلان…
          </div>
        )
      ) : (
        <>
          {skeleton ? (
            <div className="h-5 animate-pulse rounded-md bg-muted" />
          ) : null}
          <ins
            className="adsbygoogle"
            style={{ display: "block", minHeight: "120px", ...insStyle }}
            data-ad-client={ADSENSE_CLIENT_ID}
            data-ad-slot={slot}
            data-ad-format={format}
            {...(layout ? { "data-ad-layout": layout } : {})}
            {...(fullWidthResponsive ? { "data-full-width-responsive": "true" } : {})}
          />
        </>
      )}
    </div>
  );
}
