export const ADSENSE_CLIENT_ID = import.meta.env.VITE_ADSENSE_CLIENT_ID ?? "";

export const AD_SLOTS = {
  homeHero: import.meta.env.VITE_ADSENSE_SLOT_HOME_HERO ?? "",
  homeInline: import.meta.env.VITE_ADSENSE_SLOT_HOME_INLINE ?? "",
  sidebar: import.meta.env.VITE_ADSENSE_SLOT_SIDEBAR ?? "",
  footer: import.meta.env.VITE_ADSENSE_SLOT_FOOTER ?? "",
  contentInline: import.meta.env.VITE_ADSENSE_SLOT_CONTENT_INLINE ?? "",
} as const;
