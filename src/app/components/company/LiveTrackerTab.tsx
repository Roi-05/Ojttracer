import { useEffect, useState, useCallback, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  Polygon,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "../../lib/leaflet-setup";
import * as api from "../../lib/api";
import {
  normalizePolygon,
  getPolygonCentroid,
  generateBoxPolygon,
  getCurrentPosition,
  PolygonPoint,
} from "../../lib/geolocation";
import {
  MapPin,
  RefreshCw,
  Users,
  Wifi,
  WifiOff,
  Clock,
  ShieldCheck,
  Edit,
  Shapes,
  Navigation,
  Loader2,
  Sparkles,
  Undo2,
  Trash2,
  CheckCircle2,
  Crosshair,
  Minus,
  Plus,
  HelpCircle,
  X,
} from "lucide-react";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { toast } from "sonner";
import { useAuth } from "../../contexts/AuthContext";

// ── Types ────────────────────────────────────────────────────────────────────
interface InternLocation {
  studentId: string;
  studentName: string;
  studentNumber: string;
  avatarUrl: string | null;
  timeIn: string | null;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  pingedAt: string | null;
}

interface CompanyInfo {
  latitude: number | null;
  longitude: number | null;
  geofenceRadius: number;
  geofencePolygon?: [number, number][] | null;
  name: string;
}

interface Props {
  companyInfo: CompanyInfo;
  interns: { id: string | number; name: string }[];
}

// ── Freshness helpers ────────────────────────────────────────────────────────
function getMinutesAgo(pingedAt: string): number {
  return Math.floor((Date.now() - new Date(pingedAt).getTime()) / 60_000);
}

function getFreshnessColor(pingedAt: string | null): string {
  if (!pingedAt) return "#94a3b8"; // gray — no ping yet
  const mins = getMinutesAgo(pingedAt);
  if (mins < 2) return "#22c55e"; // green
  if (mins < 5) return "#f59e0b"; // amber
  return "#ef4444"; // red
}

function getFreshnessLabel(pingedAt: string | null): string {
  if (!pingedAt) return "Awaiting first ping…";
  const mins = getMinutesAgo(pingedAt);
  if (mins < 1) return "Just now";
  if (mins === 1) return "1 min ago";
  return `${mins} min ago`;
}

// ── Custom colored marker ─────────────────────────────────────────────────────
function makeColorMarker(color: string) {
  return L.divIcon({
    className: "",
    html: `
      <div style="
        width: 36px; height: 36px;
        background: ${color};
        border: 3px solid white;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 2px 8px rgba(0,0,0,0.35);
      "></div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -38],
  });
}

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
      width: 38px; height: 38px;
      background: #ef4444;
      border: 3px solid white;
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px;
      box-shadow: 0 3px 8px rgba(0,0,0,0.3);
      cursor: pointer;
    ">🏢</div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 38],
    popupAnchor: [0, -40],
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
  }, [center?.[0], center?.[1], map]);
  return null;
}

// ── Map auto-bounds component ─────────────────────────────────────────────────
function MapBoundsFitter({
  locations,
  companyInfo,
  polygonPoints,
  isEditing,
}: {
  locations: InternLocation[];
  companyInfo: CompanyInfo;
  polygonPoints: PolygonPoint[];
  isEditing: boolean;
}) {
  const map = useMap();
  useEffect(() => {
    // When editing the polygon, let user control the map zoom and view freely
    if (isEditing) return;

    const points: [number, number][] = [];
    const polygon = polygonPoints.length >= 3 ? polygonPoints : normalizePolygon(companyInfo.geofencePolygon);
    if (polygon.length >= 3) {
      polygon.forEach((p) => points.push(p));
    } else if (companyInfo.latitude && companyInfo.longitude) {
      points.push([companyInfo.latitude, companyInfo.longitude]);
    }
    // Include interns with valid coordinates
    locations.forEach((l) => {
      if (l.latitude != null && l.longitude != null) {
        points.push([l.latitude, l.longitude]);
      }
    });

    if (points.length === 1) {
      map.setView(points[0], 16);
    } else if (points.length > 1) {
      map.fitBounds(points, { padding: [60, 60] });
    }
  }, [locations.length, companyInfo.latitude, companyInfo.longitude, isEditing, map, polygonPoints]);
  return null;
}

// ── Main component ─────────────────────────────────────────────────────────────
export function LiveTrackerTab({ companyInfo }: Props) {
  const { refreshProfile } = useAuth();
  const [locations, setLocations] = useState<InternLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Geofence Editor State ──
  const [isEditingGeofence, setIsEditingGeofence] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    companyInfo.latitude != null && companyInfo.longitude != null
      ? { lat: Number(companyInfo.latitude), lng: Number(companyInfo.longitude) }
      : null
  );
  const [geofenceRadius, setGeofenceRadius] = useState<number>(companyInfo.geofenceRadius || 200);
  const [polygonPoints, setPolygonPoints] = useState<PolygonPoint[]>(
    normalizePolygon(companyInfo.geofencePolygon)
  );
  const [addPointMode, setAddPointMode] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [isSavingLocation, setIsSavingLocation] = useState(false);
  const [mapCenterTarget, setMapCenterTarget] = useState<[number, number] | null>(null);

  // Sync props when companyInfo updates
  useEffect(() => {
    if (companyInfo.latitude != null && companyInfo.longitude != null) {
      setLocation({ lat: Number(companyInfo.latitude), lng: Number(companyInfo.longitude) });
    }
    setGeofenceRadius(companyInfo.geofenceRadius || 200);
    setPolygonPoints(normalizePolygon(companyInfo.geofencePolygon));
  }, [
    companyInfo.latitude,
    companyInfo.longitude,
    companyInfo.geofenceRadius,
    JSON.stringify(companyInfo.geofencePolygon),
  ]);

  const defaultCenter: [number, number] =
    location
      ? [location.lat, location.lng]
      : polygonPoints.length > 0
      ? polygonPoints[0]
      : [15.0794, 120.6200]; // Fallback: Pampanga, PH

  const fetchLocations = useCallback(async () => {
    try {
      const data = await api.getActiveInternLocations();
      setLocations(data || []);
      setLastRefresh(new Date());
      setIsOnline(true);
    } catch {
      setIsOnline(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch + polling every 30s
  useEffect(() => {
    fetchLocations();
    intervalRef.current = setInterval(fetchLocations, 30_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchLocations]);

  // ── Geofence Handlers ──
  const captureGPS = async () => {
    setGpsLoading(true);
    try {
      const pos = await getCurrentPosition();
      setLocation({ lat: pos.latitude, lng: pos.longitude });
      setGpsAccuracy(pos.accuracy);
      setMapCenterTarget([pos.latitude, pos.longitude]);
      toast.success("Office GPS location captured!");
    } catch (err: any) {
      toast.error(err as string);
    } finally {
      setGpsLoading(false);
    }
  };

  const handleAddVertex = (lat: number, lng: number) => {
    setPolygonPoints((prev) => [...prev, [lat, lng]]);
  };

  const handleVertexDrag = (index: number, newLat: number, newLng: number) => {
    setPolygonPoints((prev) => {
      const next = [...prev];
      next[index] = [newLat, newLng];
      return next;
    });
  };

  const handleRemoveVertex = (index: number) => {
    setPolygonPoints((prev) => prev.filter((_, i) => i !== index));
    toast.info(`Removed vertex #${index + 1}`);
  };

  const handleUndoLastPoint = () => {
    setPolygonPoints((prev) => prev.slice(0, -1));
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
    setMapCenterTarget([centerLat, centerLon(box)]);
    toast.success(`Generated rectangular perimeter (${geofenceRadius || 150}m width)`);
  };

  function centerLon(points: PolygonPoint[]) {
    return points.reduce((acc, p) => acc + p[1], 0) / points.length;
  }

  const handleSaveLocation = async () => {
    const effectiveLat = location?.lat ?? (polygonPoints.length > 0 ? polygonPoints[0][0] : null);
    const effectiveLng = location?.lng ?? (polygonPoints.length > 0 ? polygonPoints[0][1] : null);

    if (effectiveLat == null || effectiveLng == null) {
      toast.error("Please capture your office GPS location or place polygon points on the map first.");
      return;
    }

    setIsSavingLocation(true);
    try {
      const validPolygon = polygonPoints.length >= 3 ? polygonPoints : null;
      await api.updateCompanyLocation({
        latitude: effectiveLat,
        longitude: effectiveLng,
        geofenceRadius,
        geofencePolygon: validPolygon,
      });
      await refreshProfile();
      if (validPolygon) {
        toast.success(`📍 Polygon geofence saved! (${validPolygon.length} boundary points)`);
      } else {
        toast.success(`📍 Circular geofence saved (${geofenceRadius}m radius)!`);
      }
      setIsEditingGeofence(false);
      setAddPointMode(false);
    } catch (err: any) {
      toast.error(`Failed to save geofence: ${err.message}`);
    } finally {
      setIsSavingLocation(false);
    }
  };

  // Split into those with/without a known location
  const locatedInterns = locations.filter(
    (l) => l.latitude != null && l.longitude != null
  );
  const pendingInterns = locations.filter(
    (l) => l.latitude == null || l.longitude == null
  );

  const activePolygon = isEditingGeofence ? polygonPoints : normalizePolygon(companyInfo.geofencePolygon);
  const centroid = getPolygonCentroid(activePolygon);
  const officePinPos: [number, number] | null =
    location
      ? [location.lat, location.lng]
      : companyInfo.latitude && companyInfo.longitude
      ? [companyInfo.latitude, companyInfo.longitude]
      : centroid;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <MapPin className="h-5 w-5 text-emerald-500" />
            Live Intern Tracker &amp; Geofence
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Real-time intern tracking and DTR geofence boundary configuration
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isEditingGeofence ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsEditingGeofence(false);
                setAddPointMode(false);
                setPolygonPoints(normalizePolygon(companyInfo.geofencePolygon));
              }}
              className="gap-1.5"
            >
              <X className="h-3.5 w-3.5" />
              Exit Editor
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditingGeofence(true)}
              className="gap-1.5 border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-300 font-medium"
            >
              <Shapes className="h-3.5 w-3.5" />
              Configure Geofence Perimeter
            </Button>
          )}

          {isOnline ? (
            <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium ml-2">
              <Wifi className="h-3.5 w-3.5" />
              Live
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-red-500 font-medium ml-2">
              <WifiOff className="h-3.5 w-3.5" />
              Offline
            </span>
          )}

          {lastRefresh && (
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {lastRefresh.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <button
            onClick={fetchLocations}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm hover:bg-muted transition-colors"
            title="Refresh locations"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Geofence Status Banner & Editor Toolbar */}
      {isEditingGeofence ? (
        <div className="rounded-xl border border-blue-200 bg-blue-50/60 dark:bg-blue-950/20 p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-bold flex items-center gap-1.5 text-blue-900 dark:text-blue-300">
                <Shapes className="h-4 w-4 text-blue-600" />
                Interactive Geofence &amp; Polygon Boundary Editor
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Click on the map to add boundary points. Drag numbered vertex markers to fit your office or building perimeter.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                polygonPoints.length >= 3
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                  : "bg-amber-100 text-amber-800 border border-amber-200"
              }`}>
                {polygonPoints.length >= 3
                  ? `Polygon Boundary Active (${polygonPoints.length} vertices)`
                  : `Circular Fallback (${geofenceRadius}m radius)`}
              </span>
            </div>
          </div>

          {/* Editor Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-blue-200/60">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs text-blue-700 border-blue-200 bg-card hover:bg-blue-50"
              onClick={captureGPS}
              disabled={gpsLoading}
            >
              {gpsLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Navigation className="h-3.5 w-3.5" />}
              {gpsLoading ? "Locating…" : "Capture Office GPS"}
            </Button>

            <Button
              type="button"
              variant={addPointMode ? "default" : "outline"}
              size="sm"
              className={`h-8 gap-1.5 text-xs ${addPointMode ? "bg-blue-600 text-white" : "border-blue-200 bg-card"}`}
              onClick={() => setAddPointMode((m) => !m)}
            >
              <MapPin className="h-3.5 w-3.5" />
              {addPointMode ? "Clicking Adds Points: ON" : "Add Points: OFF"}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs text-blue-700 border-blue-200 bg-card hover:bg-blue-50"
              onClick={handleGenerateShape}
            >
              <Sparkles className="h-3.5 w-3.5 text-blue-600" />
              Generate Shape Around Office
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1 text-xs border-blue-200 bg-card"
              onClick={handleUndoLastPoint}
              disabled={polygonPoints.length === 0}
            >
              <Undo2 className="h-3.5 w-3.5" /> Undo
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200 bg-card"
              onClick={handleClearPolygon}
              disabled={polygonPoints.length === 0}
            >
              <Trash2 className="h-3.5 w-3.5" /> Clear Polygon
            </Button>

            {/* Fallback Radius Controls */}
            <div className="flex items-center gap-1.5 ml-auto text-xs">
              <span className="text-muted-foreground">Radius:</span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => setGeofenceRadius((r) => Math.max(50, r - 50))}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="font-mono font-bold text-blue-700 w-12 text-center">{geofenceRadius}m</span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => setGeofenceRadius((r) => Math.min(500, r + 50))}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>

            <Button
              type="button"
              size="sm"
              className="h-8 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium ml-2 shadow-xs"
              onClick={handleSaveLocation}
              disabled={isSavingLocation}
            >
              {isSavingLocation ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
              {isSavingLocation ? "Saving…" : "Save Geofence & Location"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between bg-muted/30 border border-border px-3.5 py-2.5 rounded-xl gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 rounded-lg">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <span className="text-xs font-semibold text-foreground">
                {activePolygon.length >= 3
                  ? `Polygon Boundary Active (${activePolygon.length} boundary vertices)`
                  : companyInfo.latitude
                  ? `Circular Geofence (${companyInfo.geofenceRadius}m radius)`
                  : "No Geofence Defined"}
              </span>
              <span className="text-xs text-muted-foreground ml-2">
                — Interns must be inside this boundary to record DTR attendance.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="font-medium">Ping status:</span>
            {[
              { color: "#22c55e", label: "< 2 min" },
              { color: "#f59e0b", label: "2–5 min" },
              { color: "#ef4444", label: "> 5 min" },
              { color: "#94a3b8", label: "No ping" },
            ].map(({ color, label }) => (
              <span key={label} className="flex items-center gap-1">
                <span style={{ background: color }} className="inline-block w-2.5 h-2.5 rounded-full border border-white shadow-xs" />
                {label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Map */}
      <div
        className="rounded-2xl overflow-hidden border shadow-md relative"
        style={{ height: isEditingGeofence ? "560px" : "520px", zIndex: 0 }}
      >
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center bg-muted gap-3">
            <RefreshCw className="h-7 w-7 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading map…</p>
          </div>
        ) : (
          <MapContainer
            center={defaultCenter}
            zoom={16}
            style={{ height: "100%", width: "100%" }}
            scrollWheelZoom
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapEventsHandler onMapClick={handleAddVertex} enabled={isEditingGeofence && addPointMode} />
            <MapViewController center={mapCenterTarget} />

            <MapBoundsFitter
              locations={locations}
              companyInfo={companyInfo}
              polygonPoints={polygonPoints}
              isEditing={isEditingGeofence}
            />

            {/* Geofence Perimeter: Polygon (Priority) or Fallback Circle */}
            {activePolygon.length >= 3 ? (
              <Polygon
                positions={activePolygon}
                pathOptions={{
                  color: "#2563eb",
                  fillColor: "#3b82f6",
                  fillOpacity: isEditingGeofence ? 0.22 : 0.16,
                  weight: 2.5,
                  dashArray: isEditingGeofence ? undefined : "6 4",
                }}
              />
            ) : officePinPos ? (
              <Circle
                center={officePinPos}
                radius={geofenceRadius}
                pathOptions={{
                  color: "#3b82f6",
                  fillColor: "#3b82f6",
                  fillOpacity: 0.08,
                  weight: 2,
                  dashArray: "6 4",
                }}
              />
            ) : null}

            {/* Draggable Vertex Markers (When editing polygon) */}
            {isEditingGeofence &&
              polygonPoints.map((pt, index) => (
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
                    <div className="text-xs font-semibold">Boundary Point #{index + 1}</div>
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

            {/* Company Office Pin */}
            {officePinPos && (
              <Marker
                position={officePinPos}
                icon={isEditingGeofence ? makeOfficeMarkerIcon() : L.divIcon({
                  className: "",
                  html: `<div style="
                    width:40px;height:40px;
                    background:#3b82f6;
                    border:3px solid white;
                    border-radius:8px;
                    display:flex;align-items:center;justify-content:center;
                    font-size:18px;
                    box-shadow:0 2px 8px rgba(0,0,0,0.25);
                  ">🏢</div>`,
                  iconSize: [40, 40],
                  iconAnchor: [20, 40],
                  popupAnchor: [0, -44],
                })}
              >
                <Popup>
                  <div className="text-sm font-semibold">{companyInfo.name || "Company Office"}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {activePolygon.length >= 3
                      ? `Polygon Boundary (${activePolygon.length} vertices)`
                      : `Circular Geofence (${geofenceRadius}m radius)`}
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Intern pins (Shown in tracking view) */}
            {!isEditingGeofence &&
              locatedInterns.map((loc) => {
                const color = getFreshnessColor(loc.pingedAt);
                const label = getFreshnessLabel(loc.pingedAt);
                return (
                  <Marker
                    key={loc.studentId}
                    position={[loc.latitude as number, loc.longitude as number]}
                    icon={makeColorMarker(color)}
                  >
                    <Popup>
                      <div style={{ minWidth: 180 }}>
                        <div className="flex items-center gap-2 mb-1">
                          {loc.avatarUrl ? (
                            <img
                              src={loc.avatarUrl}
                              alt={loc.studentName}
                              className="w-8 h-8 rounded-full object-cover border"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm border">
                              {loc.studentName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-sm leading-tight">{loc.studentName}</p>
                            <p className="text-xs text-gray-500">{loc.studentNumber}</p>
                          </div>
                        </div>
                        <div className="text-xs text-gray-600 space-y-0.5 mt-2 border-t pt-1.5">
                          <p>
                            <span
                              className="inline-block w-2 h-2 rounded-full mr-1.5"
                              style={{ background: color }}
                            />
                            Last seen: <strong>{label}</strong>
                          </p>
                          {loc.accuracy != null && (
                            <p className="text-gray-400">GPS accuracy: ±{loc.accuracy}m</p>
                          )}
                          <p className="text-gray-400">
                            {(loc.latitude as number).toFixed(5)}, {(loc.longitude as number).toFixed(5)}
                          </p>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
          </MapContainer>
        )}

        {/* Edit mode floating helper */}
        {isEditingGeofence && (
          <div className="absolute top-3 left-3 z-[1000] bg-background/95 backdrop-blur-md px-3 py-1.5 rounded-lg border border-border shadow-md text-xs font-medium flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping" />
            {polygonPoints.length >= 3 ? (
              <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                Polygon Perimeter: {polygonPoints.length} vertices
              </span>
            ) : (
              <span className="text-muted-foreground">
                Placed {polygonPoints.length} point(s) — add {3 - polygonPoints.length} more to close polygon
              </span>
            )}
          </div>
        )}
      </div>

      {/* Interns status list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Active interns with location */}
        <div className="border rounded-xl p-4 bg-card shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-600" />
              Located Interns ({locatedInterns.length})
            </h3>
            <span className="text-xs text-muted-foreground">Clocked in &amp; pinging</span>
          </div>

          {locatedInterns.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              No interns currently pinging a location.
            </p>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {locatedInterns.map((loc) => {
                const color = getFreshnessColor(loc.pingedAt);
                const label = getFreshnessLabel(loc.pingedAt);
                return (
                  <div
                    key={loc.studentId}
                    className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ background: color }}
                      />
                      <div>
                        <p className="font-medium">{loc.studentName}</p>
                        <p className="text-muted-foreground text-[11px]">{loc.studentNumber}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-medium text-[11px]">{label}</span>
                      {loc.timeIn && (
                        <p className="text-muted-foreground text-[11px] flex items-center gap-0.5 justify-end">
                          <Clock className="h-3 w-3" /> In: {loc.timeIn}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Interns pending location */}
        <div className="border rounded-xl p-4 bg-card shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              Awaiting Location ({pendingInterns.length})
            </h3>
            <span className="text-xs text-muted-foreground">Clocked in, no ping yet</span>
          </div>

          {pendingInterns.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              All clocked-in interns have reported their location.
            </p>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {pendingInterns.map((loc) => (
                <div
                  key={loc.studentId}
                  className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted/40"
                >
                  <div>
                    <p className="font-medium">{loc.studentName}</p>
                    <p className="text-muted-foreground text-[11px]">{loc.studentNumber}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-amber-600 font-medium text-[11px]">No GPS ping</span>
                    {loc.timeIn && (
                      <p className="text-muted-foreground text-[11px]">In: {loc.timeIn}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
