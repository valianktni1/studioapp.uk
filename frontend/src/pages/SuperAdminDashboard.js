import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {
  ShieldCheck, LogOut, HardDrive, Pause, Play, Trash2, Building2, Images, Files, Share2, AlertTriangle
} from "lucide-react";
import {
  getSuperAdminAccount, suspendAccount, reactivateAccount, setStorageLimit, deleteInstance
} from "@/lib/api";

const GB = 1024 * 1024 * 1024;
const fmtBytes = (b) => {
  if (!b) return "0 B";
  const u = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(b) / Math.log(1024));
  return `${(b / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 2)} ${u[i]}`;
};

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [suspendMsg, setSuspendMsg] = useState("Account suspended for non-payment. Please contact us.");
  const [limitGb, setLimitGb] = useState("");
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await getSuperAdminAccount();
      setAccount(res.data);
      setLimitGb(res.data.storage_limit_bytes ? (res.data.storage_limit_bytes / GB).toString() : "0");
      if (res.data.suspend_message) setSuspendMsg(res.data.suspend_message);
    } catch (err) {
      if (err.response?.status === 401) { navigate("/superadmin"); return; }
      toast.error("Failed to load account");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    if (!localStorage.getItem("superadmin_token")) { navigate("/superadmin"); return; }
    load();
  }, [load, navigate]);

  const handleSuspend = async () => {
    setBusy(true);
    try { await suspendAccount(suspendMsg); toast.success("Account suspended"); load(); }
    catch { toast.error("Failed to suspend"); } finally { setBusy(false); }
  };
  const handleReactivate = async () => {
    setBusy(true);
    try { await reactivateAccount(); toast.success("Account reactivated"); load(); }
    catch { toast.error("Failed to reactivate"); } finally { setBusy(false); }
  };
  const handleSaveLimit = async () => {
    const v = parseFloat(limitGb);
    if (isNaN(v) || v < 0) { toast.error("Enter a valid limit (0 = unlimited)"); return; }
    setBusy(true);
    try { await setStorageLimit(v); toast.success(v === 0 ? "Storage limit removed" : `Limit set to ${v} GB`); load(); }
    catch { toast.error("Failed to set limit"); } finally { setBusy(false); }
  };
  const handleDelete = async () => {
    setBusy(true);
    try {
      await deleteInstance();
      toast.success("Instance data wiped");
      setShowDelete(false); setDeleteConfirm("");
      load();
    } catch { toast.error("Failed to delete instance"); } finally { setBusy(false); }
  };
  const logout = () => { localStorage.removeItem("superadmin_token"); navigate("/superadmin"); };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#0F0F12" }}>
      <div className="w-8 h-8 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const used = account?.storage_used_bytes || 0;
  const limit = account?.storage_limit_bytes || 0;
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0F0F12", color: "#E8E8EC" }}>
      <header className="border-b" style={{ borderColor: "#1F1F25" }}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-sm flex items-center justify-center" style={{ backgroundColor: "#7C3AED" }}>
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-base font-medium" style={{ fontFamily: "Cormorant Garamond, serif" }}>Platform Control</p>
              <p className="text-[10px] tracking-[0.2em] uppercase" style={{ color: "#8B8B94" }}>Super Admin</p>
            </div>
          </div>
          <Button data-testid="superadmin-logout" variant="ghost" onClick={logout} className="text-[#8B8B94] gap-2 text-xs">
            <LogOut className="w-4 h-4" /> Sign out
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-6">
        {/* Account summary */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border p-6" style={{ borderColor: "#1F1F25", backgroundColor: "#16161B" }}
          data-testid="account-card">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-sm flex items-center justify-center" style={{ backgroundColor: "#1F1F25" }}>
                <Building2 className="w-6 h-6" style={{ color: "#7C3AED" }} />
              </div>
              <div>
                <h2 className="text-2xl font-medium" style={{ fontFamily: "Cormorant Garamond, serif" }} data-testid="account-business-name">
                  {account?.business_name}
                </h2>
                <p className="text-xs" style={{ color: "#8B8B94" }}>
                  admin: {account?.admin_username || "—"}
                  {account?.created_at ? ` · since ${new Date(account.created_at).toLocaleDateString()}` : ""}
                </p>
              </div>
            </div>
            <span data-testid="account-status"
              className="px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider"
              style={account?.suspended
                ? { backgroundColor: "rgba(239,68,68,0.15)", color: "#F87171" }
                : { backgroundColor: "rgba(34,197,94,0.15)", color: "#4ADE80" }}>
              {account?.suspended ? "Suspended" : "Active"}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-6">
            {[
              { icon: Images, label: "Galleries", value: account?.gallery_count ?? 0 },
              { icon: Files, label: "Files", value: account?.file_count ?? 0 },
              { icon: Share2, label: "Shares", value: account?.share_count ?? 0 },
            ].map((s) => (
              <div key={s.label} className="rounded-sm p-4" style={{ backgroundColor: "#1F1F25" }}>
                <s.icon className="w-4 h-4 mb-2" style={{ color: "#8B8B94" }} />
                <p className="text-2xl font-medium">{s.value}</p>
                <p className="text-xs" style={{ color: "#8B8B94" }}>{s.label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Storage */}
        <div className="rounded-lg border p-6" style={{ borderColor: "#1F1F25", backgroundColor: "#16161B" }}>
          <div className="flex items-center gap-2 mb-4">
            <HardDrive className="w-5 h-5" style={{ color: "#7C3AED" }} />
            <h3 className="text-lg font-medium" style={{ fontFamily: "Cormorant Garamond, serif" }}>Storage</h3>
          </div>
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-sm" data-testid="storage-used">{fmtBytes(used)} used</span>
            <span className="text-xs" style={{ color: "#8B8B94" }}>{limit > 0 ? `Limit ${fmtBytes(limit)}` : "Unlimited"}</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden mb-5" style={{ backgroundColor: "#1F1F25" }}>
            <div className="h-full rounded-full" style={{ width: `${limit > 0 ? pct : 4}%`, backgroundColor: pct >= 90 ? "#F87171" : "#7C3AED" }} />
          </div>
          <div className="flex items-end gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs tracking-[0.1em] uppercase" style={{ color: "#8B8B94" }}>Storage limit (GB, 0 = unlimited)</Label>
              <Input data-testid="storage-limit-input" type="number" min="0" step="0.5" value={limitGb}
                onChange={(e) => setLimitGb(e.target.value)}
                className="bg-transparent border-[#2A2A30] text-white rounded-sm max-w-[160px]" />
            </div>
            <Button data-testid="save-storage-limit" onClick={handleSaveLimit} disabled={busy}
              className="rounded-sm text-xs tracking-wider uppercase font-bold text-white" style={{ backgroundColor: "#7C3AED" }}>
              Save Limit
            </Button>
          </div>
        </div>

        {/* Suspension controls */}
        <div className="rounded-lg border p-6" style={{ borderColor: "#1F1F25", backgroundColor: "#16161B" }}>
          <h3 className="text-lg font-medium mb-1" style={{ fontFamily: "Cormorant Garamond, serif" }}>Account Status</h3>
          <p className="text-sm mb-4" style={{ color: "#8B8B94" }}>
            Suspending instantly blocks admin login and shows clients a branded “temporarily unavailable” page. Reactivating restores everything.
          </p>
          {!account?.suspended ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs tracking-[0.1em] uppercase" style={{ color: "#8B8B94" }}>Message shown to clients</Label>
                <Input data-testid="suspend-message-input" value={suspendMsg} onChange={(e) => setSuspendMsg(e.target.value)}
                  className="bg-transparent border-[#2A2A30] text-white rounded-sm" />
              </div>
              <Button data-testid="suspend-btn" onClick={handleSuspend} disabled={busy}
                className="rounded-sm text-xs tracking-wider uppercase font-bold gap-2 text-white" style={{ backgroundColor: "#B91C1C" }}>
                <Pause className="w-4 h-4" /> Suspend Account
              </Button>
            </div>
          ) : (
            <Button data-testid="reactivate-btn" onClick={handleReactivate} disabled={busy}
              className="rounded-sm text-xs tracking-wider uppercase font-bold gap-2 text-white" style={{ backgroundColor: "#15803D" }}>
              <Play className="w-4 h-4" /> Reactivate Account
            </Button>
          )}
        </div>

        {/* Danger zone */}
        <div className="rounded-lg border p-6" style={{ borderColor: "rgba(239,68,68,0.3)", backgroundColor: "#1A1012" }}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-[#F87171]" />
            <h3 className="text-lg font-medium text-[#F87171]" style={{ fontFamily: "Cormorant Garamond, serif" }}>Danger Zone</h3>
          </div>
          <p className="text-sm mb-4" style={{ color: "#C9A3A3" }}>
            Permanently wipes ALL customer data in this stack (galleries, files, shares, admin, branding). This cannot be undone.
          </p>
          <Button data-testid="delete-instance-btn" onClick={() => setShowDelete(true)}
            className="rounded-sm text-xs tracking-wider uppercase font-bold gap-2 bg-transparent border border-[#F87171] text-[#F87171] hover:bg-[#F87171]/10">
            <Trash2 className="w-4 h-4" /> Delete Instance Data
          </Button>
        </div>
      </main>

      <AlertDialog open={showDelete} onOpenChange={(o) => { setShowDelete(o); if (!o) setDeleteConfirm(""); }}>
        <AlertDialogContent style={{ backgroundColor: "#16161B", color: "#E8E8EC", borderColor: "#2A2A30" }}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-medium" style={{ fontFamily: "Cormorant Garamond, serif" }}>
              Delete all data for {account?.business_name}?
            </AlertDialogTitle>
            <AlertDialogDescription style={{ color: "#8B8B94" }}>
              This permanently removes every gallery, file, share, the admin account and branding in this stack.
              Type <strong className="text-[#F87171]">DELETE</strong> to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input data-testid="delete-confirm-input" value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)}
            placeholder="DELETE" className="bg-transparent border-[#2A2A30] text-white rounded-sm" />
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-sm bg-transparent border-[#2A2A30] text-white">Cancel</AlertDialogCancel>
            <AlertDialogAction data-testid="confirm-delete-instance" disabled={deleteConfirm !== "DELETE" || busy}
              onClick={handleDelete} className="rounded-sm bg-[#B91C1C] text-white hover:bg-[#B91C1C]/90 text-xs tracking-wider uppercase font-bold">
              Permanently Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
