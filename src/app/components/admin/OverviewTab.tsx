import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { GraduationCap, Building2, Briefcase, TrendingUp, AlertCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { AdminStudent, AdminCompany } from "../../hooks/useAdminData";
import { StatusBadge } from "../student/shared";

interface OverviewTabProps {
  students: AdminStudent[];
  companies: AdminCompany[];
  setActiveSection: (section: string) => void;
  monthlyPlacementData: any[];
  sectionDistribution: any[];
}

export function OverviewTab({ students, companies, setActiveSection, monthlyPlacementData, sectionDistribution }: OverviewTabProps) {
  const overviewStats = [
    { label: "Total OJT Students", value: String(students.length), icon: <GraduationCap className="h-5 w-5" />, color: "text-blue-600 bg-blue-100", change: "" },
    { label: "Partner Companies", value: String(companies.length), icon: <Building2 className="h-5 w-5" />, color: "text-green-600 bg-green-100", change: "" },
    { label: "Active Deployments", value: String(students.filter(s => s.status === "ongoing").length), icon: <Briefcase className="h-5 w-5" />, color: "text-orange-600 bg-orange-100", change: "" },
    { label: "Completed", value: String(students.filter(s => s.status === "completed").length), icon: <TrendingUp className="h-5 w-5" />, color: "text-purple-600 bg-purple-100", change: "" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">OJT Coordinator Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of all OJT activities — April 20, 2026</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {overviewStats.map((s, i) => (
          <Card key={i} className="border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2.5 rounded-lg ${s.color}`}>{s.icon}</div>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className="text-xs text-green-600 font-medium mt-0.5">{s.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Monthly Placement Trends</CardTitle>
            <CardDescription>Applications vs Placements</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthlyPlacementData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="applications" fill="#93C5FD" name="Applications" radius={[3,3,0,0]} />
                <Bar dataKey="placements" fill="#2563EB" name="Placements" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Placement by Section</CardTitle>
            <CardDescription>BSIT — distribution across sections</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={sectionDistribution} cx="45%" cy="50%" outerRadius={85} dataKey="value" label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {sectionDistribution.map((entry, index) => (
                    <Cell key={`section-cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [value, name]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
              {sectionDistribution.map((c, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                  <span className="text-xs text-muted-foreground">{c.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Students</CardTitle>
            <button className="text-xs text-primary hover:underline" onClick={() => setActiveSection("students")}>View All</button>
          </CardHeader>
          <CardContent className="space-y-2">
            {students.slice(0, 4).map(s => (
              <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/30">
                <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center text-xs flex-shrink-0">
                  {s.name.split(" ").map(n => n[0]).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{s.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{s.course} {s.section} • {s.company}</p>
                </div>
                <StatusBadge status={s.status} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Alerts & Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { msg: "Creative Studios PH pending MOA verification", type: "warning", action: "Verify Now", section: "companies" },
              { msg: "Carlo Reyes has not submitted journals this week", type: "error", action: "View", section: "journals" },
              { msg: "5 students nearing OJT completion (>90% hrs)", type: "info", action: "Review", section: "students" },
              { msg: "2 company MOAs expiring in 60 days", type: "warning", action: "Renew", section: "companies" },
            ].map((a, i) => (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${
                a.type === "error" ? "bg-red-50 border-red-100" :
                a.type === "warning" ? "bg-orange-50 border-orange-100" :
                "bg-blue-50 border-blue-100"
              }`}>
                <AlertCircle className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                  a.type === "error" ? "text-red-500" : a.type === "warning" ? "text-orange-500" : "text-blue-500"
                }`} />
                <p className="text-xs flex-1">{a.msg}</p>
                <button className="text-xs font-medium text-primary hover:underline flex-shrink-0" onClick={() => setActiveSection(a.section)}>{a.action}</button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
