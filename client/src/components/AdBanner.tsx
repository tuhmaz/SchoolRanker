import { useEffect, type CSSProperties, type ReactNode } from "react";

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
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {}
  }, []);

  const classes = ["adsbygoogle", className].filter(Boolean).join(" ");

  return (
    <ins
      className={classes}
      style={{ display: "block", width: "100%", ...style }}
      data-ad-client="YOUR_ADSENSE_CLIENT_ID"
      data-ad-slot={slot}
      data-ad-format={format}
      data-ad-layout={layout}
    >
      {children}
    </ins>
  );
}
