import { useEffect, useState, useCallback, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "../../lib/leaflet-setup";
import * as api from "../../lib/api";
import { MapPin, RefreshCw, Users, Wifi, WifiOff, Clock } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────
interface InternLocation {
  studentId: string;
  studentName: string;
  studentNumber: string;
  avatarUrl: string | null;
  timeIn: string | null;
  // null when the intern is clocked in but hasn't sent a ping yet
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  pingedAt: string | null;
}

interface CompanyInfo {
  latitude: number | null;
  longitude: number | null;
  geofenceRadius: number;
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
  if (mins < 2) return "#22c55e";  // green
  if (mins < 5) return "#f59e0b";  // amber
  return "#ef4444";                // red
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

// ── Map auto-bounds component ─────────────────────────────────────────────────
function MapBoundsFitter({
  locations,
  companyInfo,
}: {
  locations: InternLocation[];
  companyInfo: CompanyInfo;
}) {
  const map = useMap();
  useEffect(() => {
    const points: [number, number][] = [];
    if (companyInfo.latitude && companyInfo.longitude) {
      points.push([companyInfo.latitude, companyInfo.longitude]);
    }
    // Only include interns that have actual coordinates
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
  }, [locations.length]);
  return null;
}

// ── Main component ─────────────────────────────────────────────────────────────
export function LiveTrackerTab({ companyInfo }: Props) {
  const [locations, setLocations] = useState<InternLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const defaultCenter: [number, number] =
    companyInfo.latitude && companyInfo.longitude
      ? [companyInfo.latitude, companyInfo.longitude]
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

  // Split into those with/without a known location
  const locatedInterns = locations.filter(
    (l) => l.latitude != null && l.longitude != null
  );
  const pendingInterns = locations.filter(
    (l) => l.latitude == null || l.longitude == null
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <MapPin className="h-5 w-5 text-emerald-500" />
            Live Intern Tracker
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Real-time location of clocked-in interns · updates every 30 seconds
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isOnline ? (
            <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
              <Wifi className="h-3.5 w-3.5" />
              Live
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-red-500 font-medium">
              <WifiOff className="h-3.5 w-3.5" />
              Offline
            </span>
          )}
          {lastRefresh && (
            <span className="text-xs text-muted-foreground">
              Updated {lastRefresh.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          )}
          <button
            onClick={fetchLocations}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm hover:bg-muted transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
        <span className="font-medium">Ping freshness:</span>
        {[
          { color: "#22c55e", label: "< 2 min (live)" },
          { color: "#f59e0b", label: "2–5 min" },
          { color: "#ef4444", label: "> 5 min" },
          { color: "#94a3b8", label: "No ping yet" },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1.5">
            <span
              style={{ background: color }}
              className="inline-block w-3 h-3 rounded-full border border-white shadow"
            />
            {label}
          </span>
        ))}
        <span className="flex items-center gap-1.5 ml-2">
          <span className="inline-block w-3 h-3 rounded-full border-2 border-blue-400 bg-blue-100" />
          Geofence boundary
        </span>
      </div>

      {/* Map */}
      <div
        className="rounded-2xl overflow-hidden border shadow-md"
        style={{ height: "520px", zIndex: 0 }}
      >
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center bg-muted gap-3">
            <RefreshCw className="h-7 w-7 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading map…</p>
          </div>
        ) : (
          <MapContainer
            center={defaultCenter}
            zoom={15}
            style={{ height: "100%", width: "100%" }}
            scrollWheelZoom
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Geofence circle */}
            {companyInfo.latitude && companyInfo.longitude && (
              <>
                <Circle
                  center={[companyInfo.latitude, companyInfo.longitude]}
                  radius={companyInfo.geofenceRadius}
                  pathOptions={{
                    color: "#3b82f6",
                    fillColor: "#3b82f6",
                    fillOpacity: 0.07,
                    weight: 2,
                    dashArray: "6 4",
                  }}
                />
                {/* Company pin */}
                <Marker
                  position={[companyInfo.latitude, companyInfo.longitude]}
                  icon={L.divIcon({
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
                    <div className="text-sm font-semibold">{companyInfo.name || "Your Company"}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      Geofence: {companyInfo.geofenceRadius}m radius
                    </div>
                  </Popup>
                </Marker>
              </>
            )}

            {/* Intern pins — only for those with known coordinates */}
            {locatedInterns.map((loc) => {
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

            <MapBoundsFitter locations={locations} companyInfo={companyInfo} />
          </MapContainer>
        )}
      </div>

      {/* Active intern roster / empty state */}
      {!loading && (
        <div className="rounded-xl border p-4 bg-muted/40">
          {locations.length === 0 ? (
            <div className="flex items-center gap-3 text-muted-foreground">
              <Users className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm">No interns are currently clocked in.</span>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-500" />
                {locations.length} intern{locations.length !== 1 ? "s" : ""} currently clocked in
                {pendingInterns.length > 0 && (
                  <span className="text-xs text-muted-foreground font-normal">
                    · {pendingInterns.length} awaiting first location ping
                  </span>
                )}
              </p>
              <div className="flex flex-wrap gap-2">
                {locations.map((loc) => (
                  <span
                    key={loc.studentId}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-white shadow-sm"
                  >
                    <span
                      className="w-2 h-2 rounded-full inline-block flex-shrink-0"
                      style={{ background: getFreshnessColor(loc.pingedAt) }}
                    />
                    {loc.studentName}
                    <span className="text-muted-foreground flex items-center gap-1">
                      {loc.pingedAt ? (
                        <>· {getFreshnessLabel(loc.pingedAt)}</>
                      ) : (
                        <>
                          <Clock className="h-3 w-3" />
                          in since {loc.timeIn}
                        </>
                      )}
                    </span>
                  </span>
                ))}
              </div>

              {/* Pending location notice */}
              {pendingInterns.length > 0 && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                  <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
                  Interns shown in gray are clocked in but their device hasn't sent a GPS ping yet.
                  They'll appear on the map automatically within 30 seconds.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
