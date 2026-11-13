import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import {
  Camera,
  CheckCircle,
  Edit,
  MapPin,
  Loader2,
  Trash2,
  ShieldCheck,
  Clock,
  Coffee,
} from "lucide-react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { toast } from "sonner";
import * as api from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import { normalizePolygon } from "../../lib/geolocation";
import { resolveUploadUrl } from "../../lib/uploads";
import { ChangePasswordCard } from "../common/ChangePasswordCard";

interface ProfileTabProps {
  companyInfo: any;
  onNavigateToTracker?: () => void;
}

export function ProfileTab({ companyInfo, onNavigateToTracker }: ProfileTabProps) {
  const { refreshProfile, user } = useAuth();
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingSignature, setIsUploadingSignature] = useState(false);
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(
    resolveUploadUrl((user as any)?.signatureUrl ?? companyInfo.signatureUrl)
  );

  useEffect(() => {
    setSignaturePreview(resolveUploadUrl((user as any)?.signatureUrl ?? companyInfo.signatureUrl));
  }, [(user as any)?.signatureUrl, companyInfo.signatureUrl]);

  const [profileForm, setProfileForm] = useState({
    companyName: companyInfo.name || "",
    industry: companyInfo.industry || "",
    phone: companyInfo.phone || "",
    hrContact: companyInfo.hrContact || "",
    hrEmail: companyInfo.hrEmail || "",
    description: companyInfo.description || "",
    address: companyInfo.address || "",
    breakStart: companyInfo.breakStart || "",
    breakEnd: companyInfo.breakEnd || "",
  });

  useEffect(() => {
    setProfileForm({
      companyName: companyInfo.name || "",
      industry: companyInfo.industry || "",
      phone: companyInfo.phone || "",
      hrContact: companyInfo.hrContact || "",
      hrEmail: companyInfo.hrEmail || "",
      description: companyInfo.description || "",
      address: companyInfo.address || "",
      breakStart: companyInfo.breakStart || "",
      breakEnd: companyInfo.breakEnd || "",
    });
  }, [
    companyInfo.name,
    companyInfo.industry,
    companyInfo.phone,
    companyInfo.hrContact,
    companyInfo.hrEmail,
    companyInfo.description,
    companyInfo.address,
    companyInfo.breakStart,
    companyInfo.breakEnd,
  ]);

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      await api.updateProfile({
        companyName: profileForm.companyName,
        industry: profileForm.industry,
        phone: profileForm.phone,
        hrContact: profileForm.hrContact,
        hrEmail: profileForm.hrEmail,
        description: profileForm.description,
        companyAddress: profileForm.address,
      });

      await refreshProfile();
      toast.success("Company profile saved successfully!");
    } catch (err: any) {
      toast.error(`Failed to save profile: ${err.message}`);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSignatureClick = () => signatureInputRef.current?.click();

  const handleSignatureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      toast.error("Please upload a valid image file (JPG, PNG, WEBP, or GIF).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Signature image must be under 5 MB.");
      return;
    }

    setIsUploadingSignature(true);
    try {
      const res = await api.uploadSignature(file);
      const url = res.signatureUrl ? resolveUploadUrl(res.signatureUrl) : URL.createObjectURL(file);
      setSignaturePreview(url);
      await refreshProfile();
      toast.success("Supervisor digital signature uploaded successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload digital signature.");
    } finally {
      setIsUploadingSignature(false);
      if (signatureInputRef.current) signatureInputRef.current.value = "";
    }
  };

  const poly = normalizePolygon(companyInfo.geofencePolygon);
  const hasPolygon = poly.length >= 3;
  const hasGps = companyInfo.latitude != null && companyInfo.longitude != null;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Company Profile</h1>
          <p className="text-muted-foreground mt-1">Manage your company information, contacts, and HTE settings</p>
        </div>
        <Button
          className="bg-primary hover:bg-primary/90 text-white gap-2 font-medium"
          onClick={handleSaveProfile}
          disabled={isSavingProfile}
        >
          {isSavingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Edit className="h-4 w-4" />}
          {isSavingProfile ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column: Identity & Break schedule */}
        <div className="space-y-6">
          {/* Identity card */}
          <Card className="border-0 shadow-sm text-center">
            <CardContent className="p-6">
              <div className="h-20 w-20 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xs">
                <span className="text-3xl font-bold text-green-600">
                  {profileForm.companyName.charAt(0) || "C"}
                </span>
              </div>
              <h3 className="font-bold text-lg">{profileForm.companyName || "Your Company"}</h3>
              <p className="text-muted-foreground text-sm">{profileForm.industry || "Industry Not Specified"}</p>
              <div className="mt-3 flex flex-col gap-2">
                <span className="inline-flex items-center justify-center gap-1.5 text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-full mx-auto font-medium">
                  <CheckCircle className="h-3 w-3" /> MOA {companyInfo.moaStatus === "active" ? "Active" : "Pending"}
                </span>
                <p className="text-xs text-muted-foreground">Accredited until: {companyInfo.accreditedUntil || "—"}</p>
              </div>

              {/* Geofence Status Pill */}
              <div className="mt-4 flex items-center justify-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                {hasPolygon
                  ? `Polygon Boundary (${poly.length} pts)`
                  : hasGps
                  ? `Circular Geofence (${companyInfo.geofenceRadius || 200}m)`
                  : "No Geofence Set"}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Company Information & Geofence Link */}
        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Company Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Company Name</Label>
                <Input
                  value={profileForm.companyName}
                  onChange={(e) => setProfileForm((p) => ({ ...p, companyName: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Industry / Sector</Label>
                <Input
                  value={profileForm.industry}
                  onChange={(e) => setProfileForm((p) => ({ ...p, industry: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Contact Person / HR In-Charge</Label>
                <Input
                  value={profileForm.hrContact}
                  onChange={(e) => setProfileForm((p) => ({ ...p, hrContact: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">HR Email Address</Label>
                <Input
                  type="email"
                  value={profileForm.hrEmail}
                  onChange={(e) => setProfileForm((p) => ({ ...p, hrEmail: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Contact Phone</Label>
                <Input
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Website / Portal</Label>
                <Input
                  value={companyInfo.website || ""}
                  placeholder="https://example.com"
                  readOnly
                  className="mt-1 bg-muted/40 cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Company Description</Label>
              <textarea
                value={profileForm.description}
                onChange={(e) => setProfileForm((p) => ({ ...p, description: e.target.value }))}
                rows={3}
                className="w-full mt-1 px-3 py-2 text-sm border border-border rounded-lg bg-background resize-none focus:outline-hidden focus:ring-2 focus:ring-ring"
                placeholder="Brief description of the organization and internship roles..."
              />
            </div>

            {/* Address & Geofence Boundary Link */}
            <div className="pt-2 border-t border-border space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Full Office Address</Label>
                <Input
                  value={profileForm.address}
                  onChange={(e) => setProfileForm((p) => ({ ...p, address: e.target.value }))}
                  className="mt-1"
                  placeholder="e.g. 3F Building Name, Avenue, City, Province"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Official address displayed on student internship deployment documents.
                </p>
              </div>

              {/* Geofence Link Banner */}
              <div className="flex items-center justify-between p-4 rounded-xl border border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 rounded-xl shrink-0">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-foreground">
                      {hasPolygon
                        ? `Polygon Boundary Active (${poly.length} points)`
                        : hasGps
                        ? `Circular Geofence (${companyInfo.geofenceRadius || 200}m radius)`
                        : "Geofence Perimeter Not Configured"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Geofence polygon boundaries and live intern monitoring are managed together in the Live Tracker.
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300 font-medium"
                  onClick={() => onNavigateToTracker?.()}
                >
                  <MapPin className="h-3.5 w-3.5" />
                  Configure in Live Tracker ➔
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section: Supervisor Signature & Change Password */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Supervisor Digital Signature</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-2">
            <input
              ref={signatureInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleSignatureChange}
            />
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="relative w-full sm:w-72 border-2 border-dashed border-muted-foreground/30 rounded-xl p-4 bg-muted/10 min-h-[100px] flex items-center justify-center overflow-hidden">
                {signaturePreview ? (
                  <img
                    src={signaturePreview}
                    alt="Supervisor Signature"
                    className="max-h-24 max-w-full object-contain mx-auto"
                  />
                ) : (
                  <div className="text-center py-3">
                    <p className="text-xs text-muted-foreground">No supervisor signature uploaded yet.</p>
                    <p className="text-[11px] text-muted-foreground/80 mt-1">Used on student DTR PDF exports.</p>
                  </div>
                )}
                {isUploadingSignature && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 text-white animate-spin" />
                  </div>
                )}
              </div>
              <div className="text-center sm:text-left">
                <button
                  type="button"
                  onClick={handleSignatureClick}
                  disabled={isUploadingSignature}
                  className="flex items-center gap-1.5 text-sm text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed font-medium mx-auto sm:mx-0"
                >
                  <Camera className="h-3.5 w-3.5" />
                  {isUploadingSignature ? "Uploading..." : signaturePreview ? "Change Signature" : "Upload Signature Image"}
                </button>
                <p className="text-xs text-muted-foreground mt-1">Clear PNG/JPG with signature · max 5 MB</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Change Password Card */}
        <ChangePasswordCard className="border-0 shadow-sm" />
      </div>
    </div>
  );
}
