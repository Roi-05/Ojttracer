import { useState, useEffect } from "react";
import { DashboardLayout } from "../components/DashboardLayout";
import { useAuth } from "../contexts/AuthContext";
import * as api from "../lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../components/ui/dialog";
import { toast } from "sonner";
import {
  LayoutDashboard, Building2, MapPin, Clock, BookOpen,
  FileCheck, Upload, Megaphone, FileText, BarChart3, Map,
  Plus, Eye, Download, Edit, Trash2, CheckCircle, XCircle,
  Search, TrendingUp, AlertCircle, Filter, GraduationCap, Briefcase
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from "recharts";

const menuItems = [
  { icon: <LayoutDashboard className="h-4 w-4" />, label: "Overview", value: "dashboard" },
  { icon: <GraduationCap className="h-4 w-4" />, label: "Students", value: "students" },
  { icon: <Building2 className="h-4 w-4" />, label: "Companies / HTEs", value: "companies" },
  { icon: <Briefcase className="h-4 w-4" />, label: "Deployment", value: "deployment" },
  { icon: <Clock className="h-4 w-4" />, label: "Attendance (DTR)", value: "attendance" },
  { icon: <BookOpen className="h-4 w-4" />, label: "Journals", value: "journals" },
  { icon: <Megaphone className="h-4 w-4" />, label: "Announcements", value: "announcements" },
  { icon: <Upload className="h-4 w-4" />, label: "Documents", value: "documents" },
  { icon: <BarChart3 className="h-4 w-4" />, label: "Analytics", value: "analytics" },
  { icon: <Map className="h-4 w-4" />, label: "Map View", value: "map" },
];

// --- Empty seed structures (data loaded from API) ---
const monthlyPlacementData: Array<{ month: string; placements: number; applications: number; completions: number }> = [];
const hoursProgressData: Array<{ week: string; avg: number }> = [];

const SECTIONS = ["4A", "4B", "4C", "4D"];

type AdminStudent = { id: string | number; name: string; studentId: string; course: string; section: string; company: string; position: string; hoursCompleted: number; requiredHours: number; status: string };
type AdminCompany = { id: string | number; name: string; industry: string; location: string; activeInterns: number; totalCapacity: number; moaStatus: string; moaExpiry: string; contactPerson: string; verified: boolean };
type DTRLog = { student: string; date: string; timeIn: string; timeOut: string; hours: number; status: string };
type JournalLog = { student: string; week: string; title: string; submitted: string; status: string };
type Announcement = { id: string | number; title: string; content: string; date: string; category: string; priority: string };
type CompanyLocation = { name: string; address: string; lat: number; lng: number; industry: string; interns: number; x: number; y: number };

const companyLocations: CompanyLocation[] = [];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ongoing: "bg-blue-100 text-blue-700 border-blue-200",
    completed: "bg-green-100 text-green-700 border-green-200",
    pending: "bg-orange-100 text-orange-700 border-orange-200",
    active: "bg-green-100 text-green-700 border-green-200",
    expired: "bg-red-100 text-red-700 border-red-200",
    regular: "bg-green-100 text-green-700 border-green-200",
    late: "bg-orange-100 text-orange-700 border-orange-200",
    rest: "bg-gray-100 text-gray-600 border-gray-200",
    submitted: "bg-blue-100 text-blue-700 border-blue-200",
    not_submitted: "bg-red-100 text-red-700 border-red-200",
    verified: "bg-green-100 text-green-700 border-green-200",
    unverified: "bg-orange-100 text-orange-700 border-orange-200",
  };
  const label = status === "not_submitted" ? "Not Submitted" : status.charAt(0).toUpperCase() + status.slice(1);
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${map[status] || "bg-gray-100 text-gray-600 border-gray-200"}`}>{label}</span>;
}

const COLORS = ["#2563EB", "#16A34A", "#EA580C", "#7C3AED", "#DC2626"];

export function AdminDashboard() {
  const { user } = useAuth();

  // Declared early so it can be referenced in the data-loading useEffect below
  const REQUIRED_DOC_NAMES = [
    "Parent Guardian Consent Form",
    "Certificate of Enrollment",
    "Certification Form",
    "Internship Endorsement Form",
    "1st Endorsement Form",
    "Internship Agreement Form",
    "Memorandum of Agreement",
  ];

  const [activeSection, setActiveSection] = useState("dashboard");
  const [students, setStudents] = useState<AdminStudent[]>([]);
  const [companies, setCompanies] = useState<AdminCompany[]>([]);
  const [companyList, setCompanyList] = useState<AdminCompany[]>([]);
  const [dtrLogs, setDtrLogs] = useState<DTRLog[]>([]);
  const [journalLogs, setJournalLogs] = useState<JournalLog[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [studentSectionFilter, setStudentSectionFilter] = useState<string>("all");
  const [studentStatusFilter, setStudentStatusFilter] = useState<string>("all");
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedMapCompany, setSelectedMapCompany] = useState<CompanyLocation | null>(null);
  const [annForm, setAnnForm] = useState({ title: "", content: "", category: "update", priority: "normal" });

  const overviewStats = [
    { label: "Total OJT Students", value: String(students.length), icon: <GraduationCap className="h-5 w-5" />, color: "text-blue-600 bg-blue-100", change: "" },
    { label: "Partner Companies", value: String(companies.length), icon: <Building2 className="h-5 w-5" />, color: "text-green-600 bg-green-100", change: "" },
    { label: "Active Deployments", value: String(students.filter(s => s.status === "ongoing").length), icon: <Briefcase className="h-5 w-5" />, color: "text-orange-600 bg-orange-100", change: "" },
    { label: "Completed", value: String(students.filter(s => s.status === "completed").length), icon: <TrendingUp className="h-5 w-5" />, color: "text-purple-600 bg-purple-100", change: "" },
  ];

  const sectionDistribution = SECTIONS.map((name, i) => ({
    name,
    value: students.filter(s => s.section === name).length,
    color: COLORS[i % COLORS.length],
  }));

  useEffect(() => {
    if (!user) return;
    api.getStudents().then((data: any[]) => {
      setStudents((data || []).map((s: any) => ({
        id: s.id, name: s.name, studentId: s.studentId || "—",
        course: "BSIT", section: s.section || "—",
        company: s.deployment?.company || "—", position: s.deployment?.position || "—",
        hoursCompleted: 0, requiredHours: s.deployment?.requiredHours || 486,
        status: s.deployment ? (s.deployment.status || "ongoing") : "pending",
      })));
    }).catch((e: any) => console.log("Students load error:", e));

    api.getCompanies().then((data: any[]) => {
      const mapped: AdminCompany[] = (data || []).map((c: any) => ({
        id: c.id, name: c.companyName || c.name, industry: c.industry || "—",
        location: c.companyAddress || "—", activeInterns: 0, totalCapacity: 0,
        moaStatus: c.moaStatus || "pending", moaExpiry: c.accreditedUntil || "—",
        contactPerson: c.hrContact || c.name, verified: c.moaStatus === "active",
      }));
      setCompanies(mapped);
      setCompanyList(mapped);
    }).catch((e: any) => console.log("Companies load error:", e));

    api.getAnnouncements().then((data: any[]) => {
      setAnnouncements((data || []).map((a: any) => ({
        id: a.id, title: a.title, content: a.content, date: a.date,
        category: a.category, priority: a.priority,
      })));
    }).catch((e: any) => console.log("Announcements load error:", e));

    // ── Admin DTR logs ────────────────────────────────────────────────────
    api.getAdminDTR().then((data: any[]) => {
      setDtrLogs((data || []).map((r: any) => ({
        student: r.studentName || r.studentId || "—",
        date: r.date || "—",
        timeIn: r.timeIn || "—",
        timeOut: r.timeOut || "—",
        hours: Number(r.hours) || 0,
        status: r.timeOut ? "regular" : r.timeIn ? "ongoing" : "rest",
      })));
    }).catch((e: any) => console.log("Admin DTR load error:", e));

    // ── Journal / Accomplishment logs ─────────────────────────────────────
    api.getAccomplishments().then((data: any[]) => {
      setJournalLogs((data || []).map((a: any) => ({
        student: a.studentName || a.studentId || "—",
        week: a.date || "—",
        title: a.details ? (a.details.length > 60 ? a.details.substring(0, 60) + "…" : a.details) : "—",
        submitted: a.createdAt
          ? new Date(a.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
          : "—",
        status: a.status === "rejected" ? "not_submitted" : "submitted",
      })));
    }).catch((e: any) => console.log("Journal load error:", e));

    // ── Document submissions (real API data) ──────────────────────────────
    api.getDocuments().then((data: any[]) => {
      setStudentSubmissions((data || []).map((s: any) => ({
        studentId: s.studentId,
        name: s.studentName || "—",
        studentNo: s.studentNo || "—",
        course: "BSIT",
        section: s.section || "—",
        deployed: false,
        assignedCompany: null,
        docs: REQUIRED_DOC_NAMES.map((docName) => {
          const found = (s.docs || []).find((d: any) => d.name === docName);
          return found
            ? { name: docName, status: found.status || "missing", file: found.fileUrl || null, uploaded: found.uploadedDate || "—" }
            : { name: docName, status: "missing", file: null, uploaded: "—" };
        }),
      })));
    }).catch((e: any) => console.log("Documents load error:", e));
  }, [user]);

  // ---- Document templates uploaded by admin (students download these) ----
  // (REQUIRED_DOC_NAMES is declared at the top of this component)
  type AdminTemplate = { name: string; file: string | null; size: string; uploaded: string };
  const [templates, setTemplates] = useState<AdminTemplate[]>(
    REQUIRED_DOC_NAMES.map((name) => ({ name, file: null, size: "—", uploaded: "—" }))
  );

  type AdminDocEntry = { name: string; status: string; file: string | null; uploaded: string };
  type AdminSubmission = { studentId: string | number; name: string; studentNo: string; course: string; section: string; deployed: boolean; assignedCompany: string | null; docs: AdminDocEntry[] };
  const [studentSubmissions, setStudentSubmissions] = useState<AdminSubmission[]>([]);

  // studentSubmissions is now populated directly from api.getDocuments() above.
  // This effect is intentionally removed to avoid overwriting real doc data.

  useEffect(() => {
    if (!user) return;
    api.getTemplates().then((data: any[]) => {
      const merged: AdminTemplate[] = REQUIRED_DOC_NAMES.map((name) => {
        const found = (data || []).find((t: any) => t.name === name);
        return found
          ? { name, file: found.fileUrl || `${name.replace(/\s+/g, "_")}.pdf`, size: found.size || "—", uploaded: found.uploadedDate || "—" }
          : { name, file: null, size: "—", uploaded: "—" };
      });
      setTemplates(merged);
    }).catch((e: any) => console.log("Templates load error:", e));
  }, [user]);

  const [showTemplateUpload, setShowTemplateUpload] = useState(false);
  const [templateForm, setTemplateForm] = useState({ name: REQUIRED_DOC_NAMES[0], file: "" });
  const [viewSubmissionId, setViewSubmissionId] = useState<string | number | null>(null);
  const [deployForm, setDeployForm] = useState<{ studentId: string | number; company: string; position: string; startDate: string; endDate: string }>({ studentId: "", company: "", position: "", startDate: "", endDate: "" });
  const [showDeployModal, setShowDeployModal] = useState(false);

  const handleSaveTemplate = async () => {
    if (!templateForm.file) { toast.error("Please choose a file"); return; }
    // Optimistic UI update
    setTemplates(list => list.map(t => t.name === templateForm.name
      ? { ...t, file: templateForm.file, size: "—", uploaded: "Uploading…" }
      : t));
    setShowTemplateUpload(false);
    try {
      await api.uploadTemplate(templateForm.name, templateForm.file, templateForm.file);
      setTemplates(list => list.map(t => t.name === templateForm.name
        ? { ...t, uploaded: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) }
        : t));
      toast.success(`${templateForm.name} template uploaded.`);
    } catch (e: any) {
      toast.error(`Upload failed: ${e.message}`);
      setTemplates(list => list.map(t => t.name === templateForm.name
        ? { ...t, file: null, size: "—", uploaded: "—" } : t));
    }
    setTemplateForm({ name: REQUIRED_DOC_NAMES[0], file: "" });
  };

  const allDocsApproved = (subId: string | number) => {
    const s = studentSubmissions.find(x => x.studentId === subId);
    return !!s && s.docs.every(d => d.status === "approved");
  };

  const handleApproveDoc = (subId: string | number, docName: string) => {
    // Optimistic update
    setStudentSubmissions(list => list.map(s => s.studentId === subId
      ? { ...s, docs: s.docs.map(d => d.name === docName ? { ...d, status: "approved" } : d) }
      : s));
    // Persist to API
    api.reviewDocument(String(subId), docName, "approved")
      .then(() => toast.success(`${docName} approved.`))
      .catch((e: any) => {
        toast.error(`Failed to save approval: ${e.message}`);
        // Revert on failure
        setStudentSubmissions(list => list.map(s => s.studentId === subId
          ? { ...s, docs: s.docs.map(d => d.name === docName ? { ...d, status: "pending" } : d) }
          : s));
      });
  };

  const handleRejectDoc = (subId: string | number, docName: string) => {
    // Optimistic update
    setStudentSubmissions(list => list.map(s => s.studentId === subId
      ? { ...s, docs: s.docs.map(d => d.name === docName ? { ...d, status: "missing", file: null, uploaded: "—" } : d) }
      : s));
    // Persist to API
    api.reviewDocument(String(subId), docName, "rejected")
      .then(() => toast.error(`${docName} rejected — student must resubmit.`))
      .catch((e: any) => {
        toast.error(`Failed to save rejection: ${e.message}`);
        setStudentSubmissions(list => list.map(s => s.studentId === subId
          ? { ...s, docs: s.docs.map(d => d.name === docName ? { ...d, status: "pending" } : d) }
          : s));
      });
  };

  const openDeploy = (subId: string | number) => {
    const s = studentSubmissions.find(x => x.studentId === subId);
    if (!s) return;
    setDeployForm({ studentId: subId, company: "", position: "", startDate: "", endDate: "" });
    setShowDeployModal(true);
  };

  const handleConfirmDeploy = async () => {
    if (!deployForm.company || !deployForm.position) { toast.error("Company and position required"); return; }
    // Find matching company object to get its ID
    const selectedCompany = companyList.find(c => c.name === deployForm.company);
    try {
      await api.deployStudent(String(deployForm.studentId), {
        companyId: selectedCompany ? String(selectedCompany.id) : "",
        companyName: deployForm.company,
        position: deployForm.position,
        startDate: deployForm.startDate,
        endDate: deployForm.endDate,
        requiredHours: 486,
      });
      // Reflect in local state
      setStudentSubmissions(list => list.map(s => s.studentId === deployForm.studentId
        ? { ...s, deployed: true, assignedCompany: deployForm.company } : s));
      // Also update students table row so Deployment section reflects it
      setStudents(list => list.map(s => String(s.id) === String(deployForm.studentId)
        ? { ...s, company: deployForm.company, position: deployForm.position, status: "ongoing" } : s));
      setShowDeployModal(false);
      toast.success("Student deployed and linked to company.");
    } catch (e: any) {
      toast.error(`Deployment failed: ${e.message}`);
    }
  };

  const handleVerifyCompany = (id: number, name: string) => {
    setCompanyList(list => list.map(c => c.id === id ? { ...c, verified: true, moaStatus: "active" } : c));
    toast.success(`${name} has been verified and approved.`);
  };

  // ---- RENDER SECTIONS ----

  const renderDashboard = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">OJT Coordinator Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of all OJT activities — April 20, 2026</p>
      </div>

      {/* Stats */}
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

      {/* Charts Row */}
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

      {/* Quick Tables */}
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

  const renderStudents = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Student Management</h1>
          <p className="text-muted-foreground mt-1">Track and manage all OJT students</p>
        </div>
        <Button className="bg-green-600 hover:bg-green-700 text-white gap-2" onClick={() => setShowStudentModal(true)}>
          <Plus className="h-4 w-4" /> Add Student
        </Button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search students..." className="pl-9" value={studentSearch} onChange={e => setStudentSearch(e.target.value)} /></div>
        <select className="border border-border rounded-lg px-3 text-sm bg-card" value={studentStatusFilter} onChange={e => setStudentStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="ongoing">Ongoing</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
        </select>
        <select className="border border-border rounded-lg px-3 text-sm bg-card" value={studentSectionFilter} onChange={e => setStudentSectionFilter(e.target.value)}>
          <option value="all">All Sections</option>
          {SECTIONS.map(s => <option key={s} value={s}>BSIT {s}</option>)}
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
                  const pct = Math.round((s.hoursCompleted / s.requiredHours) * 100);
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

      <Dialog open={showStudentModal} onOpenChange={setShowStudentModal}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Student</DialogTitle><DialogDescription>Register a new BSIT OJT student to the system.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-sm">Full Name</Label><Input placeholder="Juan dela Cruz" className="mt-1.5" /></div>
              <div><Label className="text-sm">Student ID</Label><Input placeholder="2022-IT-0001" className="mt-1.5" /></div>
              <div><Label className="text-sm">Course</Label><Input value="BSIT" readOnly className="mt-1.5" /></div>
              <div><Label className="text-sm">Section</Label>
                <select className="w-full mt-1.5 border border-border rounded-lg p-2 text-sm bg-card">
                  {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="col-span-2"><Label className="text-sm">Email</Label><Input type="email" placeholder="student@psu.edu.ph" className="mt-1.5" /></div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowStudentModal(false)}>Cancel</Button>
              <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={() => { setShowStudentModal(false); toast.success("Student added successfully!"); }}>Add Student</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );

  const renderCompanies = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Company / HTE Management</h1>
          <p className="text-muted-foreground mt-1">Manage partner companies and host training establishments</p>
        </div>
        <Button className="bg-green-600 hover:bg-green-700 text-white gap-2" onClick={() => setShowCompanyModal(true)}>
          <Plus className="h-4 w-4" /> Add Company
        </Button>
      </div>

      <div className="grid gap-4">
        {companyList.map(c => (
          <Card key={c.id} className="border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="h-11 w-11 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold">{c.name}</h3>
                      <StatusBadge status={c.verified ? "active" : "pending"} />
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{c.industry}</span>
                    </div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{c.location}</p>
                    <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                      <span>Contact: <strong className="text-foreground">{c.contactPerson}</strong></span>
                      <span>Interns: <strong className="text-blue-600">{c.activeInterns}/{c.totalCapacity}</strong></span>
                      <span>MOA: <strong className={c.moaStatus === "active" ? "text-green-600" : "text-orange-600"}>{c.moaStatus}</strong></span>
                      {c.moaExpiry !== "—" && <span>Expires: {c.moaExpiry}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {!c.verified && (
                    <Button className="bg-green-600 hover:bg-green-700 text-white gap-1.5 h-8 text-xs" size="sm" onClick={() => handleVerifyCompany(c.id, c.name)}>
                      <CheckCircle className="h-3.5 w-3.5" /> Verify
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1"><Edit className="h-3.5 w-3.5" /> Edit</Button>
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1 text-red-500 border-red-200 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showCompanyModal} onOpenChange={setShowCompanyModal}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Company / HTE</DialogTitle><DialogDescription>Add a new partner company or host training establishment.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label className="text-sm">Company Name</Label><Input placeholder="Company Name" className="mt-1.5" /></div>
              <div><Label className="text-sm">Industry</Label><Input placeholder="e.g., IT, Healthcare" className="mt-1.5" /></div>
              <div><Label className="text-sm">Intern Capacity</Label><Input type="number" placeholder="e.g., 5" className="mt-1.5" /></div>
              <div className="col-span-2"><Label className="text-sm">Address</Label><Input placeholder="Full address" className="mt-1.5" /></div>
              <div><Label className="text-sm">HR Contact</Label><Input placeholder="Contact person" className="mt-1.5" /></div>
              <div><Label className="text-sm">Contact Email</Label><Input type="email" placeholder="hr@company.com" className="mt-1.5" /></div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowCompanyModal(false)}>Cancel</Button>
              <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={() => { setShowCompanyModal(false); toast.success("Company added!"); }}>Add Company</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );

  const renderDeployment = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">OJT Deployment Tracking</h1>
        <p className="text-muted-foreground mt-1">Monitor student-company assignments and deployment status</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Deployed", value: "286", color: "border-l-4 border-l-blue-500 bg-blue-50" },
          { label: "Pending Deployment", value: "26", color: "border-l-4 border-l-orange-500 bg-orange-50" },
          { label: "Completed", value: "18", color: "border-l-4 border-l-green-500 bg-green-50" },
        ].map((s, i) => (
          <Card key={i} className={`border-0 shadow-sm ${s.color}`}>
            <CardContent className="p-4 flex items-center justify-between">
              <span className="text-sm font-medium">{s.label}</span>
              <span className="text-2xl font-bold">{s.value}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Deployment Records</CardTitle>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5"><Filter className="h-3.5 w-3.5" /> Filter</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Student</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Company</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Position</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Period</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Hours</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {students.filter(s => s.status !== "pending").map((s, i) => {
                  const pct = Math.round((s.hoursCompleted / s.requiredHours) * 100);
                  return (
                    <tr key={s.id} className={`border-b border-border last:border-0 ${i % 2 === 0 ? "bg-muted/10" : ""}`}>
                      <td className="py-3 px-4 font-medium">{s.name}</td>
                      <td className="py-3 px-4 text-muted-foreground text-xs">{s.company}</td>
                      <td className="py-3 px-4 text-muted-foreground text-xs">{s.position}</td>
                      <td className="py-3 px-4 text-muted-foreground text-xs">Feb – May 2026</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 min-w-[80px]">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden w-12">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs">{pct}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4"><StatusBadge status={s.status} /></td>
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

  const renderAttendance = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Attendance Monitoring</h1>
          <p className="text-muted-foreground mt-1">View and monitor student DTR logs</p>
        </div>
        <Button variant="outline" className="gap-2 h-9 text-sm"><Download className="h-4 w-4" /> Export DTR</Button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search student..." className="pl-9" /></div>
        <Input type="date" className="w-44" defaultValue="2026-04-20" />
        <select className="border border-border rounded-lg px-3 text-sm bg-card"><option>All Companies</option></select>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Student</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Time In</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Time Out</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Hours</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {dtrLogs.length === 0 ? (
                  <tr><td colSpan={6} className="py-12 text-center text-muted-foreground text-sm">No DTR records yet. Students will appear here once they clock in.</td></tr>
                ) : dtrLogs.map((log, i) => (
                  <tr key={i} className={`border-b border-border last:border-0 ${i % 2 === 0 ? "bg-muted/10" : ""}`}>
                    <td className="py-3 px-4 font-medium">{log.student}</td>
                    <td className="py-3 px-4 text-muted-foreground">{log.date}</td>
                    <td className="py-3 px-4">{log.timeIn}</td>
                    <td className="py-3 px-4">{log.timeOut}</td>
                    <td className="py-3 px-4">{log.hours > 0 ? `${log.hours}h` : "—"}</td>
                    <td className="py-3 px-4"><StatusBadge status={log.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderJournals = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Journal Monitoring</h1>
        <p className="text-muted-foreground mt-1">Review student journal and accomplishment submissions</p>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search student..." className="pl-9" /></div>
        <select className="border border-border rounded-lg px-3 text-sm bg-card"><option>All Status</option><option>Submitted</option><option>Not Submitted</option></select>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Weekly Journal Submissions — Week 11</CardTitle>
          <CardDescription>April 14–18, 2026</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {journalLogs.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-8">No accomplishment entries yet. Student submissions will appear here once approved.</p>
          )}
          {journalLogs.map((j, i) => (
            <div key={i} className={`flex items-center gap-4 p-3 rounded-lg border ${j.status === "not_submitted" ? "border-red-100 bg-red-50" : "border-border bg-muted/20"}`}>
              <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${j.status === "submitted" ? "bg-blue-100 text-blue-600" : "bg-red-100 text-red-500"}`}>
                <BookOpen className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{j.student}</p>
                <p className="text-xs text-muted-foreground truncate">{j.week} {j.title !== "—" ? `— ${j.title}` : ""}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <StatusBadge status={j.status} />
                <p className="text-xs text-muted-foreground mt-0.5">{j.submitted !== "—" ? `Submitted ${j.submitted}` : "No submission"}</p>
              </div>
              {j.status === "submitted" && (
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 flex-shrink-0"><Eye className="h-3.5 w-3.5" /></Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );

  const renderAnnouncements = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Announcement Management</h1>
          <p className="text-muted-foreground mt-1">Create and manage OJT announcements and reminders</p>
        </div>
        <Button className="bg-green-600 hover:bg-green-700 text-white gap-2" onClick={() => setShowAnnouncementModal(true)}>
          <Plus className="h-4 w-4" /> New Announcement
        </Button>
      </div>

      <div className="grid gap-4">
        {announcements.map(a => (
          <Card key={a.id} className="border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={`p-2.5 rounded-lg flex-shrink-0 ${
                    a.category === "seminar" ? "bg-blue-100 text-blue-600" :
                    a.category === "deadline" ? "bg-red-100 text-red-600" :
                    "bg-gray-100 text-gray-600"
                  }`}><Megaphone className="h-5 w-5" /></div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{a.title}</h3>
                      {a.priority === "high" && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">High Priority</span>}
                    </div>
                    <p className="text-sm text-muted-foreground">{a.content}</p>
                    <p className="text-xs text-muted-foreground mt-1.5">Posted: {a.date}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1"><Edit className="h-3.5 w-3.5" /> Edit</Button>
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1 text-red-500 border-red-200 hover:bg-red-50" onClick={async () => {
                    setAnnouncements(prev => prev.filter(x => x.id !== a.id));
                    try { await api.deleteAnnouncement(String(a.id)); toast.success("Announcement deleted."); }
                    catch (e: any) { toast.error(`Delete failed: ${e.message}`); }
                  }}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showAnnouncementModal} onOpenChange={setShowAnnouncementModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Create Announcement</DialogTitle><DialogDescription>Post a new announcement visible to all students and companies.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title</Label><Input placeholder="Announcement title..." className="mt-1.5" value={annForm.title} onChange={e => setAnnForm({...annForm, title: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Category</Label>
                <select className="w-full mt-1.5 border border-border rounded-lg p-2 text-sm bg-card" value={annForm.category} onChange={e => setAnnForm({...annForm, category: e.target.value})}>
                  <option value="update">Update</option><option value="seminar">Seminar</option><option value="deadline">Deadline</option><option value="evaluation">Evaluation</option>
                </select>
              </div>
              <div><Label>Priority</Label>
                <select className="w-full mt-1.5 border border-border rounded-lg p-2 text-sm bg-card" value={annForm.priority} onChange={e => setAnnForm({...annForm, priority: e.target.value})}>
                  <option value="normal">Normal</option><option value="high">High</option>
                </select>
              </div>
            </div>
            <div><Label>Message</Label>
              <textarea rows={4} placeholder="Write your announcement..." className="w-full mt-1.5 border border-border rounded-lg p-3 text-sm bg-card resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" value={annForm.content} onChange={e => setAnnForm({...annForm, content: e.target.value})} />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowAnnouncementModal(false)}>Cancel</Button>
              <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={async () => {
                if (!annForm.title || !annForm.content) { toast.error("Title and message are required"); return; }
                try {
                  const result = await api.createAnnouncement(annForm);
                  const saved = result.announcement;
                  setAnnouncements(prev => [{ id: saved.id, title: saved.title, content: saved.content, date: saved.date, category: saved.category, priority: saved.priority }, ...prev]);
                  setAnnForm({ title: "", content: "", category: "update", priority: "normal" });
                  setShowAnnouncementModal(false);
                  toast.success("Announcement published!");
                } catch (e: any) { toast.error(`Failed to publish: ${e.message}`); }
              }}>Publish</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );

  const renderDocuments = () => {
    const viewSub = studentSubmissions.find(s => s.studentId === viewSubmissionId) || null;
    const totalDocs = REQUIRED_DOC_NAMES.length;
    return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Document Management</h1>
          <p className="text-muted-foreground mt-1">Upload templates and review student-submitted OJT documents</p>
        </div>
        <Button className="bg-green-600 hover:bg-green-700 text-white gap-2" onClick={() => setShowTemplateUpload(true)}>
          <Upload className="h-4 w-4" /> Upload Template
        </Button>
      </div>

      {/* Templates Section */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Document Templates</CardTitle>
          <CardDescription>Templates students can view and download as reference for their submissions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-3">
            {templates.map((t, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/10">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${t.file ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-400"}`}>
                  <FileText className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.file ? `${t.file} • ${t.size} • ${t.uploaded}` : "No template uploaded"}</p>
                </div>
                {t.file ? (
                  <div className="flex gap-1.5">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => toast.info(`Previewing ${t.name}`)}><Eye className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => toast.success(`Downloading ${t.file}`)}><Download className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => { setTemplateForm({ name: t.name, file: "" }); setShowTemplateUpload(true); }}>Replace</Button>
                  </div>
                ) : (
                  <Button size="sm" className="h-7 text-xs gap-1 bg-primary hover:bg-primary/90 text-white" onClick={() => { setTemplateForm({ name: t.name, file: "" }); setShowTemplateUpload(true); }}>
                    <Upload className="h-3 w-3" /> Upload
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Student Submissions */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Student Submissions</CardTitle>
          <CardDescription>Review documents submitted by students and deploy them once complete</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Student</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Section</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Documents</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {studentSubmissions.map((s, i) => {
                  const approved = s.docs.filter(d => d.status === "approved").length;
                  const pct = Math.round((approved / totalDocs) * 100);
                  const complete = approved === totalDocs;
                  return (
                    <tr key={s.studentId} className={`border-b border-border last:border-0 ${i % 2 === 0 ? "bg-muted/10" : ""}`}>
                      <td className="py-3 px-4">
                        <p className="font-medium">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.studentNo}</p>
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">BSIT {s.section}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 min-w-[140px]">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${complete ? "bg-green-500" : "bg-blue-500"}`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs whitespace-nowrap">{approved}/{totalDocs}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {s.deployed ? (
                          <StatusBadge status="ongoing" />
                        ) : complete ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-green-100 text-green-700 border-green-200">Ready to Deploy</span>
                        ) : (
                          <StatusBadge status="pending" />
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-1.5">
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={() => setViewSubmissionId(s.studentId)}>
                            <Eye className="h-3.5 w-3.5" /> Review
                          </Button>
                          {!s.deployed && (
                            <Button size="sm" disabled={!complete} className="h-7 px-2 text-xs gap-1 bg-primary hover:bg-primary/90 text-white disabled:opacity-50" onClick={() => openDeploy(s.studentId)}>
                              <Briefcase className="h-3.5 w-3.5" /> Deploy
                            </Button>
                          )}
                          {s.deployed && (
                            <span className="text-xs text-muted-foreground self-center">→ {s.assignedCompany}</span>
                          )}
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

      {/* Template Upload Modal */}
      <Dialog open={showTemplateUpload} onOpenChange={setShowTemplateUpload}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Upload Document Template</DialogTitle><DialogDescription>Upload a template file that students can download as reference.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Document</Label>
              <select className="w-full mt-1.5 border border-border rounded-lg p-2 text-sm bg-card" value={templateForm.name} onChange={e => setTemplateForm({ ...templateForm, name: e.target.value })}>
                {REQUIRED_DOC_NAMES.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <Label>File (PDF, DOCX)</Label>
              <Input type="file" className="mt-1.5" onChange={e => setTemplateForm({ ...templateForm, file: e.target.files?.[0]?.name || "template.pdf" })} />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowTemplateUpload(false)}>Cancel</Button>
              <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={handleSaveTemplate}>Save Template</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Review Submission Modal */}
      <Dialog open={!!viewSub} onOpenChange={(o) => !o && setViewSubmissionId(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Documents — {viewSub?.name}</DialogTitle>
            <DialogDescription>{viewSub?.studentNo} • BSIT {viewSub?.section} — Review and approve submitted OJT documents.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {viewSub?.docs.map((d, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  d.status === "approved" ? "bg-green-100 text-green-600" :
                  d.status === "pending" ? "bg-orange-100 text-orange-600" :
                  "bg-red-100 text-red-500"
                }`}><FileCheck className="h-4 w-4" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{d.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{d.file ? `${d.file} • Uploaded ${d.uploaded}` : "Not yet submitted"}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${
                  d.status === "approved" ? "bg-green-100 text-green-700 border-green-200" :
                  d.status === "pending" ? "bg-orange-100 text-orange-700 border-orange-200" :
                  "bg-red-100 text-red-700 border-red-200"
                }`}>{d.status === "missing" ? "Missing" : d.status.charAt(0).toUpperCase() + d.status.slice(1)}</span>
                {d.file && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => toast.info(`Previewing ${d.name}`)}><Eye className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => toast.success(`Downloading ${d.file}`)}><Download className="h-3.5 w-3.5" /></Button>
                  </div>
                )}
                {d.status === "pending" && viewSub && (
                  <div className="flex gap-1">
                    <Button size="sm" className="h-7 px-2 text-xs bg-green-600 hover:bg-green-700 text-white" onClick={() => handleApproveDoc(viewSub.studentId, d.name)}><CheckCircle className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleRejectDoc(viewSub.studentId, d.name)}><XCircle className="h-3.5 w-3.5" /></Button>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setViewSubmissionId(null)}>Close</Button>
            {viewSub && !viewSub.deployed && (
              <Button disabled={!allDocsApproved(viewSub.studentId)} className="flex-1 bg-primary hover:bg-primary/90 text-white disabled:opacity-50 gap-2" onClick={() => { setViewSubmissionId(null); openDeploy(viewSub.studentId); }}>
                <Briefcase className="h-4 w-4" /> Deploy Student
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Deploy Modal */}
      <Dialog open={showDeployModal} onOpenChange={setShowDeployModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Deploy Student to Company</DialogTitle><DialogDescription>Assign the student to a verified partner company to begin their OJT.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" /> All required documents are approved.
            </div>
            <div>
              <Label>Assign to Company</Label>
              <select className="w-full mt-1.5 border border-border rounded-lg p-2 text-sm bg-card" value={deployForm.company} onChange={e => setDeployForm({ ...deployForm, company: e.target.value })}>
                <option value="">Select a partner company...</option>
                {companyList.filter(c => c.moaStatus === "active").map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Position / Role</Label>
              <Input className="mt-1.5" placeholder="e.g. Web Dev Intern" value={deployForm.position} onChange={e => setDeployForm({ ...deployForm, position: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start Date</Label><Input type="date" className="mt-1.5" value={deployForm.startDate} onChange={e => setDeployForm({ ...deployForm, startDate: e.target.value })} /></div>
              <div><Label>End Date</Label><Input type="date" className="mt-1.5" value={deployForm.endDate} onChange={e => setDeployForm({ ...deployForm, endDate: e.target.value })} /></div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowDeployModal(false)}>Cancel</Button>
              <Button className="flex-1 bg-primary hover:bg-primary/90 text-white" onClick={handleConfirmDeploy}>Confirm Deployment</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    );
  };



  const renderAnalytics = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
        <p className="text-muted-foreground mt-1">Comprehensive insights on OJT performance and outcomes</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {overviewStats.map((s, i) => (
          <Card key={i} className="border-0 shadow-sm">
            <CardContent className="p-5">
              <div className={`inline-flex p-2.5 rounded-lg mb-3 ${s.color}`}>{s.icon}</div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Weekly Average Hours per Student</CardTitle>
            <CardDescription>Target: 40 hours/week</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={230}>
              <AreaChart data={hoursProgressData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="hoursGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis domain={[30, 42]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="avg" stroke="#2563EB" strokeWidth={2} fill="url(#hoursGrad)" name="Avg Hours" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Monthly OJT Overview</CardTitle>
            <CardDescription>Placements, Applications & Completions</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={230}>
              <LineChart data={monthlyPlacementData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="applications" stroke="#93C5FD" strokeWidth={2} name="Applications" dot={false} />
                <Line type="monotone" dataKey="placements" stroke="#2563EB" strokeWidth={2} name="Placements" dot={false} />
                <Line type="monotone" dataKey="completions" stroke="#16A34A" strokeWidth={2} name="Completions" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Section Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sectionDistribution.map((c, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground truncate">{c.name}</span>
                    <span className="font-semibold ml-2">{c.value}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(c.value / 82) * 100}%`, backgroundColor: c.color }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Industry Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={[
                  { name: "IT", value: 142 }, { name: "Marketing", value: 58 },
                  { name: "Engineering", value: 54 }, { name: "Agriculture", value: 36 }, { name: "Healthcare", value: 22 },
                ]} cx="45%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                  {COLORS.map((color, i) => <Cell key={`industry-cell-${i}`} fill={color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 mt-2">
              {["IT", "Marketing", "Engineering", "Agriculture", "Healthcare"].map((ind, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                  <span className="text-xs text-muted-foreground">{ind}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderMap = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Company Location Map</h1>
        <p className="text-muted-foreground mt-1">Geographic distribution of partner companies in Pampanga</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Map Visual */}
        <div className="lg:col-span-2">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Pampanga OJT Company Map</CardTitle>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">{companyLocations.length} companies</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative bg-gradient-to-br from-green-50 to-blue-50 dark:from-slate-800 dark:to-slate-700 rounded-xl overflow-hidden" style={{ height: 380 }}>
                {/* Map grid */}
                <div className="absolute inset-0 opacity-20">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="absolute border-l border-blue-300/50" style={{ left: `${(i + 1) * 12.5}%`, top: 0, bottom: 0 }} />
                  ))}
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="absolute border-t border-blue-300/50" style={{ top: `${(i + 1) * 16.67}%`, left: 0, right: 0 }} />
                  ))}
                </div>

                {/* "Rivers / Roads" suggestion */}
                <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <path d="M10 50 Q30 35 50 40 Q70 45 90 30" stroke="#3B82F6" strokeWidth="1.5" fill="none" />
                  <path d="M20 80 Q40 70 60 72 Q80 74 95 65" stroke="#3B82F6" strokeWidth="1" fill="none" />
                  <path d="M50 0 Q48 30 52 55 Q54 70 50 100" stroke="#6B7280" strokeWidth="0.8" fill="none" strokeDasharray="2,2" />
                </svg>

                {/* Legend labels */}
                <div className="absolute top-3 left-3 text-xs text-muted-foreground font-medium bg-white/70 dark:bg-slate-800/70 px-2 py-1 rounded-lg">Pampanga Province</div>
                <div className="absolute bottom-3 right-3 text-xs text-muted-foreground bg-white/70 dark:bg-slate-800/70 px-2 py-1 rounded-lg">📍 Clark FTZ &nbsp; 📍 San Fernando &nbsp; 📍 Porac</div>

                {/* Company Pins */}
                {companyLocations.map((loc, i) => (
                  <button
                    key={i}
                    className={`absolute transform -translate-x-1/2 -translate-y-full group cursor-pointer`}
                    style={{ left: `${loc.x}%`, top: `${loc.y}%` }}
                    onClick={() => setSelectedMapCompany(loc === selectedMapCompany ? null : loc)}
                  >
                    <div className={`relative transition-transform group-hover:scale-110 ${selectedMapCompany?.name === loc.name ? "scale-125" : ""}`}>
                      <div className={`w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-bold ${
                        loc.industry === "IT" ? "bg-blue-600" :
                        loc.industry === "Marketing" ? "bg-purple-600" :
                        loc.industry === "Agriculture" ? "bg-green-600" :
                        loc.industry === "Healthcare" ? "bg-red-600" :
                        loc.industry === "Engineering" ? "bg-orange-600" :
                        "bg-gray-600"
                      }`}>
                        {loc.interns}
                      </div>
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-white" />
                    </div>
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs rounded-lg px-2.5 py-1.5 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl z-10">
                      {loc.name}<br />
                      <span className="text-slate-300">{loc.interns} intern{loc.interns !== 1 ? "s" : ""}</span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Map Legend */}
              <div className="flex flex-wrap gap-2 mt-3">
                {[["IT", "bg-blue-600"], ["Marketing", "bg-purple-600"], ["Agriculture", "bg-green-600"], ["Healthcare", "bg-red-600"], ["Engineering", "bg-orange-600"]].map(([ind, cls], i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <div className={`h-3 w-3 rounded-full ${cls}`} />
                    <span className="text-xs text-muted-foreground">{ind}</span>
                  </div>
                ))}
                <div className="flex items-center gap-1.5 ml-2">
                  <div className="h-5 w-5 rounded-full bg-blue-600 border-2 border-white shadow flex items-center justify-center text-[9px] text-white font-bold">3</div>
                  <span className="text-xs text-muted-foreground">= # of interns</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Company List */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Company Directory</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[440px] overflow-y-auto">
            {companyLocations.map((loc, i) => (
              <button
                key={i}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${selectedMapCompany?.name === loc.name ? "border-primary bg-primary/5" : "border-border hover:bg-muted/30"}`}
                onClick={() => setSelectedMapCompany(loc === selectedMapCompany ? null : loc)}
              >
                <div className="flex items-start gap-2.5">
                  <div className={`h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 text-white text-xs font-bold ${
                    loc.industry === "IT" ? "bg-blue-600" : loc.industry === "Marketing" ? "bg-purple-600" : loc.industry === "Agriculture" ? "bg-green-600" : loc.industry === "Healthcare" ? "bg-red-600" : "bg-orange-600"
                  }`}>{loc.interns}</div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{loc.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{loc.industry}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="h-2.5 w-2.5" />{loc.address}</p>
                  </div>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Selected Company Details */}
      {selectedMapCompany && (
        <Card className="border-0 shadow-sm border-l-4 border-l-primary">
          <CardContent className="p-5 flex items-center gap-6">
            <div>
              <h3 className="font-bold text-lg">{selectedMapCompany.name}</h3>
              <p className="text-muted-foreground text-sm">{selectedMapCompany.industry}</p>
            </div>
            <div className="flex gap-6 text-sm">
              <div><p className="text-xs text-muted-foreground">Address</p><p className="font-medium">{selectedMapCompany.address}</p></div>
              <div><p className="text-xs text-muted-foreground">Active Interns</p><p className="font-bold text-primary text-lg">{selectedMapCompany.interns}</p></div>
              <div><p className="text-xs text-muted-foreground">Coordinates</p><p className="font-medium font-mono text-xs">{selectedMapCompany.lat.toFixed(3)}°N, {selectedMapCompany.lng.toFixed(3)}°E</p></div>
            </div>
            <Button variant="outline" size="sm" className="ml-auto gap-1.5 h-8 text-xs" onClick={() => setActiveSection("companies")}>
              <Eye className="h-3.5 w-3.5" /> View Company
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const sectionMap: Record<string, () => JSX.Element> = {
    dashboard: renderDashboard,
    students: renderStudents,
    companies: renderCompanies,
    deployment: renderDeployment,
    attendance: renderAttendance,
    journals: renderJournals,
    announcements: renderAnnouncements,
    documents: renderDocuments,
    analytics: renderAnalytics,
    map: renderMap,
  };

  return (
    <DashboardLayout
      menuItems={menuItems}
      userRole="OJT Coordinator"
      userName="Prof. Clara Reyes"
      activeSection={activeSection}
      onSectionChange={setActiveSection}
    >
      {(sectionMap[activeSection] || renderDashboard)()}
    </DashboardLayout>
  );
}
