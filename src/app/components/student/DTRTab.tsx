import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { Camera, CameraOff, Download } from "lucide-react";
import { DTRRecord } from "../../hooks/useStudentData";
import { formatDate, TODAY_LABEL, TODAY_DAY } from "./shared";

interface DTRTabProps {
  dtrRecords: DTRRecord[];
  todayRecord: DTRRecord | null;
  openCamera: (mode: "in" | "out") => void;
}

export function DTRTab({ dtrRecords, todayRecord, openCamera }: DTRTabProps) {
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
                    ? <img src={todayRecord.timeInPhoto} alt="Time In" className="h-full w-full object-cover" />
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
                    ? <img src={todayRecord.timeOutPhoto} alt="Time Out" className="h-full w-full object-cover" />
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
          <Button variant="outline" size="sm" className="gap-2 h-8 text-xs"><Download className="h-3.5 w-3.5" /> Export DTR</Button>
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
                        ? <img src={e.timeInPhoto} alt="" className="h-8 w-8 rounded object-cover border border-border" />
                        : <span className="text-muted-foreground text-xs">—</span>}
                    </td>
                    <td className="py-2.5 px-3 font-medium">{e.timeOut ?? "—"}</td>
                    <td className="py-2.5 px-3">
                      {e.timeOutPhoto
                        ? <img src={e.timeOutPhoto} alt="" className="h-8 w-8 rounded object-cover border border-border" />
                        : <span className="text-muted-foreground text-xs">—</span>}
                    </td>
                    <td className="py-2.5 px-3">{e.hours > 0 ? `${e.hours}h` : "—"}</td>
                    <td className="py-2.5 px-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        e.remarks === "Regular" ? "bg-green-100 text-green-700" :
                        e.remarks === "Late" ? "bg-orange-100 text-orange-700" :
                        "bg-gray-100 text-gray-500"
                      }`}>{e.remarks}</span>
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
