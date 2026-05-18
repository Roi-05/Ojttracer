import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { GraduationCap, Building2, Briefcase, CheckCircle2, AlertTriangle, Clock, TrendingUp, ArrowRight, Users, Download } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { AdminStudent, AdminCompany } from "../../hooks/useAdminData";
import { StatusBadge } from "../student/shared";

interface OverviewTabProps {
  students: AdminStudent[];
  companies: AdminCompany[];
  setActiveSection: (section: string) => void;
  monthlyPlacementData: any[];
  sectionDistribution: any[];
  openReportsModal?: () => void;
}

const COLORS = ["#2563EB", "#16A34A", "#EA580C", "#7C3AED", "#DC2626"];

export function OverviewTab({ students, companies, setActiveSection, sectionDistribution, openReportsModal }: OverviewTabProps) {
  const ongoing    = students.filter(s => s.status === "ongoing").length;
  const completed  = students.filter(s => s.status === "completed").length;
  const pending    = students.filter(s => s.status === "pending").length;
  const verifiedCo = companies.filter(c => c.verified).length;

  const deploymentRate = students.length ? Math.round((ongoing / students.length) * 100) : 0;

  const stats = [
    {
      label: "Total Students",
      value: students.length,
      sub: `${pending} not yet deployed`,
      icon: <GraduationCap className="h-5 w-5" />,
      bg: "bg-blue-500",
      ring: "ring-blue-100",
    },
    {
      label: "Partner Companies",
      value: companies.length,
      sub: `${verifiedCo} verified / active`,
      icon: <Building2 className="h-5 w-5" />,
      bg: "bg-emerald-500",
      ring: "ring-emerald-100",
    },
    {
      label: "Active Deployments",
      value: ongoing,
      sub: `${deploymentRate}% deployment rate`,
      icon: <Briefcase className="h-5 w-5" />,
      bg: "bg-orange-500",
      ring: "ring-orange-100",
    },
    {
      label: "OJT Completed",
      value: completed,
      sub: students.length ? `${Math.round((completed / students.length) * 100)}% of students` : "0%",
      icon: <CheckCircle2 className="h-5 w-5" />,
      bg: "bg-purple-500",
      ring: "ring-purple-100",
    },
  ];

  // Dynamic alerts derived from real data
  const alerts: { msg: string; type: "warning" | "error" | "info"; section: string }[] = [];
  const pendingMoa = companies.filter(c => !c.verified);
  if (pendingMoa.length > 0)
    alerts.push({ msg: `${pendingMoa.length} company${pendingMoa.length > 1 ? "ies" : ""} pending MOA verification`, type: "warning", section: "companies" });
  if (pending > 0)
    alerts.push({ msg: `${pending} student${pending > 1 ? "s" : ""} not yet deployed to a company`, type: "info", section: "deployment" });
  if (alerts.length === 0)
    alerts.push({ msg: "Everything looks good! No urgent alerts.", type: "info", section: "dashboard" });

  const recentStudents = [...students].slice(-5).reverse();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">OJT Coordinator Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {openReportsModal && (
            <Button variant="outline" className="gap-2 border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800" onClick={openReportsModal}>
              <Download className="h-4 w-4" /> Generate Reports
            </Button>
          )}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full text-xs text-green-700 font-medium">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            System Live
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <Card key={i} className="border-0 shadow-sm overflow-hidden">
            <CardContent className="p-5 relative">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-2.5 rounded-xl text-white ${s.bg} ring-4 ${s.ring}`}>{s.icon}</div>
                <TrendingUp className="h-4 w-4 text-muted-foreground/40" />
              </div>
              <p className="text-3xl font-bold tabular-nums">{s.value}</p>
              <p className="text-sm font-medium mt-0.5">{s.label}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
              <div className={`absolute inset-x-0 bottom-0 h-0.5 ${s.bg} opacity-60`} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Deployment progress bar */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium">Overall Deployment Progress</p>
            </div>
            <p className="text-sm font-bold">{deploymentRate}%</p>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-700"
              style={{ width: `${deploymentRate}%` }}
            />
          </div>
          <div className="flex gap-4 mt-3 flex-wrap">
            {[
              { label: "Pending", count: pending, dot: "bg-muted-foreground/30" },
              { label: "Ongoing", count: ongoing, dot: "bg-blue-500" },
              { label: "Completed", count: completed, dot: "bg-purple-500" },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className={`h-2 w-2 rounded-full ${s.dot}`} />
                <span>{s.label}: <strong className="text-foreground">{s.count}</strong></span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Section distribution pie */}
        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Students by Section</CardTitle>
          </CardHeader>
          <CardContent>
            {sectionDistribution.every(s => s.value === 0) ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No student data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={sectionDistribution} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                    label={({ name, value }) => value > 0 ? `${name} (${value})` : ""}
                    labelLine={false} fontSize={11}
                  >
                    {sectionDistribution.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, `Section ${n}`]} />
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className="flex flex-wrap gap-3 mt-1 justify-center">
              {sectionDistribution.map((c, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span>BSIT {c.name} <strong className="text-foreground">({c.value})</strong></span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent students */}
        <Card className="border-0 shadow-sm lg:col-span-3">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recently Added Students</CardTitle>
            <button
              className="text-xs text-primary hover:underline flex items-center gap-1"
              onClick={() => setActiveSection("students")}
            >
              View All <ArrowRight className="h-3 w-3" />
            </button>
          </CardHeader>
          <CardContent className="space-y-1 p-0">
            {recentStudents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8 px-4">No students yet. Import students to get started.</p>
            ) : (
              recentStudents.map(s => {
                const initials = [s.firstName.charAt(0), s.lastName.charAt(0)].filter(Boolean).join("") || s.name.charAt(0);
                return (
                  <div key={s.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/20 transition-colors">
                    <div className="h-9 w-9 rounded-full bg-blue-100 text-blue-700 font-bold text-sm flex items-center justify-center shrink-0">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {s.lastName && s.firstName ? `${s.lastName}, ${s.firstName}` : s.name}
                      </p>
                      <p className="text-xs text-muted-foreground">{s.studentId} · {s.course} {s.section}</p>
                    </div>
                    <StatusBadge status={s.status} />
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" /> Alerts & Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {alerts.map((a, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 p-3 rounded-xl border text-sm ${
                a.type === "error" ? "bg-red-50 border-red-100 text-red-700" :
                a.type === "warning" ? "bg-orange-50 border-orange-100 text-orange-700" :
                "bg-blue-50 border-blue-100 text-blue-700"
              }`}
            >
              {a.type === "error" ? <AlertTriangle className="h-4 w-4 shrink-0" /> :
               a.type === "warning" ? <Clock className="h-4 w-4 shrink-0" /> :
               <CheckCircle2 className="h-4 w-4 shrink-0" />}
              <p className="flex-1">{a.msg}</p>
              {a.section !== "dashboard" && (
                <button
                  className="text-xs font-semibold underline-offset-2 hover:underline shrink-0"
                  onClick={() => setActiveSection(a.section)}
                >
                  Go →
                </button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
