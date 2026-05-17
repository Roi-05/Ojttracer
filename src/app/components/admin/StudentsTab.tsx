import { useState } from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Search, Plus, Eye, Edit, Trash2 } from "lucide-react";
import { AdminStudent } from "../../hooks/useAdminData";
import { StatusBadge } from "../student/shared";

interface StudentsTabProps {
  students: AdminStudent[];
  sections: string[];
  openAddModal: () => void;
}

export function StudentsTab({ students, sections, openAddModal }: StudentsTabProps) {
  const [studentSearch, setStudentSearch] = useState("");
  const [studentStatusFilter, setStudentStatusFilter] = useState("all");
  const [studentSectionFilter, setStudentSectionFilter] = useState("all");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Student Management</h1>
          <p className="text-muted-foreground mt-1">Track and manage all OJT students</p>
        </div>
        <Button className="bg-green-600 hover:bg-green-700 text-white gap-2" onClick={openAddModal}>
          <Plus className="h-4 w-4" /> Add Student
        </Button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search students..." className="pl-9" value={studentSearch} onChange={e => setStudentSearch(e.target.value)} />
        </div>
        <select className="border border-border rounded-lg px-3 text-sm bg-card" value={studentStatusFilter} onChange={e => setStudentStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="ongoing">Ongoing</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
        </select>
        <select className="border border-border rounded-lg px-3 text-sm bg-card" value={studentSectionFilter} onChange={e => setStudentSectionFilter(e.target.value)}>
          <option value="all">All Sections</option>
          {sections.map(s => <option key={s} value={s}>BSIT {s}</option>)}
        </select>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Student</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Section</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Company</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Progress</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.filter(s =>
                  (studentSectionFilter === "all" || s.section === studentSectionFilter) &&
                  (studentStatusFilter === "all" || s.status === studentStatusFilter) &&
                  (studentSearch === "" || s.name.toLowerCase().includes(studentSearch.toLowerCase()) || s.studentId.toLowerCase().includes(studentSearch.toLowerCase()))
                ).map((s, i) => {
                  const pct = s.requiredHours ? Math.round((s.hoursCompleted / s.requiredHours) * 100) : 0;
                  return (
                    <tr key={s.id} className={`border-b border-border last:border-0 ${i % 2 === 0 ? "bg-muted/10" : ""}`}>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 font-bold text-xs flex items-center justify-center">{s.name.split(" ").map(n => n[0]).join("")}</div>
                          <div>
                            <p className="font-medium">{s.name}</p>
                            <p className="text-xs text-muted-foreground">{s.studentId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground"><span className="font-medium text-foreground">BSIT {s.section}</span></td>
                      <td className="py-3 px-4 text-muted-foreground text-xs max-w-[130px] truncate">{s.company || "—"}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 min-w-[100px]">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs font-medium w-8">{pct}%</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{s.hoursCompleted}/{s.requiredHours} hrs</p>
                      </td>
                      <td className="py-3 px-4"><StatusBadge status={s.status} /></td>
                      <td className="py-3 px-4">
                        <div className="flex gap-1.5">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Eye className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Edit className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></Button>
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
