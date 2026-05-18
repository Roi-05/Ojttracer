import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Search, MapPin, Briefcase, Building2, Clock } from "lucide-react";
import { AdminStudent } from "../../hooks/useAdminData";
import { StatusBadge } from "../student/shared";

interface DeploymentTabProps {
  students: AdminStudent[];
}

const STATUS_ORDER = ["ongoing", "completed", "pending"];

export function DeploymentTab({ students }: DeploymentTabProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const ongoing   = students.filter(s => s.status === "ongoing").length;
  const completed = students.filter(s => s.status === "completed").length;
  const pending   = students.filter(s => s.status === "pending").length;

  const deployed = students.filter(s => s.status !== "pending");

  const filtered = deployed.filter(s =>
    (statusFilter === "all" || s.status === statusFilter) &&
    (search === "" ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.company.toLowerCase().includes(search.toLowerCase()) ||
      s.studentId.toLowerCase().includes(search.toLowerCase()))
  ).sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status));

  // Unique companies from deployed students
  const companies = [...new Set(deployed.map(s => s.company).filter(c => c !== "—"))];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">OJT Deployment Tracking</h1>
        <p className="text-muted-foreground mt-1">Monitor active internships, company assignments, and progress</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Active Interns", value: ongoing, icon: <Briefcase className="h-5 w-5" />, color: "text-blue-600 bg-blue-100", border: "border-l-blue-500" },
          { label: "Completed", value: completed, icon: <Clock className="h-5 w-5" />, color: "text-purple-600 bg-purple-100", border: "border-l-purple-500" },
          { label: "Awaiting Deploy", value: pending, icon: <Clock className="h-5 w-5" />, color: "text-orange-600 bg-orange-100", border: "border-l-orange-500" },
          { label: "Partner Companies", value: companies.length, icon: <Building2 className="h-5 w-5" />, color: "text-green-600 bg-green-100", border: "border-l-green-500" },
        ].map((s, i) => (
          <Card key={i} className={`border-0 border-l-4 shadow-sm ${s.border}`}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2.5 rounded-lg shrink-0 ${s.color}`}>{s.icon}</div>
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name, company, or student ID…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="border border-border rounded-lg px-3 text-sm bg-card" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="ongoing">Ongoing</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Deployment Records ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Student</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden sm:table-cell">Student No.</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Company</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden md:table-cell">Position</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden lg:table-cell">Hours Progress</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground text-sm">
                      {deployed.length === 0 ? "No students deployed yet. Use the Students tab to deploy students." : "No results match your search."}
                    </td>
                  </tr>
                ) : (
                  filtered.map(s => {
                    const pct = s.requiredHours > 0 ? Math.min(100, Math.round((s.hoursCompleted / s.requiredHours) * 100)) : 0;
                    const initials = [s.firstName.charAt(0), s.lastName.charAt(0)].filter(Boolean).join("") || s.name.charAt(0);
                    return (
                      <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/10 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                              {initials}
                            </div>
                            <div>
                              <p className="font-medium">{s.lastName && s.firstName ? `${s.lastName}, ${s.firstName}` : s.name}</p>
                              <p className="text-xs text-muted-foreground">{s.section}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground font-mono text-xs hidden sm:table-cell">{s.studentId}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="text-xs">{s.company}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground text-xs hidden md:table-cell">{s.position}</td>
                        <td className="py-3 px-4 hidden lg:table-cell">
                          <div className="flex items-center gap-2 min-w-[100px]">
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-purple-500" : "bg-blue-500"}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground tabular-nums w-8">{pct}%</span>
                          </div>
                        </td>
                        <td className="py-3 px-4"><StatusBadge status={s.status} /></td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
