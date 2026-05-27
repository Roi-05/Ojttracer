import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Users, CheckCircle, TrendingUp } from "lucide-react";
import { Intern } from "../../hooks/useCompanyData";
import { StatusBadge } from "../student/shared";

interface DashboardTabProps {
  companyInfo: any;
  interns: Intern[];
  setActiveSection: (section: string) => void;
}

export function DashboardTab({ companyInfo, interns, setActiveSection }: DashboardTabProps) {
  const activeInterns = interns.filter(i => i.status === "ongoing").length;
  const completedInterns = interns.filter(i => i.status === "completed").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Company Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back{companyInfo.name ? `, ${companyInfo.name}` : ""} — {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: "Active Interns", value: activeInterns.toString(), icon: <Users className="h-5 w-5" />, color: "text-blue-600 bg-blue-100", sub: "currently deployed" },
          { label: "Completed OJTs", value: completedInterns.toString(), icon: <CheckCircle className="h-5 w-5" />, color: "text-green-600 bg-green-100", sub: "this semester" },
          { label: "Total Interns (All Time)", value: interns.length.toString(), icon: <TrendingUp className="h-5 w-5" />, color: "text-purple-600 bg-purple-100", sub: "deployed to company" },
        ].map((s, i) => (
          <Card key={i} className="border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2.5 rounded-lg ${s.color}`}>{s.icon}</div>
              </div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Active Interns Overview */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Current Interns</CardTitle>
          <button className="text-xs text-primary hover:underline" onClick={() => setActiveSection("interns")}>View All</button>
        </CardHeader>
        <CardContent className="space-y-3">
          {interns.map(intern => {
            const pct = Math.round((intern.hoursCompleted / intern.requiredHours) * 100);
            return (
              <div key={intern.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center text-sm flex-shrink-0">
                  {intern.name.split(" ").map(n => n[0]).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-medium truncate">{intern.name}</p>
                    <StatusBadge status={intern.status} />
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{intern.position}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-medium text-blue-600 w-8 text-right">{pct}%</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-green-600">{intern.performance}%</p>
                  <p className="text-xs text-muted-foreground">Rating</p>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
