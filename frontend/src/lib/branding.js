import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { getSettings } from "@/lib/api";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";

const DEFAULT_BRANDING = {
  business_name: "Wedding Gallery",
  accent_color: "#D4AF37",
  contact_email: "",
  website: "",
  logo_url: null,
  has_custom_logo: false,
  platform_credit: "App designed & hosted by Weddings By Mark",
  suspended: false,
  suspend_message: "This gallery is temporarily unavailable.",
};

const BrandingContext = createContext({
  branding: DEFAULT_BRANDING,
  loading: true,
  refresh: () => {},
  logoSrc: "/logo.png",
});

// Convert a hex colour (#RRGGBB) into an "r, g, b" triplet string for rgba() usage.
export function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || "");
  if (!m) return "212, 175, 55";
  return `${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}`;
}

export function applyBrandColors(accentColor) {
  const root = document.documentElement;
  root.style.setProperty("--brand", accentColor || "#D4AF37");
  root.style.setProperty("--brand-rgb", hexToRgb(accentColor));
}

export function BrandingProvider({ children }) {
  const [branding, setBranding] = useState(DEFAULT_BRANDING);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await getSettings();
      const data = { ...DEFAULT_BRANDING, ...res.data };
      setBranding(data);
      applyBrandColors(data.accent_color);
      if (data.business_name) document.title = data.business_name;
    } catch {
      applyBrandColors(DEFAULT_BRANDING.accent_color);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const logoSrc = branding.logo_url ? `${BACKEND_URL}${branding.logo_url}` : "/logo.png";

  return (
    <BrandingContext.Provider value={{ branding, loading, refresh, logoSrc }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingContext);
}

// Renders the uploaded logo when present, otherwise a neutral text wordmark of the
// business name — so the original "Weddings By Mark" asset never leaks to white-label tenants.
export function BrandMark({ heightClass = "h-8", textClass = "text-2xl", color, className = "", imgStyle }) {
  const { branding, logoSrc } = useBranding();
  if (branding.has_custom_logo) {
    return (
      <img
        src={logoSrc}
        alt={branding.business_name}
        data-testid="brand-logo"
        className={`${heightClass} object-contain ${className}`}
        style={imgStyle}
      />
    );
  }
  return (
    <span
      data-testid="brand-wordmark"
      className={`font-medium leading-none ${textClass} ${className}`}
      style={{ fontFamily: "Cormorant Garamond, serif", color: color || "#1C1917", letterSpacing: "0.02em" }}
    >
      {branding.business_name}
    </span>
  );
}
