import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

interface AdBannerProps {
  slot: string;
  format?: string;
  layout?: string;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

export function AdBanner({
  slot,
  format = "auto",
  layout,
  className,
  style,
  children,
}: AdBannerProps) {
  const elementRef = useRef<HTMLModElement | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const element = elementRef.current;
    if (!element) return;
    const hasRenderedAd = element.getAttribute("data-adsbygoogle-status") === "done";
    if (hasRenderedAd) {
      if (!loaded) setLoaded(true);
      return;
    }
    const minSlotWidth = 160;

    const loadAd = (width: number) => {
      if (loaded) return;
      if (element.getAttribute("data-adsbygoogle-status") === "done") {
        setLoaded(true);
        return;
      }
      if (width < minSlotWidth) return;
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        setLoaded(true);
      } catch {}
    };

    const width = element.getBoundingClientRect().width;
    loadAd(width);

    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        loadAd(entry.contentRect.width);
      }
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [loaded]);

  const classes = ["adsbygoogle", className].filter(Boolean).join(" ");

  return (
    <ins
      ref={elementRef}
      className={classes}
      style={{ display: "block", width: "100%", ...style }}
      data-ad-client="ca-pub-5170334485305985"
      data-ad-slot={slot}
      data-ad-format={format}
      data-ad-layout={layout}
      data-full-width-responsive="true"
    >
      {children}
    </ins>
  );
}
