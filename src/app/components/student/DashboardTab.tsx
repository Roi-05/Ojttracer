import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Timer, BookOpen, Upload, Calendar, TrendingUp, Camera, Megaphone } from "lucide-react";
import { DailyAccomplishment, StudentDocument, Announcement } from "../../hooks/useStudentData";
import { TODAY_LABEL } from "./shared";
import { StatusBadge } from "./shared";

interface DashboardTabProps {
  user: any;
  studentProfile: any;
  effectiveDeployment: any;
  pct: number;
  accomplishmentList: DailyAccomplishment[];
  studentDocs: StudentDocument[];
  announcementData: Announcement[];
  setActiveSection: (section: string) => void;
  setShowAccomplishmentModal: (show: boolean) => void;
}

export function DashboardTab({
  user,
  studentProfile,
  effectiveDeployment,
  pct,
  accomplishmentList,
  studentDocs,
  announcementData,
  setActiveSection,
  setShowAccomplishmentModal
}: DashboardTabProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Welcome back, {user?.name?.split(" ")[0] || studentProfile.name.split(" ")[0]}! 👋</h1>
        <p className="text-muted-foreground mt-1">Here's your OJT progress overview for today, {TODAY_LABEL}.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Hours Completed", value: `${effectiveDeployment.completedHours}`, total: `/ ${effectiveDeployment.requiredHours} hrs`, icon: <Timer className="h-5 w-5" />, color: "text-blue-600 bg-blue-100", pct: pct },
          { label: "Journal Entries", value: `${accomplishmentList.length}`, total: "logged", icon: <BookOpen className="h-5 w-5" />, color: "text-green-600 bg-green-100", pct: null },
          { label: "Documents", value: `${studentDocs.filter(d => d.status === "approved").length}/${studentDocs.length}`, total: "approved", icon: <Upload className="h-5 w-5" />, color: "text-orange-600 bg-orange-100", pct: null },
          { label: "Days Remaining", value: "40", total: "until end", icon: <Calendar className="h-5 w-5" />, color: "text-purple-600 bg-purple-100", pct: null },
        ].map((s, i) => (
          <Card key={i} className="border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2.5 rounded-lg ${s.color}`}>{s.icon}</div>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </div>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.total}</p>
              {s.pct !== null && (
                <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${s.pct}%` }} />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">OJT Progress</CardTitle>
            <CardDescription>{effectiveDeployment.company} — {effectiveDeployment.position}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{effectiveDeployment.completedHours} hours completed</span>
              <span className="text-sm text-muted-foreground">{effectiveDeployment.requiredHours - effectiveDeployment.completedHours} hrs remaining</span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden mb-1">
              <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-xs text-muted-foreground text-right">{pct}% complete</p>
            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border">
              <div className="text-center">
                <p className="text-sm font-semibold">{effectiveDeployment.startDate}</p>
                <p className="text-xs text-muted-foreground">Start Date</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold">{effectiveDeployment.endDate}</p>
                <p className="text-xs text-muted-foreground">End Date</p>
              </div>
              <div className="text-center">
                <StatusBadge status={effectiveDeployment.status} />
                <p className="text-xs text-muted-foreground mt-1">Status</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: "Time In / Out", icon: <Camera className="h-4 w-4" />, action: () => setActiveSection("attendance"), color: "bg-blue-50 text-blue-600 hover:bg-blue-100" },
              { label: "Post Journal Entry", icon: <BookOpen className="h-4 w-4" />, action: () => { setActiveSection("journal"); setShowAccomplishmentModal(true); }, color: "bg-green-50 text-green-600 hover:bg-green-100" },
              { label: "Upload Document", icon: <Upload className="h-4 w-4" />, action: () => setActiveSection("documents"), color: "bg-orange-50 text-orange-600 hover:bg-orange-100" },
              { label: "View Announcements", icon: <Megaphone className="h-4 w-4" />, action: () => setActiveSection("announcements"), color: "bg-purple-50 text-purple-600 hover:bg-purple-100" },
            ].map((q, i) => (
              <button key={i} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-sm font-medium ${q.color}`} onClick={q.action}>
                {q.icon} {q.label}
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent Announcements</CardTitle>
          <button className="text-xs text-primary hover:underline" onClick={() => setActiveSection("announcements")}>View All</button>
        </CardHeader>
        <CardContent className="space-y-3">
          {announcementData.slice(0, 3).map(a => (
            <div key={a.id} className={`flex items-start gap-3 p-3 rounded-lg border ${!a.read ? "border-blue-100 bg-blue-50/50" : "border-border bg-muted/20"}`}>
              <div className={`mt-0.5 h-2 w-2 rounded-full flex-shrink-0 ${!a.read ? "bg-primary" : "bg-muted-foreground/30"}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{a.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{a.content}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${a.priority === "high" ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-600"}`}>{a.date}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
