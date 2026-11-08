import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  KeyRound,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import * as api from "../../lib/api";

interface ForgotPasswordModalProps {
  open: boolean;
  onClose: () => void;
  initialEmail?: string;
  role?: string;
  onSuccess?: (email: string) => void;
}

export function ForgotPasswordModal({
  open,
  onClose,
  initialEmail = "",
  role,
  onSuccess,
}: ForgotPasswordModalProps) {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (open) {
      setEmail(initialEmail || "");
      setStep("email");
      setCode("");
      setNewPassword("");
      setConfirmPassword("");
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      setResendCooldown(0);
    }
  }, [open, initialEmail]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleRequestCode = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      toast.error("Please enter your registered email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.forgotPassword({ email: cleanEmail });
      toast.success(res.message || "Verification code sent to your email!");
      setStep("code");
      setResendCooldown(30);
    } catch (err: any) {
      toast.error(err.message || "Failed to send reset code. Please check your email.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const cleanCode = code.trim();

    if (!cleanCode) {
      toast.error("Please enter the 6-digit verification code.");
      return;
    }
    if (cleanCode.length !== 6) {
      toast.error("The verification code must be 6 digits.");
      return;
    }
    if (!newPassword) {
      toast.error("Please enter a new password.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match. Please verify.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.resetPassword({
        email: email.trim(),
        code: cleanCode,
        newPassword,
      });
      toast.success(res.message || "Password reset successfully!");
      if (onSuccess) {
        onSuccess(email.trim());
      }
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to reset password. Please check your verification code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent
        className="sm:max-w-md p-6 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <DialogHeader className="text-left space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">
                {step === "email" ? "Forgot Password" : "Reset Password"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {step === "email" ? (
                  `Enter your registered ${role ? `${role} ` : ""}email address to receive a verification code.`
                ) : (
                  <>
                    We sent a 6-digit verification code to{" "}
                    <span className="font-semibold text-foreground">{email}</span>.
                  </>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {step === "email" ? (
          <form
            onSubmit={handleRequestCode}
            className="space-y-4 mt-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-2">
              <Label htmlFor="reset-email" className="text-sm font-medium">
                Registered Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="e.g. your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  required
                  autoFocus
                />
              </div>
              <p className="text-xs text-muted-foreground">
                A verification code will be sent to your registered student or company inbox.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                onClick={(e) => e.stopPropagation()}
                disabled={loading || !email.trim()}
                className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-[130px]"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Sending...
                  </>
                ) : (
                  "Send Code"
                )}
              </Button>
            </div>
          </form>
        ) : (
          <form
            onSubmit={handleResetPassword}
            className="space-y-4 mt-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="verification-code" className="text-sm font-medium">
                  6-Digit Verification Code
                </Label>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setStep("email");
                  }}
                  className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                >
                  <ArrowLeft className="h-3 w-3" /> Change email
                </button>
              </div>
              <Input
                id="verification-code"
                type="text"
                maxLength={6}
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^0-9a-zA-Z]/g, "").slice(0, 6))}
                className="text-center font-mono text-xl tracking-widest font-semibold h-11"
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="modal-new-password" className="text-sm font-medium">
                New Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="modal-new-password"
                  type={showNewPassword ? "text" : "password"}
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pl-9 pr-10"
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowNewPassword(!showNewPassword);
                  }}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="modal-confirm-password" className="text-sm font-medium">
                Confirm New Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="modal-confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-9 pr-10"
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowConfirmPassword(!showConfirmPassword);
                  }}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
              <span>Didn't receive the email?</span>
              <button
                type="button"
                disabled={resendCooldown > 0 || loading}
                onClick={(e) => {
                  e.stopPropagation();
                  handleRequestCode();
                }}
                className="text-primary hover:underline font-medium disabled:opacity-50 disabled:no-underline flex items-center gap-1"
              >
                <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code"}
              </button>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                onClick={(e) => e.stopPropagation()}
                disabled={loading || !code.trim() || !newPassword || !confirmPassword}
                className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-[140px]"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Resetting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-1.5" />
                    Reset Password
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
