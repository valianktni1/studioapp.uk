import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Lock, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { resetPassword } from "@/lib/api";
import { BrandMark } from "@/lib/branding";
import { PlatformFooter } from "@/components/PlatformFooter";

const inputCls = "border-0 border-b border-[#D4D4D8] bg-transparent rounded-none px-0 py-3 focus-visible:ring-0 focus-visible:border-[#1C1917] placeholder:text-[#A8A29E] text-base pl-6 pr-10";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (password !== confirm) { toast.error("Passwords do not match"); return; }
    setLoading(true);
    try {
      await resetPassword({ token, new_password: password });
      setDone(true);
      toast.success("Password updated");
    } catch (err) {
      toast.error(err.response?.data?.detail || "This reset link is invalid or has expired");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 noise-bg" style={{ backgroundColor: '#FDFCF8' }}>
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col items-center justify-center w-full max-w-sm">
        <div className="mb-12"><BrandMark heightClass="h-10" textClass="text-3xl" /></div>

        {!token ? (
          <p className="text-center text-[#57534E]" style={{ fontFamily: 'Manrope, sans-serif' }} data-testid="reset-invalid">Invalid reset link.</p>
        ) : done ? (
          <div className="text-center" data-testid="reset-done">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--brand)' }} />
            <h2 className="text-3xl font-medium mb-3" style={{ fontFamily: 'Cormorant Garamond, serif' }}>Password Updated</h2>
            <p className="text-[#57534E] mb-8" style={{ fontFamily: 'Manrope, sans-serif' }}>You can now sign in with your new password.</p>
            <Button data-testid="reset-go-login" onClick={() => navigate("/admin")} className="bg-[#1C1917] text-[#FDFCF8] rounded-sm px-8 py-6 text-xs tracking-[0.2em] uppercase font-bold">Go to Sign In</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="w-full space-y-8">
            <div className="text-center">
              <h2 className="text-4xl font-medium mb-2" style={{ fontFamily: 'Cormorant Garamond, serif' }}>Set New Password</h2>
              <p className="text-[#57534E]" style={{ fontFamily: 'Manrope, sans-serif' }}>Choose a new password for your gallery.</p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs tracking-[0.15em] uppercase font-semibold" style={{ color: '#57534E' }}>New Password</Label>
              <div className="relative">
                <Lock className="absolute left-0 top-3.5 w-4 h-4 text-[#A8A29E]" />
                <Input data-testid="reset-new-password" type={show ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} className={inputCls} placeholder="Min 6 characters" required />
                <button type="button" onClick={() => setShow(s => !s)} className="absolute right-0 top-3 text-[#A8A29E] hover:text-[#1C1917]">{show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs tracking-[0.15em] uppercase font-semibold" style={{ color: '#57534E' }}>Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-0 top-3.5 w-4 h-4 text-[#A8A29E]" />
                <Input data-testid="reset-confirm-password" type={show ? "text" : "password"} value={confirm} onChange={e => setConfirm(e.target.value)} className={inputCls} placeholder="Re-enter password" required />
              </div>
            </div>
            <Button data-testid="reset-submit-btn" type="submit" disabled={loading} className="w-full bg-[#1C1917] text-[#FDFCF8] rounded-sm px-8 py-6 text-xs tracking-[0.2em] uppercase font-bold">{loading ? "Updating..." : "Update Password"}</Button>
          </form>
        )}
      </motion.div>
      <PlatformFooter />
    </div>
  );
}
