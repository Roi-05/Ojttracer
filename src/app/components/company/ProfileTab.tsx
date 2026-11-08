import { useEffect, useRef, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import {
  Camera, CheckCircle, Edit, MapPin, Loader2, CheckCircle2,
  Minus, Plus, Navigation, Undo2, Trash2, Sparkles, HelpCircle,
  Crosshair, ShieldCheck, Shapes, Layers, Clock, Coffee,
} from "lucide-react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { toast } from "sonner";
import * as api from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import {
  getCurrentPosition,
  normalizePolygon,
  generateBoxPolygon,
  PolygonPoint,
  getPolygonCentroid,
} from "../../lib/geolocation";
import { resolveUploadUrl } from "../../lib/uploads";
import { ChangePasswordCard } from "../common/ChangePasswordCard";
import {
  MapContainer,
  TileLayer,
  Polygon as LeafletPolygon,
  Marker,
  Popup,
  Circle,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "../../lib/leaflet-setup";

function makeVertexMarkerIcon(index: number) {
  return L.divIcon({
    className: "",
    html: `<div style="
      width: 24px; height: 24px;
      background: #2563eb;
      color: white;
      border: 2px solid white;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 700;
      box-shadow: 0 2px 6px rgba(0,0,0,0.35);
      cursor: grab;
      user-select: none;
    ">${index + 1}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

function makeOfficeMarkerIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="
      width: 36px; height: 36px;
      background: #ef4444;
      border: 3px solid white;
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px;
      box-shadow: 0 3px 8px rgba(0,0,0,0.3);
      cursor: pointer;
    ">🏢</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -38],
  });
}

function MapEventsHandler({
  onMapClick,
  enabled,
}: {
  onMapClick: (lat: number, lng: number) => void;
  enabled: boolean;
}) {
  useMapEvents({
    click(e) {
      if (enabled) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

function MapViewController({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, Math.max(map.getZoom(), 16));
    }
  }, [center?.[0], center?.[1]]);
  return null;
}

interface ProfileTabProps {
  companyInfo: any;
}

export function ProfileTab({ companyInfo }: ProfileTabProps) {
  const { refreshProfile, user } = useAuth();
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingLocation, setIsSavingLocation] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [isUploadingSignature, setIsUploadingSignature] = useState(false);
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(
    resolveUploadUrl((user as any)?.signatureUrl ?? companyInfo.signatureUrl)
  );

  useEffect(() => {
    setSignaturePreview(resolveUploadUrl((user as any)?.signatureUrl ?? companyInfo.signatureUrl));
  }, [(user as any)?.signatureUrl, companyInfo.signatureUrl]);

  const [profileForm, setProfileForm] = useState({
    companyName: companyInfo.name,
    industry: companyInfo.industry,
    phone: companyInfo.phone,
    hrContact: companyInfo.hrContact,
    hrEmail: companyInfo.hrEmail,
    description: companyInfo.description,
    address: companyInfo.address,
    breakStart: companyInfo.breakStart || "",
    breakEnd: companyInfo.breakEnd || "",
  });

  // GPS / geofence state — prefill from saved values if available
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    companyInfo.latitude != null && companyInfo.longitude != null
      ? { lat: companyInfo.latitude, lng: companyInfo.longitude }
      : null
  );
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [geofenceRadius, setGeofenceRadius] = useState<number>(
    companyInfo.geofenceRadius || 200
  );
  const [polygonPoints, setPolygonPoints] = useState<PolygonPoint[]>(
    normalizePolygon(companyInfo.geofencePolygon)
  );
  const [addPointMode, setAddPointMode] = useState<boolean>(true);
  const [mapCenterTarget, setMapCenterTarget] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (companyInfo.latitude != null && companyInfo.longitude != null) {
      setLocation({ lat: companyInfo.latitude, lng: companyInfo.longitude });
    }
    if (companyInfo.geofenceRadius) {
      setGeofenceRadius(companyInfo.geofenceRadius);
    }
    if (companyInfo.geofencePolygon) {
      setPolygonPoints(normalizePolygon(companyInfo.geofencePolygon));
    }
    if (companyInfo.breakStart !== undefined || companyInfo.breakEnd !== undefined) {
      setProfileForm(p => ({
        ...p,
        breakStart: companyInfo.breakStart || "",
        breakEnd: companyInfo.breakEnd || "",
      }));
    }
  }, [companyInfo.latitude, companyInfo.longitude, companyInfo.geofenceRadius, JSON.stringify(companyInfo.geofencePolygon), companyInfo.breakStart, companyInfo.breakEnd]);

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
        breakStart: profileForm.breakStart || null,
        breakEnd: profileForm.breakEnd || null,
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
      const newLoc = { lat: pos.latitude, lng: pos.longitude };
      setLocation(newLoc);
      setGpsAccuracy(pos.accuracy);
      setMapCenterTarget([pos.latitude, pos.longitude]);
      
      // Auto-fill address via reverse geocoding
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.latitude}&lon=${pos.longitude}&format=json`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.display_name) {
            setProfileForm(p => ({ ...p, address: data.display_name }));
            toast.success("Location captured and address auto-filled!");
            return;
          }
        }
      } catch (e) {
        console.error("Reverse geocoding failed", e);
      }
      toast.success("Location captured! Center pinned on the map.");
    } catch (err: any) {
      toast.error(err as string);
    } finally {
      setGpsLoading(false);
    }
  };

  const handleAddVertex = (lat: number, lng: number) => {
    setPolygonPoints(prev => [...prev, [lat, lng]]);
  };

  const handleVertexDrag = (index: number, newLat: number, newLng: number) => {
    setPolygonPoints(prev => {
      const next = [...prev];
      next[index] = [newLat, newLng];
      return next;
    });
  };

  const handleRemoveVertex = (index: number) => {
    setPolygonPoints(prev => prev.filter((_, i) => i !== index));
    toast.info(`Removed vertex #${index + 1}`);
  };

  const handleUndoLastPoint = () => {
    setPolygonPoints(prev => prev.slice(0, -1));
  };

  const handleClearPolygon = () => {
    setPolygonPoints([]);
    toast.info("Polygon perimeter cleared. Circular geofence fallback restored.");
  };

  const handleGenerateShape = () => {
    const centerLat = location?.lat ?? (polygonPoints.length > 0 ? polygonPoints[0][0] : 14.5995);
    const centerLng = location?.lng ?? (polygonPoints.length > 0 ? polygonPoints[0][1] : 120.9842);
    const box = generateBoxPolygon(centerLat, centerLng, geofenceRadius || 150);
    setPolygonPoints(box);
    setMapCenterTarget([centerLat, centerLng]);
    toast.success("Generated rectangular shape around office! Drag any corner point to customize.", { duration: 4000 });
  };

  const saveLocation = async () => {
    const effectiveLat = location?.lat ?? (polygonPoints.length > 0 ? polygonPoints[0][0] : null);
    const effectiveLng = location?.lng ?? (polygonPoints.length > 0 ? polygonPoints[0][1] : null);

    if (effectiveLat == null || effectiveLng == null) {
      toast.error("Please capture your GPS location or place polygon points on the map first.");
      return;
    }
    setIsSavingLocation(true);
    try {
      const companyId = (user as any)?.id;
      const validPolygon = polygonPoints.length >= 3 ? polygonPoints : null;

      await api.updateCompanyLocation(
        companyId,
        effectiveLat,
        effectiveLng,
        geofenceRadius,
        validPolygon
      );
      await refreshProfile();

      if (validPolygon) {
        toast.success(`📍 Polygon geofence saved! (${validPolygon.length} boundary points)`);
      } else {
        toast.success(`📍 Geofence saved! (${geofenceRadius}m circular radius fallback)`);
      }
    } catch (e: any) {
      toast.error(`Failed to save location: ${e.message}`);
    } finally {
      setIsSavingLocation(false);
    }
  };

  const handleSignatureClick = () => signatureInputRef.current?.click();

  const handleSignatureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Signature image must be under 5 MB.");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setSignaturePreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    setIsUploadingSignature(true);
    try {
      const res = await api.uploadSignature(file);
      setSignaturePreview(resolveUploadUrl(res.signatureUrl));
      await refreshProfile();
      toast.success("Supervisor signature updated!");
    } catch (err: any) {
      toast.error(`Failed to upload signature: ${err.message}`);
      setSignaturePreview(resolveUploadUrl((user as any)?.signatureUrl ?? companyInfo.signatureUrl));
    } finally {
      setIsUploadingSignature(false);
      e.target.value = "";
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

            {/* Break time policy in identity card */}
            <div className={`mt-2 flex items-center justify-center gap-1.5 text-xs px-3 py-1.5 rounded-full ${
              profileForm.breakStart && profileForm.breakEnd ? "bg-amber-50 text-amber-800 border border-amber-200" : "bg-muted text-muted-foreground"
            }`}>
              <Coffee className="h-3 w-3 shrink-0" />
              {profileForm.breakStart && profileForm.breakEnd ? `Break: ${profileForm.breakStart} – ${profileForm.breakEnd}` : "Break: Paid / No deduction"}
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

            {/* Break Time Policy Section */}
            <div>
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-border flex-wrap gap-2">
                <div>
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Coffee className="h-4 w-4 text-amber-600" />
                    Daily Break Time (Optional)
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    If your company does not count lunch or break periods as working hours, specify the window below. It will automatically be deducted from daily intern DTR hours.
                  </p>
                </div>
                {profileForm.breakStart && profileForm.breakEnd ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
                    <Clock className="w-3 h-3 text-amber-600" />
                    Deduction: {profileForm.breakStart} – {profileForm.breakEnd}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                    All hours counted (No deduction)
                  </span>
                )}
              </div>

              <div className="rounded-xl border border-border p-4 bg-muted/20 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-medium">Break Start Time</Label>
                    <Input
                      type="time"
                      value={profileForm.breakStart}
                      onChange={e => setProfileForm(p => ({ ...p, breakStart: e.target.value }))}
                      className="mt-1 bg-card"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">e.g. 12:00 (Lunch start)</p>
                  </div>
                  <div>
                    <Label className="text-xs font-medium">Break End Time</Label>
                    <Input
                      type="time"
                      value={profileForm.breakEnd}
                      onChange={e => setProfileForm(p => ({ ...p, breakEnd: e.target.value }))}
                      className="mt-1 bg-card"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">e.g. 13:00 (Lunch end)</p>
                  </div>
                </div>

                <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-border/60 text-xs">
                  <p className="text-muted-foreground">
                    💡 Leave empty if break time is counted as paid working hours. Click "Save Changes" at the top to apply.
                  </p>
                  {(profileForm.breakStart || profileForm.breakEnd) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 gap-1"
                      onClick={() => setProfileForm(p => ({ ...p, breakStart: "", breakEnd: "" }))}
                    >
                      <Trash2 className="h-3 w-3" /> Clear Break Time
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Address + GPS Geofence Section */}
            <div>
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-border flex-wrap gap-2">
                <div>
                  <h3 className="font-semibold text-sm">Office Address & Geofence Perimeter</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Define the boundary perimeter where interns are permitted to Time In and Time Out for DTR.
                  </p>
                </div>
                {polygonPoints.length >= 3 ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Polygon Boundary Active ({polygonPoints.length} pts)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    Circular Radius ({geofenceRadius}m fallback)
                  </span>
                )}
              </div>

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
                  <p className="text-xs text-muted-foreground mt-1">
                    Display text shown on deployment documents. For DTR attendance gating, use the polygon perimeter below.
                  </p>
                </div>

                {/* GPS Capture Panel */}
                <div className="rounded-xl border border-border p-4 space-y-3 bg-muted/20">
                  {/* Mobile device warning */}
                  <div className="flex items-start gap-2 text-xs bg-amber-50 text-amber-800 px-3 py-2.5 rounded-lg border border-amber-200">
                    <span className="text-base leading-none mt-0.5">📱</span>
                    <div>
                      <p className="font-semibold">Mobile GPS Recommended</p>
                      <p className="mt-0.5 text-amber-700">
                        Open this page on your smartphone at the office for precise meter-level GPS capture. You can also visually position the perimeter on the map below.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <p className="text-sm font-semibold flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 text-blue-600" /> GPS Center & Office Location
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Capture your location or click the map to place the office marker.
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
                    <div className="space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs bg-green-50 text-green-700 px-3 py-2 rounded-lg border border-green-200">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                          <span className="font-mono">{location.lat.toFixed(6)}° N, {location.lng.toFixed(6)}° E</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setMapCenterTarget([location.lat, location.lng])}
                            className="text-blue-700 hover:text-blue-800 hover:underline flex items-center gap-1 font-medium bg-blue-100/50 px-2 py-1 rounded"
                          >
                            <Crosshair className="h-3 w-3 shrink-0" /> Center Map
                          </button>
                          <a 
                            href={`https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-blue-700 hover:text-blue-800 hover:underline flex items-center gap-1 font-medium bg-blue-100/50 px-2 py-1 rounded"
                          >
                            <Navigation className="h-3 w-3 shrink-0" /> Google Maps
                          </a>
                        </div>
                      </div>
                      {/* Accuracy badge */}
                      {gpsAccuracy !== null && (
                        <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border ${
                          gpsAccuracy <= 20
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : gpsAccuracy <= 100
                            ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          <span className="font-bold">
                            {gpsAccuracy <= 20 ? '✅' : gpsAccuracy <= 100 ? '⚠️' : '❌'}
                          </span>
                          GPS Accuracy: ±{gpsAccuracy}m —
                          {gpsAccuracy <= 20 && ' Excellent (safe to save)'}
                          {gpsAccuracy > 20 && gpsAccuracy <= 100 && ' Fair (consider recapturing on mobile)'}
                          {gpsAccuracy > 100 && ' Poor — use a mobile phone for accurate location'}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic px-1">
                      No office GPS center recorded yet. Capture GPS or place points on the map.
                    </p>
                  )}
                </div>

                {/* Polygon Geofence Map Editor */}
                <div className="rounded-xl border border-border overflow-hidden bg-card shadow-sm space-y-3 p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <Shapes className="h-4 w-4 text-blue-600" />
                        Interactive Polygon Boundary Editor
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Click on the map to add boundary points. Drag numbered markers to fit your building or property perimeter.
                      </p>
                    </div>

                    {/* Toolbar buttons */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 text-xs text-blue-700 border-blue-200 bg-blue-50/60 hover:bg-blue-100/70"
                        onClick={handleGenerateShape}
                      >
                        <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                        Generate Shape Around Office
                      </Button>
                      <Button
                        type="button"
                        variant={addPointMode ? "default" : "outline"}
                        size="sm"
                        className={`h-8 gap-1.5 text-xs ${addPointMode ? "bg-blue-600 text-white" : ""}`}
                        onClick={() => setAddPointMode(m => !m)}
                      >
                        <MapPin className="h-3.5 w-3.5" />
                        {addPointMode ? "Clicking Adds Points (ON)" : "Add Points (OFF)"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1 text-xs"
                        onClick={handleUndoLastPoint}
                        disabled={polygonPoints.length === 0}
                      >
                        <Undo2 className="h-3.5 w-3.5" /> Undo
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
                        onClick={handleClearPolygon}
                        disabled={polygonPoints.length === 0}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Clear
                      </Button>
                    </div>
                  </div>

                  {/* Leaflet Map */}
                  <div className="relative rounded-lg overflow-hidden border border-border" style={{ height: "380px", zIndex: 0 }}>
                    <MapContainer
                      center={
                        location
                          ? [location.lat, location.lng]
                          : polygonPoints.length > 0
                          ? polygonPoints[0]
                          : [14.5995, 120.9842]
                      }
                      zoom={16}
                      style={{ height: "100%", width: "100%" }}
                      scrollWheelZoom
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />

                      <MapEventsHandler onMapClick={handleAddVertex} enabled={addPointMode} />
                      <MapViewController center={mapCenterTarget} />

                      {/* Office marker */}
                      {location && (
                        <Marker
                          position={[location.lat, location.lng]}
                          icon={makeOfficeMarkerIcon()}
                        >
                          <Popup>
                            <div className="text-xs font-semibold">🏢 Office Location</div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                            </div>
                          </Popup>
                        </Marker>
                      )}

                      {/* Fallback circular perimeter when < 3 polygon points */}
                      {polygonPoints.length < 3 && location && (
                        <Circle
                          center={[location.lat, location.lng]}
                          radius={geofenceRadius}
                          pathOptions={{
                            color: "#3b82f6",
                            fillColor: "#3b82f6",
                            fillOpacity: 0.08,
                            weight: 2,
                            dashArray: "6 4",
                          }}
                        />
                      )}

                      {/* Polygon perimeter */}
                      {polygonPoints.length >= 3 && (
                        <LeafletPolygon
                          positions={polygonPoints}
                          pathOptions={{
                            color: "#2563eb",
                            fillColor: "#3b82f6",
                            fillOpacity: 0.18,
                            weight: 2.5,
                          }}
                        />
                      )}

                      {/* Vertex markers (draggable) */}
                      {polygonPoints.map((pt, index) => (
                        <Marker
                          key={`vertex-${index}-${pt[0]}-${pt[1]}`}
                          position={pt}
                          icon={makeVertexMarkerIcon(index)}
                          draggable={true}
                          eventHandlers={{
                            dragend: (e) => {
                              const marker = e.target;
                              const { lat, lng } = marker.getLatLng();
                              handleVertexDrag(index, lat, lng);
                            },
                          }}
                        >
                          <Popup>
                            <div className="text-xs font-semibold">Vertex #{index + 1}</div>
                            <p className="text-[11px] text-muted-foreground mt-0.5 mb-1.5 font-mono">
                              {pt[0].toFixed(6)}, {pt[1].toFixed(6)}
                            </p>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="h-6 text-[11px] px-2 py-0 w-full"
                              onClick={() => handleRemoveVertex(index)}
                            >
                              <Trash2 className="h-3 w-3 mr-1" /> Delete Point
                            </Button>
                          </Popup>
                        </Marker>
                      ))}
                    </MapContainer>

                    {/* Mode banner over map */}
                    <div className="absolute top-2 left-2 z-[1000] bg-white/90 dark:bg-black/80 backdrop-blur-xs px-2.5 py-1 rounded-md border text-xs shadow-xs font-medium flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                      {polygonPoints.length >= 3 ? (
                        <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                          Polygon Boundary ({polygonPoints.length} vertices)
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          {polygonPoints.length === 0
                            ? `Fallback circular mode (${geofenceRadius}m radius)`
                            : `Placed ${polygonPoints.length} point(s) — add ${3 - polygonPoints.length} more to close`}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Guidance text */}
                  <div className="text-xs text-muted-foreground flex items-center justify-between flex-wrap gap-2 pt-1">
                    <p className="flex items-center gap-1">
                      <HelpCircle className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                      <span>
                        {polygonPoints.length >= 3
                          ? "Students must be inside this closed polygon perimeter to Time In/Out."
                          : "Students must be within the circular radius until a 3+ point polygon perimeter is defined."}
                      </span>
                    </p>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {polygonPoints.length} point(s) placed
                    </span>
                  </div>

                  {/* Circular radius slider (fallback & helper) */}
                  <div className="pt-2 border-t border-border/60">
                    <div className="flex items-center justify-between mb-1.5">
                      <Label className="text-xs">
                        Fallback Radius / Shape Size
                        <span className="text-muted-foreground ml-1 font-normal">(used if polygon is cleared or when generating shapes)</span>
                      </Label>
                      <span className="text-xs font-bold text-blue-600">{geofenceRadius}m</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => setGeofenceRadius(r => Math.max(50, r - 50))}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <input
                        type="range"
                        min={50}
                        max={500}
                        step={50}
                        value={geofenceRadius}
                        onChange={e => setGeofenceRadius(Number(e.target.value))}
                        className="flex-1 accent-blue-600"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => setGeofenceRadius(r => Math.min(500, r + 50))}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Save location button */}
                  <div className="pt-2 flex justify-end">
                    <Button
                      type="button"
                      size="sm"
                      className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={saveLocation}
                      disabled={isSavingLocation}
                    >
                      {isSavingLocation ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <ShieldCheck className="h-3.5 w-3.5" />
                      )}
                      {isSavingLocation ? "Saving Geofence…" : "Save Geofence & Location"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
                  <img src={signaturePreview} alt="Supervisor Signature" className="max-h-24 max-w-full object-contain mx-auto" />
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
