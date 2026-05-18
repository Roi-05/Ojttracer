import { useState } from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { CheckCircle, Edit, MapPin, Loader2, CheckCircle2, Minus, Plus, Navigation } from "lucide-react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { toast } from "sonner";
import * as api from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import { getCurrentPosition } from "../../lib/geolocation";

interface ProfileTabProps {
  companyInfo: any;
}

export function ProfileTab({ companyInfo }: ProfileTabProps) {
  const { refreshProfile, user } = useAuth();
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingLocation, setIsSavingLocation] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

  const [profileForm, setProfileForm] = useState({
    companyName: companyInfo.name,
    industry: companyInfo.industry,
    phone: companyInfo.phone,
    hrContact: companyInfo.hrContact,
    hrEmail: companyInfo.hrEmail,
    description: companyInfo.description,
    address: companyInfo.address,
  });

  // GPS / geofence state — prefill from saved values if available
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    companyInfo.latitude != null && companyInfo.longitude != null
      ? { lat: companyInfo.latitude, lng: companyInfo.longitude }
      : null
  );
  const [geofenceRadius, setGeofenceRadius] = useState<number>(
    companyInfo.geofenceRadius || 200
  );

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
      toast.success("Profile updated successfully!");
    } catch (e: any) {
      toast.error(`Failed to update profile: ${e.message}`);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const captureGPS = async () => {
    setGpsLoading(true);
    try {
      const pos = await getCurrentPosition();
      setLocation({ lat: pos.latitude, lng: pos.longitude });
      toast.success("Location captured! Click \"Save Location\" to apply.");
    } catch (err: any) {
      toast.error(err as string);
    } finally {
      setGpsLoading(false);
    }
  };

  const saveLocation = async () => {
    if (!location) {
      toast.error("Capture your GPS location first.");
      return;
    }
    setIsSavingLocation(true);
    try {
      const companyId = (user as any)?.id;
      await api.updateCompanyLocation(companyId, location.lat, location.lng, geofenceRadius);
      toast.success(`📍 Location saved! Geofence set to ${geofenceRadius}m.`);
    } catch (e: any) {
      toast.error(`Failed to save location: ${e.message}`);
    } finally {
      setIsSavingLocation(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Company Profile</h1>
          <p className="text-muted-foreground mt-1">Manage your company information and HTE accreditation</p>
        </div>
        <Button
          className="bg-primary hover:bg-primary/90 text-white gap-2"
          onClick={handleSaveProfile}
          disabled={isSavingProfile}
        >
          {isSavingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Edit className="h-4 w-4" />}
          {isSavingProfile ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Identity card */}
        <Card className="border-0 shadow-sm text-center">
          <CardContent className="p-6">
            <div className="h-20 w-20 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl font-bold text-green-600">
                {profileForm.companyName.charAt(0) || "C"}
              </span>
            </div>
            <h3 className="font-bold text-lg">{profileForm.companyName}</h3>
            <p className="text-muted-foreground text-sm">{profileForm.industry}</p>
            <div className="mt-3 flex flex-col gap-2">
              <span className="inline-flex items-center justify-center gap-1.5 text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-full mx-auto">
                <CheckCircle className="h-3 w-3" /> MOA {companyInfo.moaStatus === 'active' ? 'Active' : 'Pending'}
              </span>
              <p className="text-xs text-muted-foreground">Accredited until: {companyInfo.accreditedUntil || "—"}</p>
            </div>

            {/* GPS status in identity card */}
            <div className={`mt-4 flex items-center justify-center gap-1.5 text-xs px-3 py-1.5 rounded-full ${
              location ? "bg-blue-50 text-blue-700" : "bg-muted text-muted-foreground"
            }`}>
              <Navigation className="h-3 w-3 shrink-0" />
              {location ? "GPS Location Set" : "No GPS Location"}
            </div>
          </CardContent>
        </Card>

        {/* Form fields */}
        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardContent className="p-6 space-y-6">
            {/* Company Info */}
            <div>
              <h3 className="font-semibold text-sm mb-4 pb-2 border-b border-border">Company Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-xs text-muted-foreground">Company Name</Label><Input value={profileForm.companyName} onChange={e => setProfileForm(p => ({ ...p, companyName: e.target.value }))} className="mt-1" /></div>
                <div><Label className="text-xs text-muted-foreground">Industry</Label><Input value={profileForm.industry} onChange={e => setProfileForm(p => ({ ...p, industry: e.target.value }))} className="mt-1" /></div>
                <div><Label className="text-xs text-muted-foreground">Supervisor</Label><Input value={profileForm.hrContact} onChange={e => setProfileForm(p => ({ ...p, hrContact: e.target.value }))} className="mt-1" /></div>
                <div><Label className="text-xs text-muted-foreground">Supervisor Email</Label><Input value={profileForm.hrEmail} onChange={e => setProfileForm(p => ({ ...p, hrEmail: e.target.value }))} className="mt-1" /></div>
                <div><Label className="text-xs text-muted-foreground">Phone</Label><Input value={profileForm.phone} onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))} className="mt-1" /></div>
                <div>
                  <Label className="text-xs text-muted-foreground">MOA Status</Label>
                  <div className="mt-1 flex items-center gap-2 h-10 px-3 bg-muted/30 rounded-lg">
                    {companyInfo.moaStatus === 'active' ? (
                      <><CheckCircle2 className="h-4 w-4 text-green-600" /><span className="text-sm text-green-700 font-medium">Active</span></>
                    ) : (
                      <span className="text-sm text-orange-700 font-medium">Pending Verification</span>
                    )}
                  </div>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs text-muted-foreground">Company Description</Label>
                  <textarea rows={3} value={profileForm.description} onChange={e => setProfileForm(p => ({ ...p, description: e.target.value }))} className="w-full mt-1 border border-border rounded-lg p-2 text-sm bg-card resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              </div>
            </div>

            {/* Address + GPS Section */}
            <div>
              <h3 className="font-semibold text-sm mb-4 pb-2 border-b border-border">Office Address & GPS Geofence</h3>
              <div className="space-y-4">
                {/* Plain text address */}
                <div>
                  <Label className="text-xs text-muted-foreground">Full Address</Label>
                  <Input
                    value={profileForm.address}
                    onChange={e => setProfileForm(p => ({ ...p, address: e.target.value }))}
                    className="mt-1"
                    placeholder="e.g. 3F Ayala Building, Makati City, Metro Manila"
                  />
                  <p className="text-xs text-muted-foreground mt-1">This is shown as display text. For precise DTR geofencing, use GPS capture below.</p>
                </div>

                {/* GPS Capture Panel */}
                <div className="rounded-xl border border-border p-4 space-y-3 bg-muted/20">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <p className="text-sm font-semibold flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 text-blue-600" /> GPS Location for DTR
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Go to your office and press Capture to set the geofence center.
                        Students must be within the radius to Time In/Out.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50 shrink-0"
                      onClick={captureGPS}
                      disabled={gpsLoading}
                    >
                      {gpsLoading
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Navigation className="h-3.5 w-3.5" />}
                      {gpsLoading ? "Locating…" : "Capture GPS"}
                    </Button>
                  </div>

                  {/* Coordinates display */}
                  {location ? (
                    <div className="flex items-center gap-2 text-xs bg-green-50 text-green-700 px-3 py-2 rounded-lg border border-green-200">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                      <span className="font-mono">{location.lat.toFixed(6)}° N, {location.lng.toFixed(6)}° E</span>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic px-1">
                      No GPS location set yet. Students can still use DTR without geofencing.
                    </p>
                  )}

                  {/* Radius slider — always show if location is set */}
                  {location && (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <Label className="text-xs">Geofence Radius</Label>
                        <span className="text-xs font-bold text-blue-600">{geofenceRadius}m</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button type="button" variant="outline" size="icon" className="h-7 w-7 shrink-0"
                          onClick={() => setGeofenceRadius(r => Math.max(50, r - 50))}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <input
                          type="range" min={50} max={500} step={50}
                          value={geofenceRadius}
                          onChange={e => setGeofenceRadius(Number(e.target.value))}
                          className="flex-1 accent-blue-600"
                        />
                        <Button type="button" variant="outline" size="icon" className="h-7 w-7 shrink-0"
                          onClick={() => setGeofenceRadius(r => Math.min(500, r + 50))}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Students must be within <strong>{geofenceRadius}m</strong> to Time In/Out.
                        <span className="ml-1 text-muted-foreground/60">(50m–500m)</span>
                      </p>
                    </div>
                  )}

                  {/* Save location button — separate from the main profile save */}
                  <div className="pt-1 flex justify-end">
                    <Button
                      type="button"
                      size="sm"
                      className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={saveLocation}
                      disabled={!location || isSavingLocation}
                    >
                      {isSavingLocation ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MapPin className="h-3.5 w-3.5" />}
                      {isSavingLocation ? "Saving…" : "Save Location"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
