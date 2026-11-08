import { 
  Users, Building2, Clock, CheckCircle, GraduationCap, 
  ArrowUpRight, AlertCircle, ShieldCheck, BookOpen 
} from "lucide-react";
import { AdminStudent, AdminCompany } from "../../hooks/useAdminData";
import { CoordinatorItem } from "../../lib/api";

const COURSES = [
  { code: "BSIT", name: "Information Technology", color: "blue", border: "border-blue-200", bg: "bg-blue-50/50", text: "text-blue-700" },
  { code: "BEED", name: "Elementary Education", color: "emerald", border: "border-emerald-200", bg: "bg-emerald-50/50", text: "text-emerald-700" },
  { code: "BSSW", name: "Social Work", color: "amber", border: "border-amber-200", bg: "bg-amber-50/50", text: "text-amber-700" },
  { code: "BSBA", name: "Business Administration", color: "purple", border: "border-purple-200", bg: "bg-purple-50/50", text: "text-purple-700" },
];

interface SuperAdminOverviewProps {
  students: AdminStudent[];
  companies: AdminCompany[];
  coordinators: CoordinatorItem[];
  onNavigate: (section: string) => void;
}

export function OverviewTab({ students, companies, coordinators, onNavigate }: SuperAdminOverviewProps) {
  // Aggregate calculations
  const totalStudents = students.length;
  const deployedStudents = students.filter(s => s.company && s.company !== "—").length;
  const totalHours = students.reduce((sum, s) => sum + (s.hoursCompleted || 0), 0);
  const activeCompanies = companies.filter(c => c.moaStatus === "active").length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 rounded-2xl p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/15 text-indigo-100 border border-white/20 mb-2">
              <ShieldCheck className="h-3.5 w-3.5" />
              Superadmin Central Command
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">University OJT Overview</h1>
            <p className="text-xs sm:text-sm text-indigo-200 mt-1 max-w-xl">
              Cross-program supervision across all 4th year academic departments: BSIT, BEED, BSSW, and BSBA.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate("coordinators")}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-white text-indigo-900 hover:bg-indigo-50 transition-colors shadow-sm flex items-center gap-1.5"
            >
              <Users className="h-3.5 w-3.5 text-indigo-600" />
              Manage Coordinators
            </button>
          </div>
        </div>
      </div>

      {/* Aggregate Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border/70 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Total Students</p>
            <div className="h-8 w-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <GraduationCap className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground mt-2">{totalStudents}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Across all 4 programs</p>
        </div>

        <div className="bg-card border border-border/70 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Active Deployments</p>
            <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground mt-2">{deployedStudents}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {totalStudents > 0 ? `${Math.round((deployedStudents / totalStudents) * 100)}% deployed` : "No students"}
          </p>
        </div>

        <div className="bg-card border border-border/70 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Logged Hours</p>
            <div className="h-8 w-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground mt-2">{totalHours.toLocaleString()} hrs</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Approved DTR duration</p>
        </div>

        <div className="bg-card border border-border/70 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Host Companies</p>
            <div className="h-8 w-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground mt-2">{companies.length}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{activeCompanies} with active MOA</p>
        </div>
      </div>

      {/* Program / Course Cards Breakdown */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-bold text-foreground">Academic Department Breakdown</h2>
            <p className="text-xs text-muted-foreground">Status and coordinator assignments per program</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {COURSES.map((course) => {
            const courseStudents = students.filter(s => (s.course || "BSIT").toUpperCase() === course.code);
            const courseDeployed = courseStudents.filter(s => s.company && s.company !== "—").length;
            const courseHours = courseStudents.reduce((sum, s) => sum + (s.hoursCompleted || 0), 0);
            const assignedCoord = coordinators.find(c => (c.coordinatorCourse || "").toUpperCase() === course.code);

            return (
              <div 
                key={course.code}
                className={`border rounded-2xl p-5 bg-card ${course.border} shadow-xs flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-xl ${course.bg} ${course.text} flex items-center justify-center font-bold text-sm shrink-0 border ${course.border}`}>
                        {course.code}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-foreground">{course.name}</h3>
                        <p className="text-[11px] text-muted-foreground font-mono">{course.code}</p>
                      </div>
                    </div>
                    {assignedCoord ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Coordinator Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                        No Coordinator
                      </span>
                    )}
                  </div>

                  {/* Coordinator line */}
                  <div className="bg-muted/40 rounded-xl p-2.5 mb-4 text-xs flex items-center justify-between">
                    <span className="text-muted-foreground text-[11px]">Assigned Coordinator:</span>
                    <span className="font-semibold text-foreground">
                      {assignedCoord ? assignedCoord.name : "Unassigned"}
                    </span>
                  </div>

                  {/* Metrics grid */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-muted/20 border border-border/40 rounded-xl p-2.5">
                      <p className="text-[10px] font-medium text-muted-foreground">Enrolled</p>
                      <p className="text-base font-bold text-foreground mt-0.5">{courseStudents.length}</p>
                    </div>
                    <div className="bg-muted/20 border border-border/40 rounded-xl p-2.5">
                      <p className="text-[10px] font-medium text-muted-foreground">Deployed</p>
                      <p className="text-base font-bold text-emerald-600 mt-0.5">{courseDeployed}</p>
                    </div>
                    <div className="bg-muted/20 border border-border/40 rounded-xl p-2.5">
                      <p className="text-[10px] font-medium text-muted-foreground">Total Hours</p>
                      <p className="text-base font-bold text-indigo-600 mt-0.5">{courseHours}h</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-2 border-t border-border/60 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground text-[11px]">
                    {courseStudents.length > 0
                      ? `${Math.round((courseDeployed / courseStudents.length) * 100)}% placement rate`
                      : "0 students"}
                  </span>
                  <button
                    onClick={() => onNavigate("students")}
                    className="text-primary hover:underline font-medium inline-flex items-center gap-1 text-xs"
                  >
                    View Students <ArrowUpRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

