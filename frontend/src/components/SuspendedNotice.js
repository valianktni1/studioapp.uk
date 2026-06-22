import { Lock } from "lucide-react";
import { BrandMark, useBranding } from "@/lib/branding";
import { PlatformFooter } from "@/components/PlatformFooter";

export function SuspendedNotice() {
  const { branding } = useBranding();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 noise-bg" style={{ backgroundColor: "#FDFCF8" }}
      data-testid="suspended-notice">
      <div className="flex-1 flex flex-col items-center justify-center text-center max-w-md">
        <div className="mb-8">
          <BrandMark heightClass="h-12" textClass="text-4xl" />
        </div>
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6"
          style={{ backgroundColor: "rgba(var(--brand-rgb),0.12)" }}>
          <Lock className="w-7 h-7" style={{ color: "var(--brand)" }} />
        </div>
        <h1 className="text-3xl md:text-4xl font-light italic mb-4"
          style={{ fontFamily: "Cormorant Garamond, serif", color: "#1C1917" }}>
          Temporarily Unavailable
        </h1>
        <p className="text-base" style={{ color: "#57534E", fontFamily: "Manrope, sans-serif" }}>
          {branding.suspend_message || "This gallery is temporarily unavailable. Please check back soon."}
        </p>
      </div>
      <PlatformFooter />
    </div>
  );
}

export default SuspendedNotice;
