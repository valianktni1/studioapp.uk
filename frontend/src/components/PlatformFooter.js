import { useBranding } from "@/lib/branding";

// Platform provider credit — always shown, NOT the customer's branding.
export function PlatformFooter({ className = "", dark = false }) {
  const { branding } = useBranding();
  return (
    <footer
      data-testid="platform-footer"
      className={`w-full text-center py-4 text-xs tracking-wide ${className}`}
      style={{
        fontFamily: "Manrope, sans-serif",
        color: dark ? "rgba(255,255,255,0.45)" : "#A8A29E",
      }}
    >
      {branding.platform_credit || "App designed & hosted by Weddings By Mark"}
    </footer>
  );
}

export default PlatformFooter;
