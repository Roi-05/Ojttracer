import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../ui/dialog";
import {
  Camera,
  CameraOff,
  Download,
  FileText,
  Loader2,
  CheckCircle2,
  XCircle,
  MapPin,
  AlertTriangle,
  Smartphone,
  ShieldCheck,
  ShieldAlert,
  Clock,
  RefreshCw,
  Crosshair,
  Maximize2,
  Minimize2,
  Navigation,
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, Circle, Polygon, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "../../lib/leaflet-setup";
import { DTRRecord } from "../../hooks/useStudentData";
import { resolveUploadUrl } from "../../lib/uploads";
import { formatDate, monthLabel, TODAY_LABEL, TODAY_DAY } from "./shared";
import { getOrCreateDeviceToken, getDeviceName } from "../../lib/device";
import { generateDTRDOCX } from "../../lib/generateDTR";
import { generateDTRPDF } from "../../lib/generateDTRPDF";
import { normalizePolygon, getPolygonCentroid, checkGeofence, getCurrentPosition } from "../../lib/geolocation";
import { toast } from "sonner";

type GeofenceStatus = "idle" | "checking" | "allowed" | "denied" | "out_of_range" | "no_gps";

function makeCompanyMarker() {
  return L.divIcon({
    className: "",
    html: `
      <div style="
        width: 36px; height: 36px;
        background: #2563eb;
        border: 3px solid #ffffff;
        border-radius: 10px;
        display: flex; align-items: center; justify-content: center;
        font-size: 18px;
        box-shadow: 0 4px 12px rgba(37, 99, 235, 0.45);
      ">🏢</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -38],
  });
}

function makeStudentMarker(isInside: boolean, initials: string) {
  const bg = isInside ? "#10b981" : "#ef4444";
  const glow = isInside ? "rgba(16, 185, 129, 0.45)" : "rgba(239, 68, 68, 0.45)";
  return L.divIcon({
    className: "",
    html: `
      <div style="position: relative; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center;">
        <div style="
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          background: ${glow};
          animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        "></div>
        <div style="
          position: relative;
          width: 30px; height: 30px;
          background: ${bg};
          border: 2.5px solid #ffffff;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-weight: 700;
          font-size: 11px;
          color: white;
          box-shadow: 0 3px 10px rgba(0,0,0,0.35);
        ">
          ${initials || "ME"}
        </div>
      </div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -22],
  });
}

function MapBoundsFitter({
  studentPos,
  companyPos,
  polygon,
  fitTrigger,
}: {
  studentPos: [number, number] | null;
  companyPos: [number, number] | null;
  polygon: [number, number][];
  fitTrigger: number;
}) {
  const map = useMap();

  useEffect(() => {
    const t = setTimeout(() => {
      map.invalidateSize();
    }, 200);
    return () => clearTimeout(t);
  }, [map, fitTrigger]);

  useEffect(() => {
    const points: [number, number][] = [];
    if (polygon.length >= 3) {
      polygon.forEach((p) => points.push(p));
    } else if (companyPos) {
      points.push(companyPos);
    }
    if (studentPos) {
      points.push(studentPos);
    }

    if (points.length === 1) {
      map.setView(points[0], 16, { animate: true });
    } else if (points.length > 1) {
      map.fitBounds(points, { padding: [40, 40], animate: true, maxZoom: 18 });
    }
  }, [map, studentPos, companyPos, polygon, fitTrigger]);

  return null;
}

interface DTRTabProps {
  dtrRecords: DTRRecord[];
  todayRecord: DTRRecord | null;
  openCamera: (mode: "in" | "out") => void;
  geofenceStatus?: GeofenceStatus;
  deviceInfo?: {
    registeredDeviceToken: string | null;
    registeredDeviceName: string | null;
    deviceRegisteredAt: string | null;
    deviceResetRequested?: boolean;
  };
  onRegisterDevice?: () => Promise<void>;
  onRequestResetDevice?: () => Promise<void>;
  studentProfile?: {
    name?: string;
    firstName?: string;
    lastName?: string;
    middleName?: string;
    signatureUrl?: string | null;
  };
  supervisorSignatureUrl?: string | null;
  companyLocation?: {
    latitude: number | null;
    longitude: number | null;
    geofenceRadius: number;
    geofencePolygon?: [number, number][] | null;
    companyName: string;
    companyAddress?: string;
  };
}

export function DTRTab({
  dtrRecords,
  todayRecord,
  openCamera,
  geofenceStatus = "idle",
  deviceInfo,
  onRegisterDevice,
  onRequestResetDevice,
  studentProfile = {},
  supervisorSignatureUrl = null,
  companyLocation,
}: DTRTabProps) {
  const [registering, setRegistering] = useState(false);
  const [requestingReset, setRequestingReset] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Live GPS tracking state for student perimeter map
  const [studentLoc, setStudentLoc] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [locLoading, setLocLoading] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const [fitTrigger, setFitTrigger] = useState(0);
  const [isMapExpanded, setIsMapExpanded] = useState(false);

  const refreshLocation = useCallback(async (notify = false) => {
    setLocLoading(true);
    setLocError(null);
    try {
      const pos = await getCurrentPosition();
      setStudentLoc({ lat: pos.latitude, lng: pos.longitude, accuracy: pos.accuracy });
      setFitTrigger((c) => c + 1);
      if (notify) {
        toast.success("GPS location updated");
      }
    } catch (err: any) {
      const msg = typeof err === "string" ? err : "Failed to obtain current GPS location.";
      setLocError(msg);
      if (notify) {
        toast.error(msg);
      }
    } finally {
      setLocLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshLocation(false);
  }, [refreshLocation]);

  const toggleMapExpanded = () => {
    setIsMapExpanded((prev) => !prev);
    setTimeout(() => setFitTrigger((c) => c + 1), 150);
  };

  const companyPolygon = normalizePolygon(companyLocation?.geofencePolygon);
  const companyCentroid = getPolygonCentroid(companyPolygon);
  const companyCenter: [number, number] | null =
    companyLocation?.latitude && companyLocation?.longitude
      ? [companyLocation.latitude, companyLocation.longitude]
      : companyCentroid;

  const defaultCenter: [number, number] =
    companyCenter || (studentLoc ? [studentLoc.lat, studentLoc.lng] : [15.0794, 120.6200]);

  const geofenceResult =
    studentLoc && companyLocation
      ? checkGeofence(
          studentLoc.lat,
          studentLoc.lng,
          companyLocation.latitude,
          companyLocation.longitude,
          companyLocation.geofenceRadius || 200,
          companyPolygon
        )
      : null;

  const hasPerimeter =
    companyPolygon.length >= 3 ||
    (companyLocation?.latitude != null && companyLocation?.longitude != null);
  const isInside = !hasPerimeter || (geofenceResult?.allowed ?? false);
  const studentInitials =
    `${studentProfile?.firstName?.charAt(0) || ""}${studentProfile?.lastName?.charAt(0) || ""}`.toUpperCase() || "ME";
  const hasTimeIn = !!todayRecord?.timeIn;
  const hasTimeOut = !!todayRecord?.timeOut;
  const sortedRecords = [...dtrRecords].sort((a, b) => b.date.localeCompare(a.date));
  const approvedCount = dtrRecords.filter((r) => r.status === "approved").length;

  const getDTRPayload = () => {
    const entriesByMonth: Record<string, DTRRecord[]> = {};
    const approved = dtrRecords
      .filter((r) => r.status === "approved" && !!r.date)
      .sort((a, b) => a.date.localeCompare(b.date));

    for (const e of approved) {
      const mLabel = monthLabel(e.date);
      if (mLabel === "—") continue;
      if (!entriesByMonth[mLabel]) entriesByMonth[mLabel] = [];
      entriesByMonth[mLabel].push(e);
    }

    return {
      studentName: studentProfile.name || "",
      firstName: studentProfile.firstName || "",
      lastName: studentProfile.lastName || "",
      middleInitial: studentProfile.middleName ? studentProfile.middleName.charAt(0) + "." : "",
      schoolYear: (studentProfile as any).schoolYear || "",
      signatureUrl: studentProfile.signatureUrl || null,
      supervisorSignatureUrl: supervisorSignatureUrl || null,
      months: Object.entries(entriesByMonth).map(([month, entries]) => ({
        month,
        entries: entries.map((e) => ({
          date: e.date,
          timeIn: e.timeIn,
          timeOut: e.timeOut,
          hours: e.hours,
          status: e.status,
        })),
      })),
    };
  };

  const handleDownloadPDF = async () => {
    const payload = getDTRPayload();
    toast.promise(generateDTRPDF(payload), {
      loading: "Compiling DTR PDF...",
      success: "DTR PDF downloaded successfully!",
      error: "Failed to compile DTR PDF. Please try again.",
    });
  };

  const handleDownloadDOCX = async () => {
    const payload = getDTRPayload();
    toast.promise(generateDTRDOCX(payload), {
      loading: "Generating DTR Word document...",
      success: "DTR (.docx) downloaded successfully!",
      error: "Failed to generate DTR Word document. Please try again.",
    });
  };

  const localToken = getOrCreateDeviceToken();
  const currentDeviceName = getDeviceName();
  const isDeviceRegistered = !!deviceInfo?.registeredDeviceToken;
  const isCurrentDeviceBound = isDeviceRegistered && deviceInfo.registeredDeviceToken === localToken;
  const isResetPending = !!deviceInfo?.deviceResetRequested;

  const handleRegister = async () => {
    if (!onRegisterDevice) return;
    try {
      setRegistering(true);
      await onRegisterDevice();
    } finally {
      setRegistering(false);
    }
  };

  const handleRequestReset = async () => {
    if (!onRequestResetDevice) return;
    try {
      setRequestingReset(true);
      await onRequestResetDevice();
      setShowResetConfirm(false);
    } finally {
      setRequestingReset(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Attendance (DTR)</h1>
          <p className="text-muted-foreground mt-1">Daily Time Record — clock in and out with a selfie on your registered phone</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <Button
            className="gap-2 bg-primary hover:bg-primary/90 text-white shadow-sm"
            onClick={handleDownloadPDF}
            disabled={approvedCount === 0}
            title={approvedCount === 0 ? "No approved DTR records to export" : "Export approved DTR as PDF"}
          >
            <Download className="h-4 w-4" /> Export DTR (PDF)
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-border text-muted-foreground hover:text-foreground"
            onClick={handleDownloadDOCX}
            disabled={approvedCount === 0}
            title="Download editable Word document (.docx)"
          >
            <FileText className="h-3.5 w-3.5" /> Word (.docx)
          </Button>
        </div>
      </div>

      {/* Device Registration Banner */}
      {!isDeviceRegistered ? (
        <Card className="border-amber-200 bg-amber-50/70 shadow-sm">
          <CardContent className="pt-5 pb-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center shrink-0">
                  <ShieldAlert className="h-5 w-5 text-amber-700" />
                </div>
                <div>
                  <h3 className="font-semibold text-amber-900 text-sm sm:text-base">Phone Registration Required</h3>
                  <p className="text-xs text-amber-800 mt-0.5 max-w-xl">
                    To log your DTR, you must bind this device to your student account. Once registered, attendance can only be logged from this phone.
                  </p>
                  <p className="text-[11px] font-medium text-amber-700 mt-1">
                    Current Device: <span className="underline">{currentDeviceName}</span>
                  </p>
                </div>
              </div>
              <Button
                onClick={handleRegister}
                disabled={registering}
                className="bg-amber-600 hover:bg-amber-700 text-white gap-2 shrink-0 font-medium text-xs sm:text-sm h-10 shadow-sm"
              >
                {registering ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
                {registering ? "Registering Device…" : "Register This Phone"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : !isCurrentDeviceBound ? (
        <Card className="border-red-200 bg-red-50/70 shadow-sm">
          <CardContent className="pt-5 pb-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-red-100 border border-red-300 flex items-center justify-center shrink-0">
                  <XCircle className="h-5 w-5 text-red-700" />
                </div>
                <div>
                  <h3 className="font-semibold text-red-900 text-sm sm:text-base">Unregistered Phone Detected</h3>
                  <p className="text-xs text-red-800 mt-0.5 max-w-xl">
                    Your account is registered to another device (<span className="font-semibold">{deviceInfo?.registeredDeviceName || "Registered Device"}</span>). DTR access is locked on this browser.
                  </p>
                  {isResetPending ? (
                    <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium bg-amber-100 text-amber-800 border border-amber-300">
                      <Clock className="h-3.5 w-3.5 text-amber-600 animate-pulse" />
                      Reset Request Sent — Pending Supervisor Approval
                    </div>
                  ) : (
                    <p className="text-[11px] text-red-700 mt-1">
                      Switched phones or browsers? Submit a device reset request for your Supervisor or OJT Coordinator to approve.
                    </p>
                  )}
                </div>
              </div>
              {!isResetPending && (
                <Button
                  onClick={() => setShowResetConfirm(true)}
                  variant="destructive"
                  className="shrink-0 font-medium text-xs sm:text-sm h-10 shadow-sm gap-2"
                >
                  <Smartphone className="h-4 w-4" /> Request Device Reset
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-emerald-50/80 border border-emerald-200/80 text-emerald-800 text-xs sm:text-sm shadow-2xs">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>
              Registered Device: <strong className="font-medium text-emerald-900">{deviceInfo?.registeredDeviceName}</strong>
            </span>
          </div>
          <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
            <Smartphone className="h-3 w-3" /> Bound & Verified
          </span>
        </div>
      )}

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Today's Attendance</CardTitle>
          <CardDescription>{TODAY_LABEL} — {TODAY_DAY}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Live Geofence Tracking Map */}
          <div className="rounded-xl border border-border overflow-hidden bg-card shadow-xs">
            {/* Map Top Bar */}
            <div className="flex items-center justify-between px-3.5 py-2.5 bg-muted/40 border-b border-border flex-wrap gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Navigation className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-foreground">
                      Company Perimeter & Live GPS
                    </span>
                    {locLoading ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        <Loader2 className="h-2.5 w-2.5 animate-spin shrink-0" /> Acquiring GPS…
                      </span>
                    ) : locError ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200" title={locError}>
                        <AlertTriangle className="h-2.5 w-2.5 shrink-0" /> Location Error
                      </span>
                    ) : !hasPerimeter ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        <MapPin className="h-2.5 w-2.5 shrink-0" /> No Perimeter Set
                      </span>
                    ) : isInside ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="h-2.5 w-2.5 shrink-0" /> Within Allowed Perimeter
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                        <XCircle className="h-2.5 w-2.5 shrink-0" /> Outside Perimeter ({geofenceResult?.distance ?? 0}m away)
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {companyLocation?.companyName || "Assigned Company"} {companyLocation?.companyAddress ? `· ${companyLocation.companyAddress}` : ""}
                  </p>
                </div>
              </div>

              {/* Map Action Controls */}
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs gap-1.5 border-border hover:bg-muted text-foreground"
                  onClick={() => refreshLocation(true)}
                  disabled={locLoading}
                  title="Refresh your live GPS location"
                >
                  <RefreshCw className={`h-3 w-3 ${locLoading ? "animate-spin text-primary" : ""}`} />
                  <span className="hidden sm:inline">Refresh GPS</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs gap-1.5 border-border hover:bg-muted text-foreground"
                  onClick={() => setFitTrigger((c) => c + 1)}
                  title="Center view on company perimeter and your position"
                >
                  <Crosshair className="h-3 w-3" />
                  <span className="hidden sm:inline">Center</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                  onClick={toggleMapExpanded}
                  title={isMapExpanded ? "Compact map view" : "Expand map view"}
                >
                  {isMapExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>

            {/* Error notice if location denied */}
            {locError && (
              <div className="px-3.5 py-2 bg-amber-50/90 border-b border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>{locError}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-[11px] px-2 bg-white border-amber-300 text-amber-800 hover:bg-amber-100"
                  onClick={() => refreshLocation(true)}
                >
                  Retry GPS
                </Button>
              </div>
            )}

            {/* Interactive Leaflet Map */}
            <div className={`relative w-full transition-[height] duration-200 ${isMapExpanded ? "h-[420px]" : "h-[270px]"}`} style={{ zIndex: 0 }}>
              <MapContainer
                center={defaultCenter}
                zoom={16}
                style={{ height: "100%", width: "100%" }}
                scrollWheelZoom={false}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapBoundsFitter
                  studentPos={studentLoc ? [studentLoc.lat, studentLoc.lng] : null}
                  companyPos={companyCenter}
                  polygon={companyPolygon}
                  fitTrigger={fitTrigger}
                />

                {/* Company Perimeter: Polygon or Circle */}
                {companyPolygon.length >= 3 ? (
                  <Polygon
                    positions={companyPolygon}
                    pathOptions={{
                      color: "#2563eb",
                      fillColor: "#3b82f6",
                      fillOpacity: 0.18,
                      weight: 2.5,
                      dashArray: "6 4",
                    }}
                  />
                ) : companyLocation?.latitude && companyLocation?.longitude ? (
                  <Circle
                    center={[companyLocation.latitude, companyLocation.longitude]}
                    radius={companyLocation.geofenceRadius || 200}
                    pathOptions={{
                      color: "#2563eb",
                      fillColor: "#3b82f6",
                      fillOpacity: 0.12,
                      weight: 2,
                      dashArray: "6 4",
                    }}
                  />
                ) : null}

                {/* Company Office Pin */}
                {companyCenter && (
                  <Marker
                    position={companyCenter}
                    icon={makeCompanyMarker()}
                  >
                    <Popup>
                      <div className="p-1 space-y-1">
                        <div className="font-semibold text-sm text-foreground">
                          {companyLocation?.companyName || "Company Office"}
                        </div>
                        {companyLocation?.companyAddress && (
                          <div className="text-xs text-muted-foreground">
                            {companyLocation.companyAddress}
                          </div>
                        )}
                        <div className="text-[11px] font-medium text-blue-600 pt-1 border-t border-border mt-1">
                          {companyPolygon.length >= 3
                            ? `Polygon Boundary (${companyPolygon.length} vertices)`
                            : `Circular Geofence (${companyLocation?.geofenceRadius || 200}m)`}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                )}

                {/* Student Marker & Accuracy Radius */}
                {studentLoc && (
                  <>
                    <Circle
                      center={[studentLoc.lat, studentLoc.lng]}
                      radius={studentLoc.accuracy}
                      pathOptions={{
                        color: isInside ? "#10b981" : "#ef4444",
                        fillColor: isInside ? "#10b981" : "#ef4444",
                        fillOpacity: 0.08,
                        weight: 1,
                        dashArray: "3 3",
                      }}
                    />
                    <Marker
                      position={[studentLoc.lat, studentLoc.lng]}
                      icon={makeStudentMarker(isInside, studentInitials)}
                    >
                      <Popup>
                        <div className="p-1 space-y-1">
                          <div className="font-semibold text-sm text-foreground">
                            {studentProfile?.name || "Your Location"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            GPS Accuracy: ±{studentLoc.accuracy}m
                          </div>
                          <div className={`text-xs font-semibold pt-1 border-t border-border mt-1 ${isInside ? "text-emerald-600" : "text-rose-600"}`}>
                            {isInside
                              ? "✓ Inside Perimeter — Ready to Time In / Out"
                              : `✕ Outside Boundary (${geofenceResult?.distance ?? 0}m away)`}
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  </>
                )}
              </MapContainer>

              {/* Floating Legend */}
              <div className="absolute bottom-2.5 left-2.5 z-[400] bg-background/90 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-border shadow-md text-[10px] text-muted-foreground flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-blue-500 border border-blue-600 inline-block"></span>
                  <span className="font-medium text-foreground">Perimeter</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs">🏢</span>
                  <span className="font-medium text-foreground">Company</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full inline-block ${isInside ? "bg-emerald-500" : "bg-rose-500"}`}></span>
                  <span className="font-medium text-foreground">You ({isInside ? "Inside" : "Outside"})</span>
                </div>
              </div>
            </div>

            {/* Bottom info footer */}
            <div className="px-3.5 py-2 bg-muted/20 border-t border-border flex items-center justify-between text-xs text-muted-foreground flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>
                  {companyPolygon.length >= 3
                    ? `Perimeter: Custom Polygon (${companyPolygon.length} boundary vertices)`
                    : companyLocation?.latitude
                    ? `Perimeter: ${companyLocation.geofenceRadius || 200}m circular radius`
                    : "No perimeter set by company coordinator"}
                </span>
              </div>
              {studentLoc && (
                <div className="flex items-center gap-3 text-[11px]">
                  <span>GPS Accuracy: <strong>±{studentLoc.accuracy}m</strong></span>
                  {geofenceResult && !geofenceResult.allowed && geofenceResult.distance != null && (
                    <span className="text-rose-600 font-semibold">
                      Must move {geofenceResult.distance}m closer
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Geofence Status Action Banner (shown when timing in/out) */}
          {geofenceStatus === "checking" && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 text-sm border border-blue-200">
              <Loader2 className="h-4 w-4 animate-spin shrink-0" /> Checking your location…
            </div>
          )}
          {geofenceStatus === "allowed" && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 text-green-700 text-sm border border-green-200">
              <CheckCircle2 className="h-4 w-4 shrink-0" /> You are within your company's geofence ✔
            </div>
          )}
          {geofenceStatus === "out_of_range" && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
              <XCircle className="h-4 w-4 shrink-0" /> You are outside the allowed area. Move closer to your company.
            </div>
          )}
          {geofenceStatus === "denied" && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-50 text-orange-700 text-sm border border-orange-200">
              <AlertTriangle className="h-4 w-4 shrink-0" /> Location access denied. Enable it in browser settings to use DTR.
            </div>
          )}
          {geofenceStatus === "no_gps" && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted text-muted-foreground text-sm border border-border">
              <MapPin className="h-4 w-4 shrink-0" /> No geofence set for your company. DTR available without location check.
            </div>
          )}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border border-border bg-muted/20">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold">Time In</span>
                {hasTimeIn ? (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Recorded</span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">Pending</span>
                )}
              </div>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-16 w-16 rounded-lg overflow-hidden bg-muted flex items-center justify-center border border-border">
                  {todayRecord?.timeInPhoto
                    ? <img src={resolveUploadUrl(todayRecord.timeInPhoto)!} alt="Time In" className="h-full w-full object-cover" />
                    : <CameraOff className="h-6 w-6 text-muted-foreground" />}
                </div>
                <div>
                  <p className="text-2xl font-bold">{todayRecord?.timeIn ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">Selfie + timestamp</p>
                </div>
              </div>
              <Button
                className="w-full h-10 bg-green-600 hover:bg-green-700 text-white gap-2"
                disabled={hasTimeIn || !isCurrentDeviceBound}
                onClick={() => openCamera("in")}
              >
                <Camera className="h-4 w-4" /> {hasTimeIn ? "Already Timed In" : "Time In"}
              </Button>
            </div>

            <div className="p-4 rounded-lg border border-border bg-muted/20">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold">Time Out</span>
                {hasTimeOut ? (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Recorded</span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">Pending</span>
                )}
              </div>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-16 w-16 rounded-lg overflow-hidden bg-muted flex items-center justify-center border border-border">
                  {todayRecord?.timeOutPhoto
                    ? <img src={resolveUploadUrl(todayRecord.timeOutPhoto)!} alt="Time Out" className="h-full w-full object-cover" />
                    : <CameraOff className="h-6 w-6 text-muted-foreground" />}
                </div>
                <div>
                  <p className="text-2xl font-bold">{todayRecord?.timeOut ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">Selfie + timestamp</p>
                </div>
              </div>
              <Button
                className="w-full h-10 bg-red-500 hover:bg-red-600 text-white gap-2"
                disabled={!hasTimeIn || hasTimeOut || !isCurrentDeviceBound}
                onClick={() => openCamera("out")}
              >
                <Camera className="h-4 w-4" /> {hasTimeOut ? "Already Timed Out" : "Time Out"}
              </Button>
            </div>
          </div>

          {/* Today DTR Completion / Undertime Status Banner */}
          {todayRecord?.timeOut && (
            <div className={`mt-4 p-3.5 rounded-xl border text-xs flex items-center justify-between flex-wrap gap-2 ${
              todayRecord.hours < 8
                ? "bg-amber-50/90 border-amber-200 text-amber-900 shadow-xs"
                : "bg-emerald-50/90 border-emerald-200 text-emerald-900 shadow-xs"
            }`}>
              <div className="flex items-center gap-2 font-medium">
                {todayRecord.hours < 8 ? (
                  <>
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>
                      Undertime recorded today: <strong>{todayRecord.hours.toFixed(2)}h</strong> (&lt; 8.0 hrs standard)
                    </span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>
                      Full day completed: <strong>{todayRecord.hours.toFixed(2)}h</strong> (&ge; 8.0 hrs standard)
                    </span>
                  </>
                )}
              </div>
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border ${
                todayRecord.hours < 8
                  ? "bg-amber-100 text-amber-800 border-amber-300"
                  : "bg-emerald-100 text-emerald-800 border-emerald-300"
              }`}>
                {todayRecord.hours < 8 ? "Undertime (<8h)" : "Completed (8h+)"}
              </span>
            </div>
          )}

          {!hasTimeIn && (
            <p className="text-xs text-muted-foreground mt-3">You must Time In before you can Time Out.</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Daily Time Record</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2.5 px-3 text-muted-foreground font-medium">Date</th>
                  <th className="text-left py-2.5 px-3 text-muted-foreground font-medium">Day</th>
                  <th className="text-left py-2.5 px-3 text-muted-foreground font-medium">Time In</th>
                  <th className="text-left py-2.5 px-3 text-muted-foreground font-medium">In Photo</th>
                  <th className="text-left py-2.5 px-3 text-muted-foreground font-medium">Time Out</th>
                  <th className="text-left py-2.5 px-3 text-muted-foreground font-medium">Out Photo</th>
                  <th className="text-left py-2.5 px-3 text-muted-foreground font-medium">Hours</th>
                  <th className="text-left py-2.5 px-3 text-muted-foreground font-medium">Remarks</th>
                  <th className="text-left py-2.5 px-3 text-muted-foreground font-medium">Verification</th>
                </tr>
              </thead>
              <tbody>
                {sortedRecords.map((e, i) => (
                  <tr key={e.date} className={`border-b border-border last:border-0 ${i % 2 === 0 ? "bg-muted/20" : ""}`}>
                    <td className="py-2.5 px-3">{formatDate(e.date)}</td>
                    <td className="py-2.5 px-3 text-muted-foreground">{e.day}</td>
                    <td className="py-2.5 px-3 font-medium">{e.timeIn ?? "—"}</td>
                    <td className="py-2.5 px-3">
                      {e.timeInPhoto
                        ? <img src={resolveUploadUrl(e.timeInPhoto)!} alt="" className="h-8 w-8 rounded object-cover border border-border" />
                        : <span className="text-muted-foreground text-xs">—</span>}
                    </td>
                    <td className="py-2.5 px-3 font-medium">{e.timeOut ?? "—"}</td>
                    <td className="py-2.5 px-3">
                      {e.timeOutPhoto
                        ? <img src={resolveUploadUrl(e.timeOutPhoto)!} alt="" className="h-8 w-8 rounded object-cover border border-border" />
                        : <span className="text-muted-foreground text-xs">—</span>}
                    </td>
                    <td className="py-2.5 px-3 font-semibold">{e.hours > 0 ? `${e.hours.toFixed(2)}h` : "—"}</td>
                    <td className="py-2.5 px-3">
                      {(() => {
                        const effectiveRemarks = e.remarks || (e.timeOut ? (e.hours < 8 ? "Undertime" : "Completed") : "Regular");
                        const isUndertime = effectiveRemarks === "Undertime" || (e.timeOut && e.hours < 8 && effectiveRemarks !== "Late");
                        const isCompleted = effectiveRemarks === "Completed" || (e.timeOut && e.hours >= 8);

                        return (
                          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold inline-flex items-center gap-1 border ${
                            isCompleted
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : isUndertime
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : effectiveRemarks === "Late"
                              ? "bg-orange-50 text-orange-700 border-orange-200"
                              : "bg-gray-100 text-gray-600 border-gray-200"
                          }`}>
                            {isUndertime && <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" />}
                            {isCompleted && <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />}
                            {isUndertime ? "Undertime" : isCompleted ? "Completed" : effectiveRemarks}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="py-2.5 px-3">
                      {e.status === "approved" && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                          Approved
                        </span>
                      )}
                      {e.status === "rejected" && (
                        <div className="space-y-1">
                          <span className="inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                            Rejected
                          </span>
                          {e.reviewNote && (
                            <p className="text-[10px] text-rose-600 italic max-w-[160px] leading-tight block break-words" title={e.reviewNote}>
                              "{e.reviewNote}"
                            </p>
                          )}
                        </div>
                      )}
                      {e.status === "pending" && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          e.timeOut 
                            ? "bg-amber-50 text-amber-600 border border-amber-200/60 animate-pulse" 
                            : "bg-blue-50 text-blue-600 border border-blue-200/60"
                        }`}>
                          {e.timeOut ? "Pending Review" : "Active"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog for Requesting Device Reset */}
      <Dialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700">
              <ShieldAlert className="h-5 w-5" /> Request Device Reset?
            </DialogTitle>
            <DialogDescription className="text-sm pt-2 space-y-2">
              <p>
                This will send a device reset request to your <strong className="font-semibold text-foreground">OJT Supervisor / Coordinator</strong>.
              </p>
              <p>
                Once approved, your previous device registration (<strong className="font-semibold text-foreground">{deviceInfo?.registeredDeviceName || "Registered Device"}</strong>) will be cleared, allowing you to bind this device (<strong className="font-semibold text-foreground">{currentDeviceName}</strong>).
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowResetConfirm(false)} disabled={requestingReset}>
              Cancel
            </Button>
            <Button onClick={handleRequestReset} disabled={requestingReset} className="bg-amber-600 hover:bg-amber-700 text-white gap-2">
              {requestingReset ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
              {requestingReset ? "Submitting..." : "Submit Reset Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
