import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { CompanyLocation } from "../../hooks/useAdminData";
import { Dispatch, SetStateAction } from "react";

interface MapTabProps {
  companyLocations: CompanyLocation[];
  selectedMapCompany: CompanyLocation | null;
  setSelectedMapCompany: Dispatch<SetStateAction<CompanyLocation | null>>;
}

export function MapTab({ companyLocations, selectedMapCompany, setSelectedMapCompany }: MapTabProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Company Location Map</h1>
        <p className="text-muted-foreground mt-1">Geographic distribution of partner companies in Pampanga</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Pampanga OJT Company Map</CardTitle>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">{companyLocations.length} companies</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative bg-gradient-to-br from-green-50 to-blue-50 dark:from-slate-800 dark:to-slate-700 rounded-xl overflow-hidden" style={{ height: 380 }}>
                <div className="absolute inset-0 opacity-20">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="absolute border-l border-blue-300/50" style={{ left: `${(i + 1) * 12.5}%`, top: 0, bottom: 0 }} />
                  ))}
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="absolute border-t border-blue-300/50" style={{ top: `${(i + 1) * 16.67}%`, left: 0, right: 0 }} />
                  ))}
                </div>

                <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <path d="M10 50 Q30 35 50 40 Q70 45 90 30" stroke="#3B82F6" strokeWidth="1.5" fill="none" />
                  <path d="M20 80 Q40 70 60 72 Q80 74 95 65" stroke="#3B82F6" strokeWidth="1" fill="none" />
                  <path d="M50 0 Q48 30 52 55 Q54 70 50 100" stroke="#6B7280" strokeWidth="0.8" fill="none" strokeDasharray="2,2" />
                </svg>

                <div className="absolute top-3 left-3 text-xs text-muted-foreground font-medium bg-white/70 dark:bg-slate-800/70 px-2 py-1 rounded-lg">Pampanga Province</div>
                <div className="absolute bottom-3 right-3 text-xs text-muted-foreground bg-white/70 dark:bg-slate-800/70 px-2 py-1 rounded-lg">📍 Clark FTZ &nbsp; 📍 San Fernando &nbsp; 📍 Porac</div>

                {companyLocations.map((loc, i) => (
                  <button
                    key={i}
                    className="absolute transform -translate-x-1/2 -translate-y-full group cursor-pointer"
                    style={{ left: `${loc.x}%`, top: `${loc.y}%` }}
                    onClick={() => setSelectedMapCompany(loc === selectedMapCompany ? null : loc)}
                  >
                    <div className="relative">
                      <div className={`h-4 w-4 rounded-full border-2 border-white shadow-sm transition-all duration-300 ${loc === selectedMapCompany ? "bg-red-500 scale-125" : "bg-blue-600 group-hover:scale-110 group-hover:bg-blue-500"}`} />
                      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-white shadow-sm" />
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="border-0 shadow-sm h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Location Details</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedMapCompany ? (
                <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                  <div>
                    <h3 className="font-bold text-lg">{selectedMapCompany.name}</h3>
                    <p className="text-sm text-muted-foreground">{selectedMapCompany.address}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
                    <div>
                      <p className="text-xs text-muted-foreground">Industry</p>
                      <p className="text-sm font-medium">{selectedMapCompany.industry}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Active Interns</p>
                      <p className="text-sm font-medium text-blue-600">{selectedMapCompany.interns}</p>
                    </div>
                  </div>
                  <Button className="w-full mt-4 bg-primary hover:bg-primary/90 text-white">View Full Profile</Button>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-muted/20 rounded-xl border border-dashed border-border">
                  <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center mb-3">📍</div>
                  <p className="font-medium">Select a Location</p>
                  <p className="text-sm text-muted-foreground mt-1">Click any pin on the map to view company details and intern deployment.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
