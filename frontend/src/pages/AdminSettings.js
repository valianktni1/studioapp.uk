import { useState, useEffect } from "react";
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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import {
  ArrowLeft, Key, Package, Plus, Pencil, Trash2, Printer, Eye, Check, Film, Shield, Copy, AlertTriangle, Palette, Image as ImageIcon, Upload
} from "lucide-react";
import {
  changePassword, getPrintSizes, createPrintSize, updatePrintSize, deletePrintSize,
  getPrintOrders, updateOrderStatus, getCompressionSetting, setCompressionSetting,
  get2FAStatus, setup2FA, enable2FA, disable2FA,
  getSettings, updateSettings, uploadLogo, deleteLogo
} from "@/lib/api";
import { useBranding, BrandMark } from "@/lib/branding";
import { PlatformFooter } from "@/components/PlatformFooter";

export default function AdminSettings() {
  const navigate = useNavigate();
  const { refresh } = useBranding();
  const [activeTab, setActiveTab] = useState("branding");

  // White-label branding
  const [brandingForm, setBrandingForm] = useState({
    business_name: "", accent_color: "#D4AF37", contact_email: "", website: ""
  });
  const [loadingBranding, setLoadingBranding] = useState(false);
  const [savingBranding, setSavingBranding] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [hasCustomLogo, setHasCustomLogo] = useState(false);

  // Password change
  const [passwordForm, setPasswordForm] = useState({
    current_password: "", new_password: "", confirm_password: ""
  });
  const [changingPassword, setChangingPassword] = useState(false);

  // Print sizes
  const [printSizes, setPrintSizes] = useState([]);
  const [loadingSizes, setLoadingSizes] = useState(false);
  const [showSizeDialog, setShowSizeDialog] = useState(false);
  const [editingSize, setEditingSize] = useState(null);
  const [sizeForm, setSizeForm] = useState({
    name: "", gloss_price: "", luster_price: "", silk_price: ""
  });
  const [deleteSizeTarget, setDeleteSizeTarget] = useState(null);

  // Print orders
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Video compression
  const [compressionEnabled, setCompressionEnabled] = useState(false);
  const [compressionThreshold, setCompressionThreshold] = useState(200);
  const [loadingCompression, setLoadingCompression] = useState(false);
  const [togglingCompression, setTogglingCompression] = useState(false);

  // 2FA
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [loading2FA, setLoading2FA] = useState(false);
  const [setupQR, setSetupQR] = useState(null);
  const [setupSecret, setSetupSecret] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState(null);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);

  useEffect(() => {
    if (activeTab === "branding") loadBranding();
    if (activeTab === "print-sizes") loadPrintSizes();
    if (activeTab === "orders") loadOrders();
    if (activeTab === "video") loadCompressionSetting();
    if (activeTab === "2fa") load2FAStatus();
  }, [activeTab]);

  const loadBranding = async () => {
    setLoadingBranding(true);
    try {
      const res = await getSettings();
      setBrandingForm({
        business_name: res.data.business_name || "",
        accent_color: res.data.accent_color || "#D4AF37",
        contact_email: res.data.contact_email || "",
        website: res.data.website || "",
      });
      setHasCustomLogo(res.data.has_custom_logo);
    } catch { toast.error("Failed to load branding settings"); }
    finally { setLoadingBranding(false); }
  };

  const handleSaveBranding = async () => {
    if (!brandingForm.business_name.trim()) {
      toast.error("Business name is required");
      return;
    }
    if (!/^#[0-9A-Fa-f]{6}$/.test(brandingForm.accent_color)) {
      toast.error("Accent colour must be a valid hex code like #D4AF37");
      return;
    }
    setSavingBranding(true);
    try {
      await updateSettings(brandingForm);
      await refresh();
      toast.success("Branding updated");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save branding");
    } finally {
      setSavingBranding(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      await uploadLogo(file);
      await refresh();
      setHasCustomLogo(true);
      toast.success("Logo uploaded");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to upload logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    try {
      await deleteLogo();
      await refresh();
      setHasCustomLogo(false);
      toast.success("Logo removed");
    } catch { toast.error("Failed to remove logo"); }
  };

  const loadPrintSizes = async () => {
    setLoadingSizes(true);
    try {
      const res = await getPrintSizes();
      setPrintSizes(res.data);
    } catch { toast.error("Failed to load print sizes"); }
    finally { setLoadingSizes(false); }
  };

  const loadOrders = async () => {
    setLoadingOrders(true);
    try {
      const res = await getPrintOrders();
      setOrders(res.data);
    } catch { toast.error("Failed to load orders"); }
    finally { setLoadingOrders(false); }
  };

  const loadCompressionSetting = async () => {
    setLoadingCompression(true);
    try {
      const res = await getCompressionSetting();
      setCompressionEnabled(res.data.enabled);
      setCompressionThreshold(res.data.threshold_mb);
    } catch { toast.error("Failed to load compression settings"); }
    finally { setLoadingCompression(false); }
  };

  const handleToggleCompression = async () => {
    setTogglingCompression(true);
    try {
      const newValue = !compressionEnabled;
      await setCompressionSetting(newValue);
      setCompressionEnabled(newValue);
      toast.success(`Video compression ${newValue ? 'enabled' : 'disabled'}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to update setting");
    } finally {
      setTogglingCompression(false);
    }
  };

  // 2FA functions
  const load2FAStatus = async () => {
    setLoading2FA(true);
    try {
      const res = await get2FAStatus();
      setTwoFAEnabled(res.data.enabled);
    } catch { /* silently fail */ }
    finally { setLoading2FA(false); }
  };

  const handleSetup2FA = async () => {
    try {
      const res = await setup2FA();
      setSetupQR(res.data.qr_code);
      setSetupSecret(res.data.secret);
      setVerifyCode("");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to start 2FA setup");
    }
  };

  const handleEnable2FA = async () => {
    if (verifyCode.length < 6) {
      toast.error("Please enter the 6-digit code from your authenticator app");
      return;
    }
    try {
      const res = await enable2FA(verifyCode);
      setTwoFAEnabled(true);
      setRecoveryCodes(res.data.recovery_codes);
      setSetupQR(null);
      setSetupSecret("");
      setVerifyCode("");
      toast.success("Two-factor authentication enabled!");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Invalid code. Please try again.");
      setVerifyCode("");
    }
  };

  const handleDisable2FA = async () => {
    if (disableCode.length < 6) {
      toast.error("Please enter your 2FA code or a recovery code");
      return;
    }
    try {
      await disable2FA(disableCode);
      setTwoFAEnabled(false);
      setShowDisableConfirm(false);
      setDisableCode("");
      toast.success("Two-factor authentication disabled");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Invalid code");
      setDisableCode("");
    }
  };

  const copyRecoveryCodes = () => {
    if (recoveryCodes) {
      navigator.clipboard.writeText(recoveryCodes.join('\n'));
      toast.success("Recovery codes copied to clipboard");
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error("New passwords don't match");
      return;
    }
    if (passwordForm.new_password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setChangingPassword(true);
    try {
      await changePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password
      });
      toast.success("Password changed successfully");
      setPasswordForm({ current_password: "", new_password: "", confirm_password: "" });
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to change password");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSavePrintSize = async () => {
    if (!sizeForm.name || !sizeForm.gloss_price || !sizeForm.luster_price || !sizeForm.silk_price) {
      toast.error("All fields are required");
      return;
    }
    try {
      const data = {
        name: sizeForm.name,
        gloss_price: parseFloat(sizeForm.gloss_price),
        luster_price: parseFloat(sizeForm.luster_price),
        silk_price: parseFloat(sizeForm.silk_price)
      };
      if (editingSize) {
        await updatePrintSize(editingSize.id, data);
        toast.success("Print size updated");
      } else {
        await createPrintSize(data);
        toast.success("Print size created");
      }
      setShowSizeDialog(false);
      setEditingSize(null);
      setSizeForm({ name: "", gloss_price: "", luster_price: "", silk_price: "" });
      loadPrintSizes();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save");
    }
  };

  const handleDeleteSize = async () => {
    try {
      await deletePrintSize(deleteSizeTarget.id);
      toast.success("Print size deleted");
      setDeleteSizeTarget(null);
      loadPrintSizes();
    } catch { toast.error("Failed to delete"); }
  };

  const handleUpdateOrderStatus = async (orderId, status) => {
    try {
      await updateOrderStatus(orderId, status);
      toast.success(`Order marked as ${status}`);
      loadOrders();
    } catch { toast.error("Failed to update status"); }
  };

  const openEditSize = (size) => {
    setEditingSize(size);
    setSizeForm({
      name: size.name,
      gloss_price: size.prices.gloss.toString(),
      luster_price: size.prices.luster.toString(),
      silk_price: size.prices.silk.toString()
    });
    setShowSizeDialog(true);
  };

  const openNewSize = () => {
    setEditingSize(null);
    setSizeForm({ name: "", gloss_price: "", luster_price: "", silk_price: "" });
    setShowSizeDialog(true);
  };

  const formatPrice = (price) => `£${price.toFixed(2)}`;
  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800",
    paid: "bg-blue-100 text-blue-800",
    processing: "bg-purple-100 text-purple-800",
    printed: "bg-indigo-100 text-indigo-800",
    shipped: "bg-green-100 text-green-800",
    completed: "bg-emerald-100 text-emerald-800",
    cancelled: "bg-red-100 text-red-800"
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FDFCF8' }}>
      {/* Header */}
      <header className="sticky top-0 z-50 border-b" style={{ backgroundColor: 'rgba(253,252,248,0.9)', backdropFilter: 'blur(16px)', borderColor: 'rgba(var(--brand-rgb),0.15)' }}>
        <div className="max-w-screen-xl mx-auto px-6 py-4 flex items-center gap-4">
          <button onClick={() => navigate("/admin/dashboard")} className="text-[#57534E] hover:text-[#1C1917]">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-medium" style={{ fontFamily: 'Cormorant Garamond, serif' }}>Settings</h1>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b flex-wrap" style={{ borderColor: 'rgba(var(--brand-rgb),0.15)' }}>
          {[
            { id: "branding", label: "Branding", icon: Palette },
            { id: "password", label: "Change Password", icon: Key },
            { id: "2fa", label: "Two-Factor Auth", icon: Shield },
            { id: "video", label: "Video Compression", icon: Film },
            { id: "print-sizes", label: "Print Sizes & Prices", icon: Printer },
            { id: "orders", label: "Print Orders", icon: Package }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-[1px] transition-colors ${
                activeTab === tab.id 
                  ? 'border-[var(--brand)] text-[#1C1917]' 
                  : 'border-transparent text-[#57534E] hover:text-[#1C1917]'
              }`}
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Branding Tab */}
        {activeTab === "branding" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl">
            {loadingBranding ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-2 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-8">
                <p className="text-sm text-[#57534E]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Customise how your gallery appears to your clients. Your business name, logo and accent colour
                  replace the defaults across the login page, dashboard, client galleries and photo watermarks.
                </p>

                {/* Logo */}
                <div className="border rounded-sm p-6 space-y-4" style={{ borderColor: 'rgba(var(--brand-rgb),0.15)' }}>
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-[var(--brand)]" />
                    <h3 className="text-lg font-medium" style={{ fontFamily: 'Cormorant Garamond, serif' }}>Logo</h3>
                  </div>
                  <p className="text-sm text-[#57534E]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    Used on the login page, gallery headers and as the watermark on client photos. PNG with transparency recommended.
                  </p>
                  <div className="flex items-center gap-6">
                    <div className="w-40 h-24 flex items-center justify-center rounded-sm border px-3 text-center" style={{ borderColor: 'rgba(var(--brand-rgb),0.2)', backgroundColor: '#1C1917' }}>
                      <BrandMark heightClass="max-h-16" textClass="text-xl" color="#FFFFFF" imgStyle={{ maxWidth: '140px' }} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="inline-flex items-center gap-2 cursor-pointer bg-[#1C1917] text-[#FDFCF8] rounded-sm px-4 py-2 text-xs tracking-wider uppercase font-bold w-fit">
                        <Upload className="w-3.5 h-3.5" /> {uploadingLogo ? "Uploading..." : "Upload Logo"}
                        <input data-testid="branding-logo-upload" type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploadingLogo} />
                      </label>
                      {hasCustomLogo && (
                        <Button variant="ghost" onClick={handleRemoveLogo} data-testid="branding-remove-logo"
                          className="text-[#9F1239] text-xs gap-1 w-fit px-2">
                          <Trash2 className="w-3.5 h-3.5" /> Remove custom logo
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Business details */}
                <div className="border rounded-sm p-6 space-y-5" style={{ borderColor: 'rgba(var(--brand-rgb),0.15)' }}>
                  <div className="space-y-1.5">
                    <Label className="text-xs tracking-[0.1em] uppercase font-semibold" style={{ color: '#57534E' }}>Business Name</Label>
                    <Input data-testid="branding-business-name" value={brandingForm.business_name}
                      onChange={e => setBrandingForm(f => ({...f, business_name: e.target.value}))}
                      placeholder="Your studio / business name" className="border-[#D4D4D8] rounded-sm" />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs tracking-[0.1em] uppercase font-semibold" style={{ color: '#57534E' }}>Accent Colour</Label>
                    <div className="flex items-center gap-3">
                      <input data-testid="branding-accent-color" type="color" value={brandingForm.accent_color}
                        onChange={e => setBrandingForm(f => ({...f, accent_color: e.target.value}))}
                        className="h-10 w-14 rounded-sm border border-[#D4D4D8] cursor-pointer bg-transparent" />
                      <Input data-testid="branding-accent-hex" value={brandingForm.accent_color}
                        onChange={e => setBrandingForm(f => ({...f, accent_color: e.target.value}))}
                        className="border-[#D4D4D8] rounded-sm font-mono max-w-[140px]" />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs tracking-[0.1em] uppercase font-semibold" style={{ color: '#57534E' }}>Contact Email</Label>
                      <Input data-testid="branding-contact-email" type="email" value={brandingForm.contact_email}
                        onChange={e => setBrandingForm(f => ({...f, contact_email: e.target.value}))}
                        placeholder="you@yourstudio.com" className="border-[#D4D4D8] rounded-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs tracking-[0.1em] uppercase font-semibold" style={{ color: '#57534E' }}>Website</Label>
                      <Input data-testid="branding-website" value={brandingForm.website}
                        onChange={e => setBrandingForm(f => ({...f, website: e.target.value}))}
                        placeholder="https://yourstudio.com" className="border-[#D4D4D8] rounded-sm" />
                    </div>
                  </div>

                  <Button onClick={handleSaveBranding} disabled={savingBranding} data-testid="save-branding-btn"
                    className="bg-[#1C1917] text-[#FDFCF8] rounded-sm px-6 py-2 text-xs tracking-wider uppercase font-bold">
                    {savingBranding ? "Saving..." : "Save Branding"}
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Password Change Tab */}
        {activeTab === "password" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-md">
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs tracking-[0.1em] uppercase font-semibold" style={{ color: '#57534E' }}>Current Password</Label>
                <Input type="password" data-testid="current-password" value={passwordForm.current_password}
                  onChange={e => setPasswordForm(f => ({...f, current_password: e.target.value}))}
                  className="border-[#D4D4D8] rounded-sm" required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs tracking-[0.1em] uppercase font-semibold" style={{ color: '#57534E' }}>New Password</Label>
                <Input type="password" data-testid="new-password" value={passwordForm.new_password}
                  onChange={e => setPasswordForm(f => ({...f, new_password: e.target.value}))}
                  className="border-[#D4D4D8] rounded-sm" required minLength={6} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs tracking-[0.1em] uppercase font-semibold" style={{ color: '#57534E' }}>Confirm New Password</Label>
                <Input type="password" data-testid="confirm-password" value={passwordForm.confirm_password}
                  onChange={e => setPasswordForm(f => ({...f, confirm_password: e.target.value}))}
                  className="border-[#D4D4D8] rounded-sm" required minLength={6} />
              </div>
              <Button type="submit" disabled={changingPassword} data-testid="change-password-btn"
                className="bg-[#1C1917] text-[#FDFCF8] rounded-sm px-6 py-2 text-xs tracking-wider uppercase font-bold">
                {changingPassword ? "Changing..." : "Change Password"}
              </Button>
            </form>
          </motion.div>
        )}

        {/* Two-Factor Authentication Tab */}
        {activeTab === "2fa" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl">
            {loading2FA ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-2 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : recoveryCodes ? (
              /* Recovery Codes Display */
              <div className="space-y-6">
                <div className="border rounded-sm p-6" style={{ borderColor: 'rgba(var(--brand-rgb),0.15)' }}>
                  <div className="flex items-start gap-3 mb-4">
                    <AlertTriangle className="w-6 h-6 text-[var(--brand)] flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-lg font-medium mb-1" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                        Save Your Recovery Codes
                      </h3>
                      <p className="text-sm text-[#57534E]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        If you lose your phone, you can use these codes to log in. Each code can only be used once.
                        <strong> Save them somewhere safe — you won't see them again.</strong>
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 p-4 rounded-sm mb-4" style={{ backgroundColor: '#F5F2EB' }}>
                    {recoveryCodes.map((code, i) => (
                      <code key={i} className="text-sm font-mono font-bold text-center py-1" data-testid={`recovery-code-${i}`}>
                        {code}
                      </code>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <Button onClick={copyRecoveryCodes} data-testid="copy-recovery-codes-btn"
                      className="bg-[#1C1917] text-[#FDFCF8] rounded-sm px-4 py-2 text-xs tracking-wider uppercase font-bold gap-2">
                      <Copy className="w-3.5 h-3.5" /> Copy Codes
                    </Button>
                    <Button onClick={() => setRecoveryCodes(null)} variant="outline" 
                      className="rounded-sm px-4 py-2 text-xs tracking-wider uppercase font-bold">
                      I've Saved Them
                    </Button>
                  </div>
                </div>
              </div>
            ) : twoFAEnabled ? (
              /* 2FA Enabled State */
              <div className="space-y-6">
                <div className="border rounded-sm p-6" style={{ borderColor: 'rgba(var(--brand-rgb),0.15)' }}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <Shield className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-medium mb-1" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                          Two-Factor Authentication is ON
                        </h3>
                        <p className="text-sm text-[#57534E]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                          Your account is protected with Google Authenticator. A 6-digit code is required every time you log in.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border rounded-sm p-6 border-red-200 bg-red-50/50">
                  <h4 className="font-medium mb-2 text-red-800" style={{ fontFamily: 'Manrope, sans-serif' }}>Disable 2FA</h4>
                  <p className="text-sm text-red-700 mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    This will remove the extra security from your account. You'll need to enter a code to confirm.
                  </p>
                  <Button onClick={() => setShowDisableConfirm(true)} data-testid="disable-2fa-btn"
                    className="bg-[#9F1239] text-white hover:bg-[#9F1239]/90 rounded-sm px-4 py-2 text-xs tracking-wider uppercase font-bold">
                    Disable 2FA
                  </Button>
                </div>
              </div>
            ) : setupQR ? (
              /* QR Code Setup Step */
              <div className="space-y-6">
                <div className="border rounded-sm p-6" style={{ borderColor: 'rgba(var(--brand-rgb),0.15)' }}>
                  <h3 className="text-lg font-medium mb-1" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                    Step 1: Scan QR Code
                  </h3>
                  <p className="text-sm text-[#57534E] mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    Open Google Authenticator on your phone and scan this QR code.
                  </p>
                  
                  <div className="flex justify-center p-6 rounded-sm mb-4" style={{ backgroundColor: '#F5F2EB' }}>
                    <img src={setupQR} alt="2FA QR Code" className="w-48 h-48" data-testid="2fa-qr-code" />
                  </div>

                  <p className="text-xs text-[#A8A29E] text-center mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    Can't scan? Enter this code manually:
                  </p>
                  <code className="block text-center text-sm font-mono font-bold p-2 rounded-sm select-all" 
                    style={{ backgroundColor: '#F5F2EB' }} data-testid="2fa-manual-secret">
                    {setupSecret}
                  </code>
                </div>

                <div className="border rounded-sm p-6" style={{ borderColor: 'rgba(var(--brand-rgb),0.15)' }}>
                  <h3 className="text-lg font-medium mb-1" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                    Step 2: Enter Verification Code
                  </h3>
                  <p className="text-sm text-[#57534E] mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    Enter the 6-digit code shown in Google Authenticator to verify it's working.
                  </p>
                  
                  <div className="flex gap-3">
                    <Input
                      data-testid="2fa-verify-code"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={verifyCode}
                      onChange={e => setVerifyCode(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="000000"
                      className="border-[#D4D4D8] rounded-sm text-center text-xl tracking-[0.3em] font-mono max-w-[200px]"
                    />
                    <Button onClick={handleEnable2FA} disabled={verifyCode.length < 6} data-testid="enable-2fa-btn"
                      className="bg-[#1C1917] text-[#FDFCF8] rounded-sm px-6 py-2 text-xs tracking-wider uppercase font-bold">
                      Verify & Enable
                    </Button>
                  </div>
                </div>

                <button onClick={() => { setSetupQR(null); setSetupSecret(""); }} 
                  className="text-sm text-[#57534E] hover:text-[#1C1917]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Cancel setup
                </button>
              </div>
            ) : (
              /* Initial State - Not Enabled */
              <div className="space-y-6">
                <div className="border rounded-sm p-6" style={{ borderColor: 'rgba(var(--brand-rgb),0.15)' }}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <Shield className="w-5 h-5 text-[#57534E]" />
                      </div>
                      <div>
                        <h3 className="text-lg font-medium mb-1" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                          Two-Factor Authentication
                        </h3>
                        <p className="text-sm text-[#57534E]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                          Add an extra layer of security to your account. After enabling, you'll need your password 
                          AND a code from the Google Authenticator app on your phone to log in.
                        </p>
                      </div>
                    </div>
                    <Button onClick={handleSetup2FA} data-testid="setup-2fa-btn"
                      className="bg-[#1C1917] text-[#FDFCF8] rounded-sm px-6 py-2 text-xs tracking-wider uppercase font-bold flex-shrink-0">
                      Enable 2FA
                    </Button>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="border rounded-sm p-4" style={{ borderColor: 'rgba(var(--brand-rgb),0.15)', backgroundColor: '#F5F2EB' }}>
                    <Shield className="w-6 h-6 text-[var(--brand)] mb-2" />
                    <h4 className="font-medium mb-1" style={{ fontFamily: 'Manrope, sans-serif' }}>How it works</h4>
                    <ul className="text-sm text-[#57534E] space-y-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      <li>1. Enable 2FA and scan a QR code</li>
                      <li>2. Google Authenticator generates a new code every 30 seconds</li>
                      <li>3. Enter the code after your password when logging in</li>
                      <li>4. Even if someone knows your password, they can't get in</li>
                    </ul>
                  </div>
                  <div className="border rounded-sm p-4" style={{ borderColor: 'rgba(var(--brand-rgb),0.15)', backgroundColor: '#F5F2EB' }}>
                    <Key className="w-6 h-6 text-[var(--brand)] mb-2" />
                    <h4 className="font-medium mb-1" style={{ fontFamily: 'Manrope, sans-serif' }}>What you need</h4>
                    <ul className="text-sm text-[#57534E] space-y-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      <li>• Google Authenticator app on your phone</li>
                      <li>• Free from Play Store or App Store</li>
                      <li>• Recovery codes provided as backup</li>
                      <li>• Can be disabled at any time</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Video Compression Tab */}
        {activeTab === "video" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl">
            {loadingCompression ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-2 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Main Toggle */}
                <div className="border rounded-sm p-6" style={{ borderColor: 'rgba(var(--brand-rgb),0.15)' }}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-medium mb-1" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                        Guest Video Compression
                      </h3>
                      <p className="text-sm text-[#57534E]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        Automatically compress large videos uploaded by wedding guests to save storage space.
                        Videos over {compressionThreshold}MB will be compressed in the background.
                      </p>
                    </div>
                    <Button 
                      onClick={handleToggleCompression}
                      disabled={togglingCompression}
                      data-testid="toggle-compression-btn"
                      className={`px-6 py-2 rounded-sm text-xs tracking-wider uppercase font-bold ${
                        compressionEnabled 
                          ? 'bg-green-600 hover:bg-green-700 text-white' 
                          : 'bg-[#1C1917] hover:bg-[#1C1917]/90 text-[#FDFCF8]'
                      }`}
                    >
                      {togglingCompression ? "..." : compressionEnabled ? "ON" : "OFF"}
                    </Button>
                  </div>
                </div>

                {/* Info Cards */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="border rounded-sm p-4" style={{ borderColor: 'rgba(var(--brand-rgb),0.15)', backgroundColor: '#F5F2EB' }}>
                    <Film className="w-6 h-6 text-[var(--brand)] mb-2" />
                    <h4 className="font-medium mb-1" style={{ fontFamily: 'Manrope, sans-serif' }}>How it works</h4>
                    <ul className="text-sm text-[#57534E] space-y-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      <li>• Guest uploads video normally</li>
                      <li>• If over {compressionThreshold}MB, compression starts in background</li>
                      <li>• Uses high-quality H.264 encoding (visually lossless)</li>
                      <li>• Typically saves 50-70% storage space</li>
                    </ul>
                  </div>
                  <div className="border rounded-sm p-4" style={{ borderColor: 'rgba(var(--brand-rgb),0.15)', backgroundColor: '#F5F2EB' }}>
                    <Check className="w-6 h-6 text-green-600 mb-2" />
                    <h4 className="font-medium mb-1" style={{ fontFamily: 'Manrope, sans-serif' }}>What's protected</h4>
                    <ul className="text-sm text-[#57534E] space-y-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      <li>• Your professional uploads are NEVER compressed</li>
                      <li>• Only affects new guest uploads</li>
                      <li>• Existing videos unchanged</li>
                      <li>• Original kept until compression verified</li>
                    </ul>
                  </div>
                </div>

                {/* Status Indicator */}
                <div className={`border rounded-sm p-4 flex items-center gap-3 ${compressionEnabled ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                  <div className={`w-3 h-3 rounded-full ${compressionEnabled ? 'bg-green-500' : 'bg-gray-400'}`} />
                  <span className="text-sm font-medium" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    {compressionEnabled 
                      ? `Active — Videos over ${compressionThreshold}MB will be automatically compressed`
                      : 'Disabled — Guest videos will be stored at original size'
                    }
                  </span>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Print Sizes Tab */}
        {activeTab === "print-sizes" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-[#57534E]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Configure print sizes and prices for each finish type. Shipping: £2.50 (UK only)
              </p>
              <Button onClick={openNewSize} data-testid="add-print-size-btn"
                className="bg-[#1C1917] text-[#FDFCF8] rounded-sm px-4 py-2 text-xs tracking-wider uppercase font-bold gap-2">
                <Plus className="w-3.5 h-3.5" /> Add Size
              </Button>
            </div>

            {loadingSizes ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-2 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : printSizes.length === 0 ? (
              <div className="text-center py-12 border rounded-sm" style={{ borderColor: 'rgba(var(--brand-rgb),0.15)' }}>
                <Printer className="w-12 h-12 mx-auto mb-3 text-[#D4D4D8]" />
                <p className="text-lg" style={{ fontFamily: 'Cormorant Garamond, serif', color: '#57534E' }}>No print sizes configured</p>
                <p className="text-sm mt-1 text-[#A8A29E]">Add print sizes to enable the print shop for your couples</p>
              </div>
            ) : (
              <div className="border rounded-sm overflow-hidden" style={{ borderColor: 'rgba(var(--brand-rgb),0.15)' }}>
                <table className="w-full">
                  <thead>
                    <tr style={{ backgroundColor: '#F5F2EB' }}>
                      <th className="text-left px-4 py-3 text-xs tracking-wider uppercase font-bold" style={{ color: '#57534E' }}>Size</th>
                      <th className="text-right px-4 py-3 text-xs tracking-wider uppercase font-bold" style={{ color: '#57534E' }}>Gloss</th>
                      <th className="text-right px-4 py-3 text-xs tracking-wider uppercase font-bold" style={{ color: '#57534E' }}>Luster</th>
                      <th className="text-right px-4 py-3 text-xs tracking-wider uppercase font-bold" style={{ color: '#57534E' }}>Silk</th>
                      <th className="w-24"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {printSizes.map(size => (
                      <tr key={size.id} className="border-t" style={{ borderColor: 'rgba(var(--brand-rgb),0.1)' }}>
                        <td className="px-4 py-3 font-medium" style={{ fontFamily: 'Manrope, sans-serif' }}>{size.name}</td>
                        <td className="px-4 py-3 text-right text-sm">{formatPrice(size.prices.gloss)}</td>
                        <td className="px-4 py-3 text-right text-sm">{formatPrice(size.prices.luster)}</td>
                        <td className="px-4 py-3 text-right text-sm">{formatPrice(size.prices.silk)}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => openEditSize(size)} className="p-1.5 text-[#57534E] hover:text-[#1C1917]">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setDeleteSizeTarget(size)} className="p-1.5 text-[#9F1239]">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}

        {/* Print Orders Tab */}
        {activeTab === "orders" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            {loadingOrders ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-2 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12 border rounded-sm" style={{ borderColor: 'rgba(var(--brand-rgb),0.15)' }}>
                <Package className="w-12 h-12 mx-auto mb-3 text-[#D4D4D8]" />
                <p className="text-lg" style={{ fontFamily: 'Cormorant Garamond, serif', color: '#57534E' }}>No orders yet</p>
                <p className="text-sm mt-1 text-[#A8A29E]">Orders will appear here when couples purchase prints</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map(order => (
                  <div key={order.id} className="border rounded-sm p-4" style={{ borderColor: 'rgba(var(--brand-rgb),0.15)' }}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-medium" style={{ fontFamily: 'Manrope, sans-serif' }}>{order.gallery_name}</p>
                        <p className="text-xs text-[#A8A29E]">{order.customer_email} &middot; {formatDate(order.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs font-bold uppercase rounded ${statusColors[order.status] || 'bg-gray-100'}`}>
                          {order.status}
                        </span>
                        <span className="font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>£{order.total.toFixed(2)}</span>
                      </div>
                    </div>
                    
                    <div className="text-sm mb-3">
                      <p className="text-[#57534E]">{order.items.length} item(s): {order.items.map(i => `${i.quantity}x ${i.size_name} ${i.finish}`).join(', ')}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(order)} className="text-xs gap-1">
                        <Eye className="w-3 h-3" /> View Details
                      </Button>
                      {order.status === 'paid' && (
                        <Button size="sm" onClick={() => handleUpdateOrderStatus(order.id, 'processing')} 
                          className="bg-purple-600 text-white text-xs gap-1">
                          <Check className="w-3 h-3" /> Mark Processing
                        </Button>
                      )}
                      {order.status === 'processing' && (
                        <Button size="sm" onClick={() => handleUpdateOrderStatus(order.id, 'printed')}
                          className="bg-indigo-600 text-white text-xs gap-1">
                          <Check className="w-3 h-3" /> Mark Printed
                        </Button>
                      )}
                      {order.status === 'printed' && (
                        <Button size="sm" onClick={() => handleUpdateOrderStatus(order.id, 'shipped')}
                          className="bg-green-600 text-white text-xs gap-1">
                          <Check className="w-3 h-3" /> Mark Shipped
                        </Button>
                      )}
                      {order.status === 'shipped' && (
                        <Button size="sm" onClick={() => handleUpdateOrderStatus(order.id, 'completed')}
                          className="bg-emerald-600 text-white text-xs gap-1">
                          <Check className="w-3 h-3" /> Mark Complete
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </main>

      {/* Add/Edit Print Size Dialog */}
      <Dialog open={showSizeDialog} onOpenChange={setShowSizeDialog}>
        <DialogContent className="border-none shadow-2xl rounded-none max-w-md" style={{ backgroundColor: '#FDFCF8' }}>
          <DialogHeader>
            <DialogTitle className="text-2xl font-medium" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
              {editingSize ? "Edit Print Size" : "Add Print Size"}
            </DialogTitle>
            <DialogDescription style={{ color: '#57534E', fontFamily: 'Manrope, sans-serif' }}>
              Set the size name and prices for each finish type
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label className="text-xs tracking-[0.1em] uppercase font-semibold" style={{ color: '#57534E' }}>Size Name</Label>
              <Input data-testid="size-name" value={sizeForm.name} 
                onChange={e => setSizeForm(f => ({...f, name: e.target.value}))}
                placeholder="e.g. 6x4, 7x5, 10x8" className="border-[#D4D4D8] rounded-sm" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs tracking-[0.1em] uppercase font-semibold" style={{ color: '#57534E' }}>Gloss (£)</Label>
                <Input type="number" step="0.01" data-testid="gloss-price" value={sizeForm.gloss_price}
                  onChange={e => setSizeForm(f => ({...f, gloss_price: e.target.value}))}
                  placeholder="5.00" className="border-[#D4D4D8] rounded-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs tracking-[0.1em] uppercase font-semibold" style={{ color: '#57534E' }}>Luster (£)</Label>
                <Input type="number" step="0.01" data-testid="luster-price" value={sizeForm.luster_price}
                  onChange={e => setSizeForm(f => ({...f, luster_price: e.target.value}))}
                  placeholder="6.00" className="border-[#D4D4D8] rounded-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs tracking-[0.1em] uppercase font-semibold" style={{ color: '#57534E' }}>Silk (£)</Label>
                <Input type="number" step="0.01" data-testid="silk-price" value={sizeForm.silk_price}
                  onChange={e => setSizeForm(f => ({...f, silk_price: e.target.value}))}
                  placeholder="6.50" className="border-[#D4D4D8] rounded-sm" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowSizeDialog(false)} className="rounded-sm">Cancel</Button>
            <Button onClick={handleSavePrintSize} data-testid="save-size-btn"
              className="bg-[#1C1917] text-[#FDFCF8] rounded-sm px-6 text-xs tracking-wider uppercase font-bold">
              {editingSize ? "Update" : "Add Size"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Size Confirmation */}
      <AlertDialog open={!!deleteSizeTarget} onOpenChange={() => setDeleteSizeTarget(null)}>
        <AlertDialogContent className="border-none shadow-2xl rounded-none" style={{ backgroundColor: '#FDFCF8' }}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-medium" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
              Delete "{deleteSizeTarget?.name}"?
            </AlertDialogTitle>
            <AlertDialogDescription style={{ color: '#57534E', fontFamily: 'Manrope, sans-serif' }}>
              This will remove this print size option from the shop.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-sm">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSize}
              className="bg-[#9F1239] text-white hover:bg-[#9F1239]/90 rounded-sm text-xs tracking-wider uppercase font-bold">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Order Details Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="border-none shadow-2xl rounded-none max-w-lg" style={{ backgroundColor: '#FDFCF8' }}>
          <DialogHeader>
            <DialogTitle className="text-2xl font-medium" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
              Order Details
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs uppercase text-[#A8A29E] mb-1">Gallery</p>
                  <p className="font-medium">{selectedOrder.gallery_name}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-[#A8A29E] mb-1">Customer</p>
                  <p className="font-medium">{selectedOrder.customer_email}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-[#A8A29E] mb-1">Order Date</p>
                  <p>{formatDate(selectedOrder.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-[#A8A29E] mb-1">PayPal ID</p>
                  <p className="font-mono text-xs">{selectedOrder.paypal_order_id || 'N/A'}</p>
                </div>
              </div>

              <div className="border-t pt-4" style={{ borderColor: 'rgba(var(--brand-rgb),0.15)' }}>
                <p className="text-xs uppercase text-[#A8A29E] mb-2">Items</p>
                <div className="space-y-2">
                  {selectedOrder.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm p-2" style={{ backgroundColor: '#F5F2EB' }}>
                      <div>
                        <p className="font-medium">{item.filename}</p>
                        <p className="text-xs text-[#57534E]">{item.size_name} • {item.finish} • Qty: {item.quantity}</p>
                      </div>
                      <p className="font-medium">£{item.total.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4 space-y-1 text-sm" style={{ borderColor: 'rgba(var(--brand-rgb),0.15)' }}>
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>£{selectedOrder.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span>£{selectedOrder.shipping.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-base pt-2">
                  <span>Total</span>
                  <span>£{selectedOrder.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Disable 2FA Confirmation Dialog */}
      <Dialog open={showDisableConfirm} onOpenChange={(open) => { setShowDisableConfirm(open); if (!open) setDisableCode(""); }}>
        <DialogContent className="border-none shadow-2xl rounded-none max-w-md" style={{ backgroundColor: '#FDFCF8' }}>
          <DialogHeader>
            <DialogTitle className="text-2xl font-medium" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
              Disable Two-Factor Authentication
            </DialogTitle>
            <DialogDescription style={{ color: '#57534E', fontFamily: 'Manrope, sans-serif' }}>
              Enter your current 2FA code or a recovery code to disable two-factor authentication.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              data-testid="disable-2fa-code"
              type="text"
              inputMode="numeric"
              pattern="[0-9A-Fa-f]*"
              maxLength={8}
              value={disableCode}
              onChange={e => setDisableCode(e.target.value.replace(/[^0-9A-Fa-f]/g, ''))}
              placeholder="Enter code"
              className="border-[#D4D4D8] rounded-sm text-center text-xl tracking-[0.3em] font-mono"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setShowDisableConfirm(false); setDisableCode(""); }} className="rounded-sm">
              Cancel
            </Button>
            <Button onClick={handleDisable2FA} disabled={disableCode.length < 6} data-testid="confirm-disable-2fa-btn"
              className="bg-[#9F1239] text-white hover:bg-[#9F1239]/90 rounded-sm px-6 text-xs tracking-wider uppercase font-bold">
              Disable 2FA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <PlatformFooter />
    </div>
  );
}
