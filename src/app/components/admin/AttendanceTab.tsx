import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Search, Download } from "lucide-react";
import { DTRLog } from "../../hooks/useAdminData";
import { StatusBadge } from "../student/shared";

interface AttendanceTabProps {
  dtrLogs: DTRLog[];
}

export function AttendanceTab({ dtrLogs }: AttendanceTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Attendance Monitoring</h1>
          <p className="text-muted-foreground mt-1">View and monitor student DTR logs</p>
        </div>
        <Button variant="outline" className="gap-2 h-9 text-sm"><Download className="h-4 w-4" /> Export DTR</Button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search student..." className="pl-9" />
        </div>
        <Input type="date" className="w-44" defaultValue="2026-04-20" />
        <select className="border border-border rounded-lg px-3 text-sm bg-card"><option>All Companies</option></select>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Student</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Time In</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Time Out</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Hours</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {dtrLogs.length === 0 ? (
                  <tr><td colSpan={6} className="py-12 text-center text-muted-foreground text-sm">No DTR records yet. Students will appear here once they clock in.</td></tr>
                ) : dtrLogs.map((log, i) => (
                  <tr key={i} className={`border-b border-border last:border-0 ${i % 2 === 0 ? "bg-muted/10" : ""}`}>
                    <td className="py-3 px-4 font-medium">{log.student}</td>
                    <td className="py-3 px-4 text-muted-foreground">{log.date}</td>
                    <td className="py-3 px-4">{log.timeIn}</td>
                    <td className="py-3 px-4">{log.timeOut}</td>
                    <td className="py-3 px-4">{log.hours > 0 ? `${log.hours}h` : "—"}</td>
                    <td className="py-3 px-4"><StatusBadge status={log.status} /></td>
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
