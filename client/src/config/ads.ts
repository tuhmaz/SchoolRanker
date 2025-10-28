const trim = (value: string | undefined) => (typeof value === "string" ? value.trim() : "");

const FALLBACK_CLIENT_ID = "ca-pub-5170334485305985";

const FALLBACK_SLOTS = {
  homeHero: "8407774412",
  homeInline: "9691436428",
  sidebar: "9691436428",
  footer: "9691436428",
  contentInline: "6130763738",
} as const;

export const ADSENSE_CLIENT_ID = trim(import.meta.env.VITE_ADSENSE_CLIENT_ID) || FALLBACK_CLIENT_ID;

export const AD_SLOTS = {
  homeHero: trim(import.meta.env.VITE_ADSENSE_SLOT_HOME_HERO) || FALLBACK_SLOTS.homeHero,
  homeInline: trim(import.meta.env.VITE_ADSENSE_SLOT_HOME_INLINE) || FALLBACK_SLOTS.homeInline,
  sidebar: trim(import.meta.env.VITE_ADSENSE_SLOT_SIDEBAR) || FALLBACK_SLOTS.sidebar,
  footer: trim(import.meta.env.VITE_ADSENSE_SLOT_FOOTER) || FALLBACK_SLOTS.footer,
  contentInline: trim(import.meta.env.VITE_ADSENSE_SLOT_CONTENT_INLINE) || FALLBACK_SLOTS.contentInline,
} as const;
