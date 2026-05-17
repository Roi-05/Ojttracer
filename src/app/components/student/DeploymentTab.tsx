import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { MapPin, Building2 } from "lucide-react";
import { StatusBadge } from "./shared";

interface DeploymentTabProps {
  effectiveDeployment: any;
  pct: number;
}

export function DeploymentTab({ effectiveDeployment, pct }: DeploymentTabProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Deployment</h1>
        <p className="text-muted-foreground mt-1">Your current OJT deployment details and progress</p>
      </div>

      <div className="grid gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Deployment Details</CardTitle>
              <StatusBadge status={effectiveDeployment.status} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-5 pb-5 border-b border-border">
              <div className="h-14 w-14 bg-blue-100 rounded-xl flex items-center justify-center">
                <Building2 className="h-7 w-7 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-lg">{effectiveDeployment.company}</h3>
                <p className="text-muted-foreground text-sm flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{effectiveDeployment.address}</p>
                <p className="text-sm text-blue-600 font-medium mt-1">{effectiveDeployment.position}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-5">
              {[
                { label: "Supervisor", value: effectiveDeployment.supervisor },
                { label: "Supervisor Email", value: effectiveDeployment.supervisorEmail },
                { label: "Start Date", value: effectiveDeployment.startDate },
                { label: "End Date", value: effectiveDeployment.endDate },
              ].map((item, i) => (
                <div key={i}>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-sm font-medium mt-0.5">{item.value}</p>
                </div>
              ))}
            </div>
            {/* Progress */}
            <div className="p-4 bg-muted/30 rounded-xl">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Hours Completed</span>
                <span className="text-sm font-bold text-primary">{pct}%</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden mb-2">
                <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full" style={{ width: `${pct}%` }} />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{effectiveDeployment.completedHours} hrs done</span>
                <span>{effectiveDeployment.requiredHours - effectiveDeployment.completedHours} hrs remaining</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
