import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { Camera, CameraOff, Download, Loader2, CheckCircle2, XCircle, MapPin, AlertTriangle } from "lucide-react";
import { DTRRecord } from "../../hooks/useStudentData";
import { resolveUploadUrl } from "../../lib/uploads";
import { formatDate, TODAY_LABEL, TODAY_DAY } from "./shared";

type GeofenceStatus = "idle" | "checking" | "allowed" | "denied" | "out_of_range" | "no_gps";

interface DTRTabProps {
  dtrRecords: DTRRecord[];
  todayRecord: DTRRecord | null;
  openCamera: (mode: "in" | "out") => void;
  geofenceStatus?: GeofenceStatus;
}

export function DTRTab({ dtrRecords, todayRecord, openCamera, geofenceStatus = "idle" }: DTRTabProps) {
  const hasTimeIn = !!todayRecord?.timeIn;
  const hasTimeOut = !!todayRecord?.timeOut;
  const sortedRecords = [...dtrRecords].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Attendance (DTR)</h1>
        <p className="text-muted-foreground mt-1">Daily Time Record — clock in and out with a selfie</p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Today's Attendance</CardTitle>
          <CardDescription>{TODAY_LABEL} — {TODAY_DAY}</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Geofence Status Banner */}
          {geofenceStatus === "checking" && (
            <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 text-sm border border-blue-200">
              <Loader2 className="h-4 w-4 animate-spin shrink-0" /> Checking your location…
            </div>
          )}
          {geofenceStatus === "allowed" && (
            <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-green-50 text-green-700 text-sm border border-green-200">
              <CheckCircle2 className="h-4 w-4 shrink-0" /> You are within your company's geofence ✔
            </div>
          )}
          {geofenceStatus === "out_of_range" && (
            <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
              <XCircle className="h-4 w-4 shrink-0" /> You are outside the allowed area. Move closer to your company.
            </div>
          )}
          {geofenceStatus === "denied" && (
            <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-orange-50 text-orange-700 text-sm border border-orange-200">
              <AlertTriangle className="h-4 w-4 shrink-0" /> Location access denied. Enable it in browser settings to use DTR.
            </div>
          )}
          {geofenceStatus === "no_gps" && (
            <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-muted text-muted-foreground text-sm border border-border">
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
                disabled={hasTimeIn}
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
                disabled={!hasTimeIn || hasTimeOut}
                onClick={() => openCamera("out")}
              >
                <Camera className="h-4 w-4" /> {hasTimeOut ? "Already Timed Out" : "Time Out"}
              </Button>
            </div>
          </div>
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
                    <td className="py-2.5 px-3">{e.hours > 0 ? `${e.hours.toFixed(2)}h` : "—"}</td>
                    <td className="py-2.5 px-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        e.remarks === "Regular" ? "bg-green-100 text-green-700" :
                        e.remarks === "Late" ? "bg-orange-100 text-orange-700" :
                        "bg-gray-100 text-gray-500"
                      }`}>{e.remarks}</span>
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
    </div>
  );
}
