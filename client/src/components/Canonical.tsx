import { useEffect } from "react";
import { useLocation } from "wouter";

/**
 * Injects a per-route canonical <link> and updates og:url and twitter:url
 * to help Google index the correct URL without treating pages as redirects/duplicates.
 */
export function Canonical() {
  const [location] = useLocation();

  // Always point canonical to production domain for consistency
  const BASE = "https://khadmatak.com";
  const href = `${BASE}${location || "/"}`;

  useEffect(() => {
    // Ensure canonical link exists and points to the current route
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", href);

    // Update Open Graph and Twitter URL to reflect the current route
    const ogUrl = document.querySelector<HTMLMetaElement>('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute("content", href);

    const twUrl = document.querySelector<HTMLMetaElement>('meta[name="twitter:url"]');
    if (twUrl) twUrl.setAttribute("content", href);
  }, [href]);

  return null;
}