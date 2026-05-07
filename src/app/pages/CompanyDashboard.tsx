import { useState, useEffect } from "react";
import { DashboardLayout } from "../components/DashboardLayout";
import { useAuth } from "../contexts/AuthContext";
import * as api from "../lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { toast } from "sonner";
import {
  LayoutDashboard, Building2, Users, Star,
  Eye, CheckCircle, XCircle, MapPin, TrendingUp,
  Download, Edit, ClipboardList, FileCheck
} from "lucide-react";

const menuItems = [
  { icon: <LayoutDashboard className="h-4 w-4" />, label: "Dashboard", value: "dashboard" },
  { icon: <Building2 className="h-4 w-4" />, label: "Company Profile", value: "profile" },
  { icon: <Users className="h-4 w-4" />, label: "My Interns", value: "interns" },
  { icon: <FileCheck className="h-4 w-4" />, label: "Accomplishments", value: "accomplishments" },
  { icon: <Star className="h-4 w-4" />, label: "Evaluations", value: "evaluations" },
];

const emptyCompanyInfo = {
  name: "",
  industry: "",
  address: "",
  email: "",
  phone: "",
  website: "",
  hrContact: "",
  hrEmail: "",
  description: "",
  moaStatus: "pending",
  accreditedUntil: "",
};

type Intern = {
  id: string | number;
  name: string;
  course: string;
  position: string;
  supervisor: string;
  startDate: string;
  endDate: string;
  hoursCompleted: number;
  requiredHours: number;
  performance: number;
  status: string;
};

const evaluationCriteria = [
  { category: "Technical Skills", criteria: ["Technical Knowledge", "Problem Solving", "Use of Tools & Technology", "Quality of Work"] },
  { category: "Work Ethics", criteria: ["Punctuality & Attendance", "Responsibility", "Initiative", "Teamwork"] },
  { category: "Communication", criteria: ["Written Communication", "Verbal Communication", "Interpersonal Skills", "Professional Conduct"] },
  { category: "Performance", criteria: ["Goal Achievement", "Adaptability", "Work Quality", "Overall Performance"] },
];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ongoing: "bg-blue-100 text-blue-700 border-blue-200",
    completed: "bg-purple-100 text-purple-700 border-purple-200",
    active: "bg-green-100 text-green-700 border-green-200",
    pending: "bg-orange-100 text-orange-700 border-orange-200",
    approved: "bg-green-100 text-green-700 border-green-200",
    rejected: "bg-red-100 text-red-700 border-red-200",
  };
  const cls = map[status] || "bg-gray-100 text-gray-600 border-gray-200";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export function CompanyDashboard() {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState("dashboard");
  const [showEvalModal, setShowEvalModal] = useState<string | number | null>(null);
  const [evalScores, setEvalScores] = useState<Record<string, number>>({});

  const companyInfo = {
    name: (user as any)?.companyName || user?.name || emptyCompanyInfo.name,
    industry: (user as any)?.industry || emptyCompanyInfo.industry,
    address: (user as any)?.companyAddress || emptyCompanyInfo.address,
    email: user?.email || emptyCompanyInfo.email,
    phone: (user as any)?.phone || emptyCompanyInfo.phone,
    website: (user as any)?.website || emptyCompanyInfo.website,
    hrContact: (user as any)?.hrContact || user?.name || emptyCompanyInfo.hrContact,
    hrEmail: (user as any)?.hrEmail || user?.email || emptyCompanyInfo.hrEmail,
    description: (user as any)?.description || emptyCompanyInfo.description,
    moaStatus: (user as any)?.moaStatus || emptyCompanyInfo.moaStatus,
    accreditedUntil: (user as any)?.accreditedUntil || emptyCompanyInfo.accreditedUntil,
  };

  const [interns, setInterns] = useState<Intern[]>([]);

  type InternAccomplishment = { id: string | number; internId: string | number; internName: string; date: string; hours: number; details: string; picture: string | null; status: "pending" | "approved" | "rejected" };
  const [accomplishments, setAccomplishments] = useState<InternAccomplishment[]>([]);
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "approved" | "rejected">("all");

  useEffect(() => {
    if (!user) return;
    api.getInterns().then((data: any[]) => {
      setInterns((data || []).map((i: any) => ({
        id: i.id, name: i.name, course: "BSIT",
        position: i.deployment?.position || "—",
        supervisor: i.deployment?.supervisor || "—",
        startDate: i.deployment?.startDate || "—",
        endDate: i.deployment?.endDate || "—",
        hoursCompleted: i.completedHours || 0,
        requiredHours: i.deployment?.requiredHours || 486,
        performance: 0,
        status: i.deployment?.status || "ongoing",
      })));
    }).catch((e: any) => console.log("Interns load error:", e));

    api.getAccomplishments().then((data: any[]) => {
      setAccomplishments((data || []).map((a: any) => ({
        id: a.id, internId: a.internId || a.studentId, internName: a.internName || a.studentName || "—",
        date: a.date, hours: a.hours, details: a.details, picture: a.photoUrl || null, status: a.status,
      })));
    }).catch((e: any) => console.log("Accomplishments load error:", e));
  }, [user]);

  const handleApproveAccomplishment = async (id: string | number) => {
    const acc = accomplishments.find(a => a.id === id);
    if (!acc) return;
    setAccomplishments(list => list.map(a => a.id === id ? { ...a, status: "approved" } : a));
    try { await api.reviewAccomplishment(String(acc.internId), String(id), "approved"); toast.success("Accomplishment approved."); }
    catch (e: any) { toast.error(`Save failed: ${e.message}`); }
  };
  const handleRejectAccomplishment = async (id: string | number) => {
    const acc = accomplishments.find(a => a.id === id);
    if (!acc) return;
    setAccomplishments(list => list.map(a => a.id === id ? { ...a, status: "rejected" } : a));
    try { await api.reviewAccomplishment(String(acc.internId), String(id), "rejected"); toast.error("Accomplishment rejected."); }
    catch (e: any) { toast.error(`Save failed: ${e.message}`); }
  };

  const fmtDate = (iso: string) => new Date(iso + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

  const activeInterns = interns.filter(i => i.status === "ongoing").length;
  const completedInterns = interns.filter(i => i.status === "completed").length;

  const handleSubmitEval = async (e: React.FormEvent) => {
    e.preventDefault();
    const intern = interns.find(i => i.id === showEvalModal);
    setShowEvalModal(null);
    setEvalScores({});
    if (!intern) return;
    try {
      await api.submitEvaluation({ studentId: String(intern.id), studentName: intern.name, scores: evalScores });
      toast.success("Evaluation submitted successfully to the OJT Coordinator.");
    } catch (e: any) {
      toast.error(`Failed to submit evaluation: ${e.message}`);
    }
  };

  // ---- EVAL MODAL (shared) ----
  const EvalModal = () => (
    <Dialog open={showEvalModal !== null} onOpenChange={() => setShowEvalModal(null)}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Supervisor Evaluation Form</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-2 mb-2">
          Evaluating: <strong>{interns.find(i => i.id === showEvalModal)?.name}</strong>
        </p>
        <form onSubmit={handleSubmitEval} className="space-y-5">
          {evaluationCriteria.map((cat, ci) => (
            <div key={ci}>
              <h4 className="font-semibold text-sm text-primary mb-3">{cat.category}</h4>
              <div className="space-y-3">
                {cat.criteria.map((crit, ki) => (
                  <div key={ki} className="flex items-center justify-between gap-4 p-3 bg-muted/30 rounded-lg">
                    <span className="text-sm flex-1">{crit}</span>
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5].map(score => (
                        <button
                          key={score}
                          type="button"
                          className={`h-8 w-8 rounded-lg text-sm font-medium transition-colors ${
                            evalScores[`${ci}-${ki}`] === score
                              ? "bg-primary text-white"
                              : "bg-muted hover:bg-primary/20 text-muted-foreground"
                          }`}
                          onClick={() => setEvalScores(prev => ({ ...prev, [`${ci}-${ki}`]: score }))}
                        >
                          {score}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div>
            <Label>Overall Comments</Label>
            <textarea
              rows={3}
              placeholder="Write your overall assessment and recommendations..."
              className="w-full mt-1.5 border border-border rounded-lg p-3 text-sm bg-card resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowEvalModal(null)}>Cancel</Button>
            <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90 text-white">Submit Evaluation</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );

  // ---- RENDER SECTIONS ----

  const renderDashboard = () => (
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
          { label: "Total Interns (All Time)", value: "24", icon: <TrendingUp className="h-5 w-5" />, color: "text-purple-600 bg-purple-100", sub: "since 2022" },
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

  const renderProfile = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Company Profile</h1>
          <p className="text-muted-foreground mt-1">Manage your company information and HTE accreditation</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 text-white gap-2">
          <Edit className="h-4 w-4" /> Save Changes
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="border-0 shadow-sm text-center">
          <CardContent className="p-6">
            <div className="h-20 w-20 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Building2 className="h-10 w-10 text-green-600" />
            </div>
            <h3 className="font-bold text-lg">{companyInfo.name}</h3>
            <p className="text-muted-foreground text-sm">{companyInfo.industry}</p>
            <div className="mt-3 flex flex-col gap-2">
              <span className="inline-flex items-center justify-center gap-1.5 text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-full mx-auto">
                <CheckCircle className="h-3 w-3" /> MOA Active
              </span>
              <p className="text-xs text-muted-foreground">Accredited until: {companyInfo.accreditedUntil}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base">Company Information</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-xs text-muted-foreground">Company Name</Label><Input defaultValue={companyInfo.name} className="mt-1" /></div>
              <div><Label className="text-xs text-muted-foreground">Industry</Label><Input defaultValue={companyInfo.industry} className="mt-1" /></div>
              <div><Label className="text-xs text-muted-foreground">Email</Label><Input defaultValue={companyInfo.email} className="mt-1" /></div>
              <div><Label className="text-xs text-muted-foreground">Phone</Label><Input defaultValue={companyInfo.phone} className="mt-1" /></div>
              <div><Label className="text-xs text-muted-foreground">HR Contact</Label><Input defaultValue={companyInfo.hrContact} className="mt-1" /></div>
              <div><Label className="text-xs text-muted-foreground">HR Email</Label><Input defaultValue={companyInfo.hrEmail} className="mt-1" /></div>
              <div className="col-span-2"><Label className="text-xs text-muted-foreground">Address</Label><Input defaultValue={companyInfo.address} className="mt-1" /></div>
              <div><Label className="text-xs text-muted-foreground">Website</Label><Input defaultValue={companyInfo.website} className="mt-1" /></div>
              <div><Label className="text-xs text-muted-foreground">MOA Status</Label>
                <div className="mt-1 flex items-center gap-2 h-10 px-3 bg-muted/30 rounded-lg">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-700 font-medium">Active</span>
                </div>
              </div>
              <div className="col-span-2"><Label className="text-xs text-muted-foreground">Company Description</Label>
                <textarea rows={3} defaultValue={companyInfo.description} className="w-full mt-1 border border-border rounded-lg p-2 text-sm bg-card resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderInterns = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Interns</h1>
        <p className="text-muted-foreground mt-1">Monitor assigned interns, their progress, and hours</p>
      </div>

      <div className="grid gap-4">
        {interns.map(intern => {
          const pct = Math.round((intern.hoursCompleted / intern.requiredHours) * 100);
          return (
            <Card key={intern.id} className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center flex-shrink-0">
                    {intern.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className="font-semibold">{intern.name}</h3>
                          <StatusBadge status={intern.status} />
                        </div>
                        <p className="text-sm text-muted-foreground">{intern.course} — {intern.position}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> Supervisor: {intern.supervisor}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-2xl font-bold text-green-600">{intern.performance}%</div>
                        <p className="text-xs text-muted-foreground">Performance</p>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-4 pt-3 border-t border-border">
                      <div>
                        <p className="text-xs text-muted-foreground">OJT Period</p>
                        <p className="text-xs font-medium mt-0.5">{intern.startDate} — {intern.endDate}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Hours Completed</p>
                        <p className="text-xs font-medium mt-0.5">{intern.hoursCompleted}/{intern.requiredHours} hrs</p>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );

  const renderEvaluations = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Evaluations</h1>
        <p className="text-muted-foreground mt-1">Supervisor evaluation records for all assigned interns</p>
      </div>

      <div className="grid gap-4">
        {interns.map(intern => (
          <Card key={intern.id} className="border-0 shadow-sm">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-11 w-11 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center flex-shrink-0 text-sm">
                {intern.name.split(" ").map(n => n[0]).join("")}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{intern.name}</h3>
                  <StatusBadge status={intern.status} />
                </div>
                <p className="text-sm text-muted-foreground">{intern.position} — {intern.course}</p>
              </div>
              <div className="text-center">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star
                      key={s}
                      className={`h-4 w-4 ${s <= Math.round(intern.performance / 20) ? "text-yellow-400 fill-yellow-400" : "text-muted"}`}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{intern.performance}/100</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  onClick={() => setShowEvalModal(intern.id)}
                >
                  <ClipboardList className="h-3.5 w-3.5" />
                  {intern.status === "completed" ? "View Eval" : "Evaluate"}
                </Button>
                {intern.status === "completed" && (
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                    <Download className="h-3.5 w-3.5" /> PDF
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <EvalModal />
    </div>
  );

  const renderAccomplishments = () => {
    const filtered = filterStatus === "all" ? accomplishments : accomplishments.filter(a => a.status === filterStatus);
    const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date));
    const pendingCount = accomplishments.filter(a => a.status === "pending").length;
    const approvedCount = accomplishments.filter(a => a.status === "approved").length;
    const rejectedCount = accomplishments.filter(a => a.status === "rejected").length;
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Intern Accomplishments</h1>
          <p className="text-muted-foreground mt-1">Review and approve daily accomplishments posted by your interns</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Card className="border-0 shadow-sm border-l-4 border-l-orange-500"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Pending</p><p className="text-2xl font-bold text-orange-600">{pendingCount}</p></CardContent></Card>
          <Card className="border-0 shadow-sm border-l-4 border-l-green-500"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Approved</p><p className="text-2xl font-bold text-green-600">{approvedCount}</p></CardContent></Card>
          <Card className="border-0 shadow-sm border-l-4 border-l-red-500"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Rejected</p><p className="text-2xl font-bold text-red-600">{rejectedCount}</p></CardContent></Card>
        </div>

        <div className="flex gap-2 flex-wrap">
          {(["all", "pending", "approved", "rejected"] as const).map(s => (
            <Button key={s} size="sm" variant={filterStatus === s ? "default" : "outline"} className={`h-8 text-xs capitalize ${filterStatus === s ? "bg-primary text-white" : ""}`} onClick={() => setFilterStatus(s)}>
              {s}
            </Button>
          ))}
        </div>

        <div className="grid gap-4">
          {sorted.length === 0 && (
            <Card className="border-0 shadow-sm"><CardContent className="p-8 text-center text-sm text-muted-foreground">No accomplishments to show.</CardContent></Card>
          )}
          {sorted.map(a => (
            <Card key={a.id} className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center flex-shrink-0 text-sm">
                    {a.internName.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold">{a.internName}</h3>
                      <span className="text-xs text-muted-foreground">{fmtDate(a.date)}</span>
                      <span className="text-xs text-muted-foreground">• {a.hours} hrs</span>
                      <StatusBadge status={a.status} />
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">{a.details}</p>
                    {a.picture && <img src={a.picture} alt="evidence" className="mt-3 rounded-lg border border-border max-h-56 object-cover" />}
                  </div>
                  {a.status === "pending" && (
                    <div className="flex gap-2 flex-shrink-0">
                      <Button size="sm" className="h-8 text-xs gap-1 bg-green-600 hover:bg-green-700 text-white" onClick={() => handleApproveAccomplishment(a.id)}>
                        <CheckCircle className="h-3.5 w-3.5" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 text-xs gap-1 text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleRejectAccomplishment(a.id)}>
                        <XCircle className="h-3.5 w-3.5" /> Reject
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  const sectionMap: Record<string, () => JSX.Element> = {
    dashboard: renderDashboard,
    profile: renderProfile,
    interns: renderInterns,
    accomplishments: renderAccomplishments,
    evaluations: renderEvaluations,
  };

  return (
    <DashboardLayout
      menuItems={menuItems}
      userRole="Company"
      userName={companyInfo.hrContact}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
    >
      {(sectionMap[activeSection] || renderDashboard)()}
    </DashboardLayout>
  );
}
