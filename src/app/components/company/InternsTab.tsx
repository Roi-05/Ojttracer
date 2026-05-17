import { Card, CardContent } from "../ui/card";
import { MapPin } from "lucide-react";
import { Intern } from "../../hooks/useCompanyData";
import { StatusBadge } from "../student/shared";

interface InternsTabProps {
  interns: Intern[];
}

export function InternsTab({ interns }: InternsTabProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Interns</h1>
        <p className="text-muted-foreground mt-1">Monitor assigned interns, their progress, and hours</p>
      </div>

      <div className="grid gap-4">
        {interns.length === 0 && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              No interns assigned yet. Check back when students have been deployed.
            </CardContent>
          </Card>
        )}
        {interns.map(intern => {
          const pct = Math.round((intern.hoursCompleted / intern.requiredHours) * 100);
          return (
            <Card key={intern.id} className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center flex-shrink-0">
                    {intern.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className="font-semibold">{intern.name}</h3>
                          <StatusBadge status={intern.status} />
                        </div>
                        <p className="text-sm text-muted-foreground">{intern.course} — {intern.position}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> Supervisor: {intern.supervisor}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-2xl font-bold text-green-600">{intern.performance}%</div>
                        <p className="text-xs text-muted-foreground">Performance</p>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-4 pt-3 border-t border-border">
                      <div>
                        <p className="text-xs text-muted-foreground">OJT Period</p>
                        <p className="text-xs font-medium mt-0.5">{intern.startDate} — {intern.endDate}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Hours Completed</p>
                        <p className="text-xs font-medium mt-0.5">{intern.hoursCompleted}/{intern.requiredHours} hrs</p>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
