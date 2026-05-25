import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { CompanyLocation } from "../../hooks/useAdminData";
import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { MapPin, Navigation, Info, Briefcase, Building2, Eye, Compass } from "lucide-react";

interface MapTabProps {
  companyLocations: CompanyLocation[];
  selectedMapCompany: CompanyLocation | null;
  setSelectedMapCompany: Dispatch<SetStateAction<CompanyLocation | null>>;
}

// Custom Leaflet loader to inject script and stylesheet
function loadLeaflet(callback: () => void) {
  if (typeof window !== "undefined" && (window as any).L) {
    callback();
    return;
  }

  const existingScript = document.getElementById("leaflet-js");
  if (existingScript) {
    existingScript.addEventListener("load", callback);
    return;
  }

  // Inject CSS
  const css = document.createElement("link");
  css.rel = "stylesheet";
  css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
  css.id = "leaflet-css";
  document.head.appendChild(css);

  // Inject JS
  const js = document.createElement("script");
  js.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
  js.id = "leaflet-js";
  js.async = true;
  js.onload = () => {
    callback();
  };
  document.body.appendChild(js);
}

export function MapTab({ companyLocations, selectedMapCompany, setSelectedMapCompany }: MapTabProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<Map<string, { marker: any; circle: any }>>(new Map());
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [showGeofences, setShowGeofences] = useState(true);

  // Dynamic script loading
  useEffect(() => {
    loadLeaflet(() => {
      setLeafletLoaded(true);
    });
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!leafletLoaded || !mapContainerRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    // Centered around Pampanga State University, Porac Campus area
    const pampangaCenter: [number, number] = [15.0215, 120.5736];
    
    // Initialize map with lightweight, elegant CartoDB Positron tiles (highly premium and modern looking)
    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false
    }).setView(pampangaCenter, 11);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 20
    }).addTo(map);

    // Add zoom control at bottom-right
    L.control.zoom({ position: "bottomright" }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [leafletLoaded]);

  // Synchronize Markers
  useEffect(() => {
    if (!leafletLoaded || !mapInstanceRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    const map = mapInstanceRef.current;

    // Clear existing markers
    markersRef.current.forEach(({ marker, circle }) => {
      if (marker) map.removeLayer(marker);
      if (circle) map.removeLayer(circle);
    });
    markersRef.current.clear();

    // Re-create markers for each company
    companyLocations.forEach((loc) => {
      const isSelected = selectedMapCompany?.name === loc.name;
      const markerColor = isSelected ? "#EF4444" : "#2563EB";
      
      // Beautiful Custom Circle Marker (Dashboard style)
      const marker = L.circleMarker([loc.lat, loc.lng], {
        radius: isSelected ? 10 : 7,
        fillColor: markerColor,
        color: "#FFFFFF",
        weight: 2.5,
        fillOpacity: 0.9,
        className: `transition-all duration-300 ${isSelected ? "animate-pulse" : ""}`
      });

      // Subtle Geofence Circle Overlay
      const geofenceCircle = L.circle([loc.lat, loc.lng], {
        radius: loc.geofenceRadius || 200,
        color: isSelected ? "#EF4444" : "#3B82F6",
        fillColor: isSelected ? "#FCA5A5" : "#93C5FD",
        fillOpacity: isSelected ? 0.25 : 0.1,
        weight: 1.5,
        dashArray: isSelected ? "" : "4, 4"
      });

      if (showGeofences || isSelected) {
        geofenceCircle.addTo(map);
      }

      marker.addTo(map);

      // Custom tooltips instead of boring default popups
      marker.bindTooltip(
        `<div class="p-1 font-semibold text-xs text-slate-800">${loc.name}</div>`,
        { direction: "top", offset: [0, -10] }
      );

      marker.on("click", () => {
        setSelectedMapCompany(loc);
      });

      markersRef.current.set(loc.name, { marker, circle: geofenceCircle });
    });
  }, [leafletLoaded, companyLocations, selectedMapCompany, showGeofences]);

  // Handle external selected company fly-to
  useEffect(() => {
    if (!leafletLoaded || !mapInstanceRef.current || !selectedMapCompany) return;

    const map = mapInstanceRef.current;
    map.flyTo([selectedMapCompany.lat, selectedMapCompany.lng], 15, {
      animate: true,
      duration: 1.5
    });
  }, [leafletLoaded, selectedMapCompany]);

  const handleResetView = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo([15.0215, 120.5736], 11, {
      animate: true,
      duration: 1.2
    });
    setSelectedMapCompany(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">HTE & Company Geo-Location Map</h1>
          <p className="text-muted-foreground mt-1">Real-time geographic distribution and geofence tracking of OJT partners</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowGeofences(!showGeofences)}
            className="text-xs h-9 bg-card border-border hover:bg-muted font-medium"
          >
            <Compass className="h-4 w-4 mr-2" />
            {showGeofences ? "Hide All Geofences" : "Show All Geofences"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetView}
            className="text-xs h-9 bg-card border-border hover:bg-muted font-medium"
          >
            <Navigation className="h-4 w-4 mr-2" />
            Reset View
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="border border-border/80 shadow-sm overflow-hidden bg-card">
            <CardHeader className="pb-3 border-b border-border/60 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                Pampanga OJT Location Grid
              </CardTitle>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs text-muted-foreground font-medium">Interactive Map Mode</span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="relative h-[480px] bg-slate-50">
                {!leafletLoaded && (
                  <div className="absolute inset-0 bg-slate-50 flex flex-col items-center justify-center text-center p-6 z-10">
                    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mb-3" />
                    <p className="font-semibold text-slate-700">Loading Pampanga Map...</p>
                    <p className="text-xs text-muted-foreground mt-1">Connecting to interactive location layers</p>
                  </div>
                )}
                
                <div ref={mapContainerRef} className="h-full w-full z-0" id="leaflet-map-container" />
                
                {/* Legend Indicator Overlay */}
                <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-md px-3.5 py-2.5 rounded-xl shadow-lg border border-slate-100 z-10 max-w-[200px]">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Map Legend</p>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                      <span className="h-3 w-3 rounded-full bg-blue-600 border border-white block shrink-0 shadow-sm" />
                      <span>Partner Company</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                      <span className="h-3 w-3 rounded-full bg-red-500 border border-white block shrink-0 shadow-sm" />
                      <span>Selected Company</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                      <span className="h-3 w-3 border border-blue-400 border-dashed rounded-full block shrink-0 bg-blue-100/30" style={{ width: 12, height: 12 }} />
                      <span>Geofence Boundary</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border border-border/80 shadow-sm h-full flex flex-col bg-card">
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Info className="h-4 w-4 text-primary" />
                {selectedMapCompany ? "Location Details" : "Accredited Partners"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex-1 flex flex-col justify-between">
              {selectedMapCompany ? (
                <div className="space-y-5 animate-in slide-in-from-right-4 duration-300 h-full flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
                      <div className="flex items-center gap-2 text-xs text-primary font-semibold uppercase tracking-wider mb-1.5">
                        <Building2 className="h-3.5 w-3.5" />
                        Host Training Establishment (HTE)
                      </div>
                      <h3 className="font-bold text-lg text-foreground tracking-tight leading-tight">{selectedMapCompany.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{selectedMapCompany.address}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3.5">
                      <div className="bg-muted/30 p-3 rounded-xl border border-border/50">
                        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">Industry</p>
                        <p className="text-sm font-semibold text-foreground truncate">{selectedMapCompany.industry || "General"}</p>
                      </div>
                      <div className="bg-muted/30 p-3 rounded-xl border border-border/50">
                        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">Active Interns</p>
                        <p className="text-sm font-semibold text-primary flex items-center gap-1.5">
                          <Briefcase className="h-4 w-4 shrink-0" />
                          <span>{selectedMapCompany.interns} Deployed</span>
                        </p>
                      </div>
                      <div className="bg-muted/30 p-3 rounded-xl border border-border/50">
                        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">Geofence Limit</p>
                        <p className="text-sm font-semibold text-foreground">{selectedMapCompany.geofenceRadius || 200} meters</p>
                      </div>
                      <div className="bg-muted/30 p-3 rounded-xl border border-border/50">
                        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">Latitude / Longitude</p>
                        <p className="text-xs font-semibold text-foreground tracking-tight">{selectedMapCompany.lat.toFixed(4)}, {selectedMapCompany.lng.toFixed(4)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 space-y-2 border-t border-border/60">
                    <Button 
                      variant="outline" 
                      onClick={() => setSelectedMapCompany(null)}
                      className="w-full text-xs font-medium bg-card border-border hover:bg-muted"
                    >
                      Clear Selection
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col justify-between flex-1">
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                    {companyLocations.length > 0 ? (
                      companyLocations.map((loc, idx) => (
                        <div
                          key={idx}
                          onClick={() => setSelectedMapCompany(loc)}
                          className="group flex items-center justify-between p-3 rounded-xl bg-card border border-border/60 hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-all duration-300"
                        >
                          <div className="min-w-0 pr-2">
                            <h4 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate">{loc.name}</h4>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{loc.address}</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 bg-muted/40 group-hover:bg-primary/10 px-2.5 py-1 rounded-full border border-border/50 transition-colors">
                            <Briefcase className="h-3 w-3 text-muted-foreground group-hover:text-primary" />
                            <span className="text-xs font-semibold text-foreground group-hover:text-primary">{loc.interns}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center p-6 bg-muted/10 rounded-xl border border-dashed border-border/80">
                        <Building2 className="h-10 w-10 text-muted-foreground/60 mb-2.5" />
                        <p className="font-semibold text-sm">No Geolocated Partners</p>
                        <p className="text-xs text-muted-foreground mt-1 max-w-[200px] mx-auto">Companies must configure location coordinates from their profile to show on map.</p>
                      </div>
                    )}
                  </div>

                  <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl mt-4">
                    <div className="flex gap-3">
                      <Eye className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-xs text-primary uppercase tracking-wider">Coordinates Required</h4>
                        <p className="text-[11px] text-blue-800/80 leading-relaxed mt-1">
                          External partners can set up their geofence boundaries directly inside their Company Dashboard Profile tab. Once entered, they instantly reflect here.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
