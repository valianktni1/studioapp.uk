import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Lock, User, Eye, EyeOff, Upload, Mail } from "lucide-react";
import { checkSetup, setupAdmin, loginAdmin, uploadLogo, forgotPassword } from "@/lib/api";
import { useBranding, BrandMark } from "@/lib/branding";
import { PlatformFooter } from "@/components/PlatformFooter";
import { SuspendedNotice } from "@/components/SuspendedNotice";

function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

const inputCls = "border-0 border-b border-[#D4D4D8] bg-transparent rounded-none px-0 py-3 focus-visible:ring-0 focus-visible:border-[#1C1917] placeholder:text-[#A8A29E] text-base";
const labelCls = "text-xs tracking-[0.15em] uppercase font-semibold";

export default function AdminLogin() {
  const navigate = useNavigate();
  const { branding, refresh } = useBranding();
  const [needsSetup, setNeedsSetup] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [needs2FA, setNeeds2FA] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [form, setForm] = useState({ username: "", password: "", business_name: "", email: "", accent_color: "#D4AF37" });

  const handleLogoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (token) {
      if (isTokenExpired(token)) {
        localStorage.removeItem("admin_token");
        toast.info("Session expired. Please log in again.");
      } else {
        navigate("/admin/dashboard");
        return;
      }
    }
    checkSetup().then(r => setNeedsSetup(!r.data.setup_complete)).catch(() => setNeedsSetup(true));
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (needsSetup) {
        const res = await setupAdmin(form);
        localStorage.setItem("admin_token", res.data.token);
        if (logoFile) {
          try { await uploadLogo(logoFile); } catch { /* non-blocking */ }
        }
        await refresh();
        toast.success("Your gallery is ready");
        navigate("/admin/dashboard");
        return;
      }
      const res = await loginAdmin({
        username: form.username,
        password: form.password,
        totp_code: needs2FA ? totpCode : undefined
      });
      if (res.data.requires_2fa) {
        setNeeds2FA(true);
        setLoading(false);
        return;
      }
      localStorage.setItem("admin_token", res.data.token);
      toast.success("Welcome back");
      navigate("/admin/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Authentication failed");
      if (needs2FA) setTotpCode("");
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await forgotPassword({ email: forgotEmail, origin: window.location.origin });
      setForgotSent(true);
    } catch {
      setForgotSent(true); // generic response either way
    } finally {
      setLoading(false);
    }
  };

  if (needsSetup === null) return null;
  if (branding.suspended) return <SuspendedNotice />;

  const heroTitle = needsSetup ? "Welcome" : "Gallery Admin";

  return (
    <div className="min-h-screen flex relative noise-bg" style={{ backgroundColor: '#FDFCF8' }}>
      {/* Left - Hero */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1624635446269-ea81d79bbc30?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA0MTJ8MHwxfHNlYXJjaHwyfHx3ZWRkaW5nJTIwY291cGxlJTIwc3Vuc2V0JTIwcm9tYW50aWMlMjBhcnRpc3RpY3xlbnwwfHx8fDE3NzEzNjM2MTR8MA&ixlib=rb-4.1.0&q=85"
          alt="Wedding couple at sunset"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute bottom-12 left-12 right-12 text-white">
          <p className="text-sm tracking-[0.2em] uppercase font-semibold mb-3" style={{ fontFamily: 'Manrope, sans-serif' }}>{heroTitle}</p>
          <h1 className="text-5xl font-light italic leading-tight" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            Couples Gallery<br />Management System
          </h1>
        </div>
      </div>

      {/* Right - Form */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-16">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-16">
            <BrandMark heightClass="h-10" textClass="text-3xl" />
          </div>

          {forgotMode ? (
            /* ─── Forgot Password ─── */
            <>
              <h2 className="text-4xl md:text-5xl mb-3 font-medium" style={{ fontFamily: 'Cormorant Garamond, serif' }}>Reset Password</h2>
              {forgotSent ? (
                <div data-testid="forgot-sent" className="mt-8">
                  <p className="text-base mb-8" style={{ color: '#57534E', fontFamily: 'Manrope, sans-serif' }}>
                    If that email is on file, we've sent a password reset link. Please check your inbox (and spam) — the link is valid for 1 hour.
                  </p>
                  <button type="button" onClick={() => { setForgotMode(false); setForgotSent(false); }} className="text-sm text-[#57534E] hover:text-[#1C1917]" style={{ fontFamily: 'Manrope, sans-serif' }}>← Back to sign in</button>
                </div>
              ) : (
                <form onSubmit={handleForgot} className="space-y-8 mt-8">
                  <p className="text-base" style={{ color: '#57534E', fontFamily: 'Manrope, sans-serif' }}>Enter your account email and we'll send you a reset link.</p>
                  <div className="space-y-2">
                    <Label className={labelCls} style={{ color: '#57534E' }}>Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-0 top-3.5 w-4 h-4 text-[#A8A29E]" />
                      <Input data-testid="forgot-email" type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} className={inputCls + " pl-6"} placeholder="you@yourstudio.com" required />
                    </div>
                  </div>
                  <Button data-testid="forgot-submit-btn" type="submit" disabled={loading} className="w-full bg-[#1C1917] text-[#FDFCF8] hover:bg-[#1C1917]/90 rounded-sm px-8 py-6 text-xs tracking-[0.2em] uppercase font-bold">
                    {loading ? "Sending..." : "Send Reset Link"}
                  </Button>
                  <button type="button" onClick={() => setForgotMode(false)} className="w-full text-center text-sm text-[#57534E] hover:text-[#1C1917]" style={{ fontFamily: 'Manrope, sans-serif' }}>← Back to sign in</button>
                </form>
              )}
            </>
          ) : (
            <>
              <h2 className="text-4xl md:text-5xl mb-3 font-medium" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                {needs2FA ? "Verification" : needsSetup ? "Set Up Your Gallery" : "Sign In"}
              </h2>
              <p className="text-base mb-12" style={{ color: '#57534E', fontFamily: 'Manrope, sans-serif' }}>
                {needs2FA ? "Enter the 6-digit code from your authenticator app"
                  : needsSetup ? "Create your admin account and brand your gallery"
                    : "Enter your credentials to continue"}
              </p>

              <form onSubmit={handleSubmit} className="space-y-8">
                {needs2FA ? (
                  <>
                    <div className="space-y-2">
                      <Label className={labelCls} style={{ color: '#57534E' }}>Authentication Code</Label>
                      <div className="relative">
                        <Lock className="absolute left-0 top-3.5 w-4 h-4 text-[#A8A29E]" />
                        <Input data-testid="totp-code" type="text" inputMode="numeric" maxLength={8} autoComplete="one-time-code" autoFocus value={totpCode}
                          onChange={e => setTotpCode(e.target.value.replace(/[^0-9A-Fa-f]/g, ''))}
                          className={inputCls + " pl-6 text-2xl tracking-[0.5em] text-center"} style={{ fontFamily: 'monospace' }} placeholder="000000" required />
                      </div>
                      <p className="text-xs mt-2" style={{ color: '#A8A29E', fontFamily: 'Manrope, sans-serif' }}>Or enter a recovery code</p>
                    </div>
                    <Button data-testid="verify-2fa-btn" type="submit" disabled={loading || totpCode.length < 6} className="w-full bg-[#1C1917] text-[#FDFCF8] hover:bg-[#1C1917]/90 rounded-sm px-8 py-6 text-xs tracking-[0.2em] uppercase font-bold">
                      {loading ? "Verifying..." : "Verify"}
                    </Button>
                    <button type="button" onClick={() => { setNeeds2FA(false); setTotpCode(""); }} className="w-full text-center text-sm text-[#57534E] hover:text-[#1C1917]" style={{ fontFamily: 'Manrope, sans-serif' }}>Back to sign in</button>
                  </>
                ) : (
                  <>
                    {needsSetup && (
                      <>
                        <div className="space-y-2">
                          <Label className={labelCls} style={{ color: '#57534E' }}>Business Name</Label>
                          <Input data-testid="setup-business-name" value={form.business_name} onChange={e => setForm(f => ({ ...f, business_name: e.target.value }))} className={inputCls} style={{ fontFamily: 'Manrope, sans-serif' }} placeholder="Your studio / business name" required />
                        </div>
                        <div className="space-y-2">
                          <Label className={labelCls} style={{ color: '#57534E' }}>Email (for password resets)</Label>
                          <div className="relative">
                            <Mail className="absolute left-0 top-3.5 w-4 h-4 text-[#A8A29E]" />
                            <Input data-testid="setup-email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inputCls + " pl-6"} placeholder="you@yourstudio.com" required />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 items-end">
                          <div className="space-y-2">
                            <Label className={labelCls} style={{ color: '#57534E' }}>Accent Colour</Label>
                            <div className="flex items-center gap-2">
                              <input data-testid="setup-accent-color" type="color" value={form.accent_color} onChange={e => setForm(f => ({ ...f, accent_color: e.target.value }))} className="h-10 w-12 rounded-sm border border-[#D4D4D8] cursor-pointer bg-transparent" />
                              <span className="text-sm font-mono" style={{ color: '#57534E' }}>{form.accent_color}</span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className={labelCls} style={{ color: '#57534E' }}>Logo (optional)</Label>
                            <label className="flex items-center gap-2 cursor-pointer text-sm text-[#57534E] hover:text-[#1C1917] border-b border-[#D4D4D8] py-2.5" style={{ fontFamily: 'Manrope, sans-serif' }}>
                              {logoPreview ? <img src={logoPreview} alt="logo preview" className="h-6 max-w-[120px] object-contain" /> : <><Upload className="w-4 h-4" /> Upload logo</>}
                              <input data-testid="setup-logo-upload" type="file" accept="image/*" className="hidden" onChange={handleLogoSelect} />
                            </label>
                          </div>
                        </div>
                      </>
                    )}

                    <div className="space-y-2">
                      <Label className={labelCls} style={{ color: '#57534E' }}>Username</Label>
                      <div className="relative">
                        <User className="absolute left-0 top-3.5 w-4 h-4 text-[#A8A29E]" />
                        <Input data-testid="login-username" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} className={inputCls + " pl-6"} style={{ fontFamily: 'Manrope, sans-serif' }} placeholder="Enter username" required />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className={labelCls} style={{ color: '#57534E' }}>Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-0 top-3.5 w-4 h-4 text-[#A8A29E]" />
                        <Input data-testid="login-password" type={showPassword ? "text" : "password"} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className={inputCls + " pl-6 pr-10"} style={{ fontFamily: 'Manrope, sans-serif' }} placeholder="Enter password" required />
                        <button type="button" onClick={() => setShowPassword(s => !s)} className="absolute right-0 top-3 text-[#A8A29E] hover:text-[#1C1917]">
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <Button data-testid="login-submit-btn" type="submit" disabled={loading} className="w-full bg-[#1C1917] text-[#FDFCF8] hover:bg-[#1C1917]/90 rounded-sm px-8 py-6 text-xs tracking-[0.2em] uppercase font-bold">
                      {loading ? "Please wait..." : (needsSetup ? "Create My Gallery" : "Sign In")}
                    </Button>

                    {!needsSetup && (
                      <button type="button" data-testid="forgot-password-link" onClick={() => setForgotMode(true)} className="w-full text-center text-sm text-[#57534E] hover:text-[#1C1917]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        Forgot your password?
                      </button>
                    )}
                  </>
                )}
              </form>
            </>
          )}
        </motion.div>
        <PlatformFooter className="absolute bottom-0 left-0 right-0" />
      </div>
    </div>
  );
}
