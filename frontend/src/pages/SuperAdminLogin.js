import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Lock, User, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { superAdminLogin } from "@/lib/api";

function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

export default function SuperAdminLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("superadmin_token");
    if (token && !isTokenExpired(token)) navigate("/superadmin/dashboard");
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await superAdminLogin(form);
      localStorage.setItem("superadmin_token", res.data.token);
      toast.success("Welcome, platform owner");
      navigate("/superadmin/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: "#0F0F12" }}>
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-11 h-11 rounded-sm flex items-center justify-center" style={{ backgroundColor: "#7C3AED" }}>
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-white text-lg font-medium" style={{ fontFamily: "Cormorant Garamond, serif" }}>Platform Control</p>
            <p className="text-xs tracking-[0.2em] uppercase" style={{ color: "#8B8B94" }}>Super Admin</p>
          </div>
        </div>

        <h2 className="text-3xl font-medium text-white mb-2" style={{ fontFamily: "Cormorant Garamond, serif" }}>Sign In</h2>
        <p className="text-sm mb-10" style={{ color: "#8B8B94" }}>Restricted to the platform owner.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label className="text-xs tracking-[0.15em] uppercase font-semibold" style={{ color: "#8B8B94" }}>Username</Label>
            <div className="relative">
              <User className="absolute left-0 top-3.5 w-4 h-4" style={{ color: "#5B5B63" }} />
              <Input data-testid="superadmin-username" value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                className="border-0 border-b bg-transparent rounded-none pl-6 py-3 text-white focus-visible:ring-0"
                style={{ borderColor: "#2A2A30" }} placeholder="superadmin" required />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs tracking-[0.15em] uppercase font-semibold" style={{ color: "#8B8B94" }}>Password</Label>
            <div className="relative">
              <Lock className="absolute left-0 top-3.5 w-4 h-4" style={{ color: "#5B5B63" }} />
              <Input data-testid="superadmin-password" type={showPassword ? "text" : "password"} value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className="border-0 border-b bg-transparent rounded-none pl-6 pr-10 py-3 text-white focus-visible:ring-0"
                style={{ borderColor: "#2A2A30" }} placeholder="••••••••" required />
              <button type="button" onClick={() => setShowPassword((s) => !s)}
                className="absolute right-0 top-3" style={{ color: "#5B5B63" }}>
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <Button data-testid="superadmin-login-btn" type="submit" disabled={loading}
            className="w-full rounded-sm px-8 py-6 text-xs tracking-[0.2em] uppercase font-bold text-white"
            style={{ backgroundColor: "#7C3AED" }}>
            {loading ? "Please wait..." : "Sign In"}
          </Button>
        </form>

        <p className="text-center text-xs mt-10" style={{ color: "#5B5B63", fontFamily: "Manrope, sans-serif" }}>
          App designed &amp; hosted by Weddings By Mark
        </p>
      </motion.div>
    </div>
  );
}
