import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { GraduationCap, Building2, Briefcase, CheckCircle2, TrendingUp, Users } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, RadialBarChart, RadialBar
} from "recharts";
import { AdminStudent, AdminCompany } from "../../hooks/useAdminData";

const COLORS = ["#2563EB", "#16A34A", "#EA580C", "#7C3AED", "#DC2626"];

interface AnalyticsTabProps {
  students: AdminStudent[];
  companies: AdminCompany[];
  overviewStats: any[];
  hoursProgressData: any[];
  monthlyPlacementData: any[];
  sectionDistribution: any[];
}

export function AnalyticsTab({ students, companies, sectionDistribution }: AnalyticsTabProps) {
  const ongoing   = students.filter(s => s.status === "ongoing").length;
  const completed = students.filter(s => s.status === "completed").length;
  const pending   = students.filter(s => s.status === "pending").length;
  const verified  = companies.filter(c => c.verified).length;

  const deploymentRate  = students.length ? Math.round((ongoing / students.length) * 100) : 0;
  const completionRate  = students.length ? Math.round((completed / students.length) * 100) : 0;
  const pendingRate     = students.length ? Math.round((pending / students.length) * 100) : 0;
  const companyApproval = companies.length ? Math.round((verified / companies.length) * 100) : 0;

  const statusData = [
    { name: "Ongoing", value: ongoing, fill: "#2563EB" },
    { name: "Completed", value: completed, fill: "#7C3AED" },
    { name: "Pending", value: pending, fill: "#EA580C" },
  ].filter(d => d.value > 0);

  // Section bar chart data
  const sectionBarData = sectionDistribution.map(s => ({
    name: `BSIT ${s.name}`,
    Students: s.value,
  }));

  // Company industry pie
  const industryMap: Record<string, number> = {};
  companies.forEach(c => {
    const ind = c.industry || "Other";
    industryMap[ind] = (industryMap[ind] || 0) + 1;
  });
  const industryData = Object.entries(industryMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const kpis = [
    { label: "Total Students", value: students.length, icon: <GraduationCap className="h-5 w-5" />, bg: "bg-blue-500", ring: "ring-blue-100" },
    { label: "Deployed", value: `${deploymentRate}%`, icon: <Briefcase className="h-5 w-5" />, bg: "bg-orange-500", ring: "ring-orange-100" },
    { label: "Completed", value: `${completionRate}%`, icon: <CheckCircle2 className="h-5 w-5" />, bg: "bg-purple-500", ring: "ring-purple-100" },
    { label: "Companies", value: companies.length, icon: <Building2 className="h-5 w-5" />, bg: "bg-emerald-500", ring: "ring-emerald-100" },
  ];

  const radialData = [
    { name: "Deployment Rate", value: deploymentRate, fill: "#2563EB" },
    { name: "Completion Rate", value: completionRate, fill: "#7C3AED" },
    { name: "Awaiting Deployment", value: pendingRate, fill: "#EA580C" },
    { name: "Company Approval", value: companyApproval, fill: "#16A34A" },
  ];

  const EmptyChart = ({ message }: { message: string }) => (
    <div className="h-48 flex flex-col items-center justify-center text-muted-foreground gap-2">
      <TrendingUp className="h-8 w-8 opacity-20" />
      <p className="text-sm">{message}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
        <p className="text-muted-foreground mt-1">Data-driven insights on OJT performance and outcomes</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((s, i) => (
          <Card key={i} className="border-0 shadow-sm overflow-hidden">
            <CardContent className="p-5 relative">
              <div className={`inline-flex p-2.5 rounded-xl text-white ring-4 ${s.bg} ${s.ring} mb-3`}>{s.icon}</div>
              <p className="text-3xl font-bold tabular-nums">{s.value}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{s.label}</p>
              <div className={`absolute inset-x-0 bottom-0 h-0.5 ${s.bg} opacity-60`} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Radial rates + status pie */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Radial rate chart */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" /> Key Rates
            </CardTitle>
          </CardHeader>
          <CardContent>
            {students.length === 0 ? (
              <EmptyChart message="Import students to see rate data" />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <RadialBarChart innerRadius="20%" outerRadius="90%" data={radialData} startAngle={180} endAngle={-180}>
                    <RadialBar dataKey="value" cornerRadius={6} background={{ fill: "#f4f4f5" }} />
                    <Tooltip formatter={(v) => [`${v}%`]} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {radialData.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: r.fill }} />
                      <span className="text-muted-foreground">{r.name}</span>
                      <span className="font-bold ml-auto">{r.value}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Student status pie */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" /> Student Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length === 0 ? (
              <EmptyChart message="No student data yet" />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} dataKey="value"
                      label={({ name, value }) => `${name} (${value})`} labelLine={false} fontSize={11}
                    >
                      {statusData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-4 mt-2 flex-wrap">
                  {statusData.map((d, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: d.fill }} />
                      {d.name}: <strong className="text-foreground ml-0.5">{d.value}</strong>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Section bar + Industry pie */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Students per Section</CardTitle>
          </CardHeader>
          <CardContent>
            {sectionBarData.every(d => d.Students === 0) ? (
              <EmptyChart message="No student data yet" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={sectionBarData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="Students" radius={[4, 4, 0, 0]}>
                    {sectionBarData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Partner Companies by Industry</CardTitle>
          </CardHeader>
          <CardContent>
            {industryData.length === 0 ? (
              <EmptyChart message="No company data yet" />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={industryData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} dataKey="value"
                      label={({ name, value }) => `${value}`} fontSize={11}
                    >
                      {industryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 justify-center">
                  {industryData.map((d, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      {d.name} ({d.value})
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary table */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Section Summary</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Section</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Total</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Deployed</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Completed</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden md:table-cell">Progress</th>
                </tr>
              </thead>
              <tbody>
                {sectionDistribution.map((sec, i) => {
                  const sStudents = students.filter(s => s.section === sec.name);
                  const sOngoing  = sStudents.filter(s => s.status === "ongoing").length;
                  const sDone     = sStudents.filter(s => s.status === "completed").length;
                  const pct       = sec.value > 0 ? Math.round(((sOngoing + sDone) / sec.value) * 100) : 0;
                  return (
                    <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/10 transition-colors">
                      <td className="py-3 px-4 font-medium">BSIT {sec.name}</td>
                      <td className="py-3 px-4 text-right tabular-nums">{sec.value}</td>
                      <td className="py-3 px-4 text-right tabular-nums text-blue-600">{sOngoing}</td>
                      <td className="py-3 px-4 text-right tabular-nums text-purple-600">{sDone}</td>
                      <td className="py-3 px-4 hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                          </div>
                          <span className="text-xs text-muted-foreground tabular-nums w-8">{pct}%</span>
                        </div>
                      </td>
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
