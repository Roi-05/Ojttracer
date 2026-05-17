import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Filter } from "lucide-react";
import { AdminStudent } from "../../hooks/useAdminData";
import { StatusBadge } from "../student/shared";

interface DeploymentTabProps {
  students: AdminStudent[];
}

export function DeploymentTab({ students }: DeploymentTabProps) {
  const deployed = students.filter(s => s.status !== "pending").length;
  const pending = students.filter(s => s.status === "pending").length;
  const completed = students.filter(s => s.status === "completed").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">OJT Deployment Tracking</h1>
        <p className="text-muted-foreground mt-1">Monitor student-company assignments and deployment status</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Deployed", value: deployed, color: "border-l-4 border-l-blue-500 bg-blue-50" },
          { label: "Pending Deployment", value: pending, color: "border-l-4 border-l-orange-500 bg-orange-50" },
          { label: "Completed", value: completed, color: "border-l-4 border-l-green-500 bg-green-50" },
        ].map((s, i) => (
          <Card key={i} className={`border-0 shadow-sm ${s.color}`}>
            <CardContent className="p-4 flex items-center justify-between">
              <span className="text-sm font-medium">{s.label}</span>
              <span className="text-2xl font-bold">{s.value}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Deployment Records</CardTitle>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5"><Filter className="h-3.5 w-3.5" /> Filter</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Student</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Company</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Position</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Period</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Hours</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {students.filter(s => s.status !== "pending").map((s, i) => {
                  const pct = s.requiredHours ? Math.round((s.hoursCompleted / s.requiredHours) * 100) : 0;
                  return (
                    <tr key={s.id} className={`border-b border-border last:border-0 ${i % 2 === 0 ? "bg-muted/10" : ""}`}>
                      <td className="py-3 px-4 font-medium">{s.name}</td>
                      <td className="py-3 px-4 text-muted-foreground text-xs">{s.company}</td>
                      <td className="py-3 px-4 text-muted-foreground text-xs">{s.position}</td>
                      <td className="py-3 px-4 text-muted-foreground text-xs">Feb – May 2026</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 min-w-[80px]">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden w-12">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs">{pct}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4"><StatusBadge status={s.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
