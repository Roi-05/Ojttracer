import { useState, useRef, useEffect } from "react";
import { DashboardLayout } from "../components/DashboardLayout";
import { useAuth } from "../contexts/AuthContext";
import * as api from "../lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { toast } from "sonner";
import {
  LayoutDashboard, User, MapPin, Clock, BookOpen,
  FileCheck, Upload, Megaphone, Plus, CheckCircle, XCircle,
  Calendar, Building2,
  Download, Eye, Timer, TrendingUp, Sparkles, FileText, ChevronDown, Camera, CameraOff
} from "lucide-react";

const _today = new Date();
const TODAY_ISO = _today.toISOString().split("T")[0];
const TODAY_LABEL = _today.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
const TODAY_DAY = _today.toLocaleDateString("en-US", { weekday: "long" });

type DTRRecord = {
  date: string;        // ISO yyyy-mm-dd
  day: string;
  timeIn: string | null;
  timeOut: string | null;
  timeInPhoto: string | null;
  timeOutPhoto: string | null;
  hours: number;
  remarks: string;
};

const initialDTR: DTRRecord[] = [];

const menuItems = [
  { icon: <LayoutDashboard className="h-4 w-4" />, label: "Dashboard", value: "dashboard" },
  { icon: <User className="h-4 w-4" />, label: "My Profile", value: "profile" },
  { icon: <MapPin className="h-4 w-4" />, label: "My Deployment", value: "deployment" },
  { icon: <Clock className="h-4 w-4" />, label: "Attendance (DTR)", value: "attendance" },
  { icon: <BookOpen className="h-4 w-4" />, label: "Journal Logs", value: "journal" },
  { icon: <FileCheck className="h-4 w-4" />, label: "Accomplishments", value: "accomplishments" },
  { icon: <Upload className="h-4 w-4" />, label: "Documents", value: "documents" },
  { icon: <Megaphone className="h-4 w-4" />, label: "Announcements", value: "announcements", badge: 2 },
];

const emptyStudentInfo = {
  name: "",
  studentId: "",
  course: "BSIT",
  year: "4th Year",
  section: "",
  email: "",
  phone: "",
  address: "",
  skills: [] as string[],
  emergencyContact: "",
};

const emptyDeploymentInfo = {
  company: "",
  supervisor: "",
  supervisorEmail: "",
  address: "",
  startDate: "",
  endDate: "",
  requiredHours: 486,
  completedHours: 0,
  position: "",
  status: "pending",
};


type DailyAccomplishment = {
  id: number;
  date: string;        // ISO yyyy-mm-dd
  hours: number;
  details: string;
  picture: string | null;
  status: "pending" | "approved" | "rejected";
};

const initialAccomplishments: DailyAccomplishment[] = [];

const REQUIRED_DOC_NAMES = [
  "Parent Guardian Consent Form",
  "Certificate of Enrollment",
  "Certification Form",
  "Internship Endorsement Form",
  "1st Endorsement Form",
  "Internship Agreement Form",
  "Memorandum of Agreement",
];

const adminTemplates = REQUIRED_DOC_NAMES.map((name) => ({
  name,
  file: `${name.replace(/\s+/g, "_")}_Template.pdf`,
  size: "180 KB",
  uploaded: "Jan 10, 2026",
}));

const initialStudentDocs = REQUIRED_DOC_NAMES.map((name) => ({
  name,
  status: "missing" as string,
  file: null as string | null,
  uploadedDate: "—",
}));

const announcements: Array<{ id: number | string; title: string; content: string; date: string; category: string; priority: string; read: boolean }> = [];

type StatusBadge = { label: string; class: string };
const statusBadge: Record<string, StatusBadge> = {
  approved: { label: "Approved", class: "bg-green-100 text-green-700 border-green-200" },
  submitted: { label: "Submitted", class: "bg-blue-100 text-blue-700 border-blue-200" },
  pending: { label: "Pending", class: "bg-orange-100 text-orange-700 border-orange-200" },
  rejected: { label: "Rejected", class: "bg-red-100 text-red-700 border-red-200" },
  open: { label: "Open", class: "bg-green-100 text-green-700 border-green-200" },
  closed: { label: "Closed", class: "bg-red-100 text-red-700 border-red-200" },
  ongoing: { label: "Ongoing", class: "bg-blue-100 text-blue-700 border-blue-200" },
  missing: { label: "Missing", class: "bg-red-100 text-red-700 border-red-200" },
};

function StatusBadge({ status }: { status: string }) {
  const s = statusBadge[status] || { label: status, class: "bg-gray-100 text-gray-700 border-gray-200" };
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${s.class}`}>{s.label}</span>;
}

export function StudentDashboard() {
  const { user } = useAuth();
  const studentProfile = {
    name: user?.name || emptyStudentInfo.name,
    studentId: (user as any)?.studentId || emptyStudentInfo.studentId,
    course: emptyStudentInfo.course,
    year: emptyStudentInfo.year,
    section: (user as any)?.section || emptyStudentInfo.section,
    email: user?.email || emptyStudentInfo.email,
    phone: (user as any)?.phone || emptyStudentInfo.phone,
    address: (user as any)?.address || emptyStudentInfo.address,
    skills: (user as any)?.skills || emptyStudentInfo.skills,
    emergencyContact: (user as any)?.emergencyContact || emptyStudentInfo.emergencyContact,
  };
  const [activeSection, setActiveSection] = useState("dashboard");
  const [dtrRecords, setDtrRecords] = useState<DTRRecord[]>(initialDTR);
  const [deploymentData, setDeploymentData] = useState<typeof emptyDeploymentInfo | null>(null);
  const [announcementData, setAnnouncementData] = useState<typeof announcements>(announcements);
  const [templateData, setTemplateData] = useState<typeof adminTemplates>(adminTemplates);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraMode, setCameraMode] = useState<"in" | "out">("in");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const todayRecord = dtrRecords.find(r => r.date === TODAY_ISO) || null;

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  const openCamera = async (mode: "in" | "out") => {
    if (mode === "in" && todayRecord?.timeIn) {
      toast.error("You already timed in today.");
      return;
    }
    if (mode === "out" && !todayRecord?.timeIn) {
      toast.error("You need to Time In first.");
      return;
    }
    if (mode === "out" && todayRecord?.timeOut) {
      toast.error("You already timed out today.");
      return;
    }
    setCameraMode(mode);
    setCameraError(null);
    setCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      setCameraError("Unable to access camera. Please allow camera permission.");
    }
  };

  const closeCamera = () => {
    stopCamera();
    setCameraOpen(false);
  };

  useEffect(() => () => stopCamera(), []);

  // Load real data on mount
  useEffect(() => {
    if (!user) return;
    // Load DTR records
    api.getDTR().then((records: any[]) => {
      if (records?.length) {
        setDtrRecords(records.map((r: any) => ({
          date: r.date, day: r.day || "", timeIn: r.timeIn || null, timeOut: r.timeOut || null,
          timeInPhoto: r.timeInPhotoUrl || null, timeOutPhoto: r.timeOutPhotoUrl || null,
          hours: r.hours || 0, remarks: r.remarks || "Regular",
        })));
      }
    }).catch((e: any) => console.log("DTR load error:", e));
    // Load accomplishments
    api.getAccomplishments().then((records: any[]) => {
      if (records?.length) {
        setAccomplishmentList(records.map((r: any) => ({
          id: r.id, date: r.date, hours: r.hours, details: r.details,
          picture: r.photoUrl || null, status: r.status,
        })));
      }
    }).catch((e: any) => console.log("Accomplishments load error:", e));
    // Load documents
    api.getDocuments().then((docs: any[]) => {
      if (docs !== null) {
        const merged = REQUIRED_DOC_NAMES.map((name) => {
          const found = (docs || []).find((d: any) => d.name === name);
          return found ? { name, status: found.status, file: found.fileUrl || found.file || null, uploadedDate: found.uploadedDate || "—" }
            : { name, status: "missing", file: null, uploadedDate: "—" };
        });
        setStudentDocs(merged);
      }
    }).catch((e: any) => console.log("Docs load error:", e));
    // Load deployment
    api.getDeployment().then((dep: any) => {
      if (dep) setDeploymentData(dep);
    }).catch((e: any) => console.log("Deployment load error:", e));
    // Load announcements
    api.getAnnouncements().then((anns: any[]) => {
      if (anns?.length) {
        setAnnouncementData(anns.map((a: any) => ({
          id: a.id, title: a.title, content: a.content, date: a.date,
          category: a.category, priority: a.priority, read: false,
        })));
      }
    }).catch((e: any) => console.log("Announcements load error:", e));
    // Load templates
    api.getTemplates().then((tpls: any[]) => {
      if (tpls?.length) {
        const merged = REQUIRED_DOC_NAMES.map((name) => {
          const found = tpls.find((t: any) => t.name === name);
          return found ? { name, file: found.fileUrl || name.replace(/\s+/g, "_") + "_Template.pdf", size: found.size || "—", uploaded: found.uploadedDate || "—" }
            : { name, file: null, size: "—", uploaded: "—" };
        });
        setTemplateData(merged);
      }
    }).catch((e: any) => console.log("Templates load error:", e));
  }, [user]);

  const captureSelfie = (): string | null => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return null;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.85);
  };

  const computeHours = (inStr: string, outStr: string): number => {
    const parse = (s: string) => {
      const m = s.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!m) return 0;
      let h = parseInt(m[1]); const min = parseInt(m[2]);
      const p = m[3].toUpperCase();
      if (p === "PM" && h !== 12) h += 12;
      if (p === "AM" && h === 12) h = 0;
      return h + min / 60;
    };
    return Math.max(0, Math.round((parse(outStr) - parse(inStr)) * 100) / 100);
  };

  const handleCapture = async () => {
    const photo = captureSelfie();
    if (!photo) { toast.error("Could not capture image."); return; }
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // Update local state immediately (optimistic)
    setDtrRecords(records => {
      const existing = records.find(r => r.date === TODAY_ISO);
      if (cameraMode === "in") {
        if (existing) {
          return records.map(r => r.date === TODAY_ISO
            ? { ...r, timeIn: now, timeInPhoto: photo, remarks: r.remarks || "Regular" }
            : r);
        }
        return [{
          date: TODAY_ISO, day: TODAY_DAY.slice(0, 3),
          timeIn: now, timeOut: null, timeInPhoto: photo, timeOutPhoto: null,
          hours: 0, remarks: "Regular",
        }, ...records];
      }
      return records.map(r => {
        if (r.date !== TODAY_ISO || !r.timeIn) return r;
        const hours = computeHours(r.timeIn, now);
        return { ...r, timeOut: now, timeOutPhoto: photo, hours };
      });
    });

    toast.success(`Time ${cameraMode === "in" ? "In" : "Out"} recorded at ${now}`);
    closeCamera();

    // Persist to backend
    try {
      await api.clockDTR({ date: TODAY_ISO, mode: cameraMode, time: now, photo, day: TODAY_DAY.slice(0, 3) });
    } catch (err: any) {
      console.log("DTR save error:", err);
      toast.error("Clock recorded locally but failed to save to server.");
    }
  };
  // Daily accomplishments
  const [accomplishmentList, setAccomplishmentList] = useState<DailyAccomplishment[]>(initialAccomplishments);
  const [showAccomplishmentModal, setShowAccomplishmentModal] = useState(false);
  const [accForm, setAccForm] = useState<{ date: string; hours: string; details: string; picture: string | null }>({
    date: "2026-04-30", hours: "", details: "", picture: null
  });

  // Generators
  const [showMonthlyAccompModal, setShowMonthlyAccompModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState("April 2026");
  const [showFullJournalModal, setShowFullJournalModal] = useState(false);

  // Student document submissions state
  const [studentDocs, setStudentDocs] = useState(initialStudentDocs);
  const [showDocUpload, setShowDocUpload] = useState(false);
  const [docUploadForm, setDocUploadForm] = useState({ name: REQUIRED_DOC_NAMES[0], file: "", fileData: "" as string });

  const openDocUpload = (docName: string) => {
    setDocUploadForm({ name: docName, file: "", fileData: "" });
    setShowDocUpload(true);
  };

  const handleDocFileChange = (file: File | undefined) => {
    if (!file) { setDocUploadForm(f => ({ ...f, file: "", fileData: "" })); return; }
    const reader = new FileReader();
    reader.onload = () => setDocUploadForm(f => ({ ...f, file: file.name, fileData: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const handleSubmitDoc = async () => {
    if (!docUploadForm.file) { toast.error("Please choose a file"); return; }
    const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    setStudentDocs(list => list.map(d => d.name === docUploadForm.name
      ? { ...d, status: "pending", file: docUploadForm.file, uploadedDate: today }
      : d));
    setShowDocUpload(false);
    toast.success(`${docUploadForm.name} submitted for review.`);
    try {
      await api.submitDocument(docUploadForm.name, docUploadForm.fileData || docUploadForm.file, docUploadForm.file);
    } catch (err: any) {
      console.log("Document submit error:", err);
      toast.error("Saved locally but failed to sync to server.");
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  };
  const monthLabel = (iso: string) => {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  };

  const availableMonths = Array.from(new Set(accomplishmentList.map(a => monthLabel(a.date))));
  const monthEntries = accomplishmentList.filter(a => monthLabel(a.date) === selectedMonth);
  const monthTotalHours = monthEntries.reduce((s, e) => s + e.hours, 0);

  const sortedAll = [...accomplishmentList].sort((a, b) => a.date.localeCompare(b.date));
  const totalHoursAll = sortedAll.reduce((s, e) => s + e.hours, 0);

  const handlePictureChange = (file: File | undefined) => {
    if (!file) { setAccForm(f => ({ ...f, picture: null })); return; }
    const reader = new FileReader();
    reader.onload = () => setAccForm(f => ({ ...f, picture: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const handleSubmitAccomplishment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accForm.date || !accForm.hours || !accForm.details) { toast.error("Please complete all fields"); return; }
    const tempId = Date.now();
    setAccomplishmentList(list => [
      { id: tempId, date: accForm.date, hours: parseFloat(accForm.hours), details: accForm.details, picture: accForm.picture, status: "pending" },
      ...list,
    ]);
    setShowAccomplishmentModal(false);
    setAccForm({ date: TODAY_ISO, hours: "", details: "", picture: null });
    toast.success("Accomplishment posted — pending supervisor approval.");
    try {
      const res = await api.createAccomplishment({ date: accForm.date, hours: parseFloat(accForm.hours), details: accForm.details, photo: accForm.picture });
      // Replace temp entry with real one from server
      setAccomplishmentList(list => list.map(a => a.id === tempId
        ? { ...a, id: res.accomplishment?.id || tempId }
        : a));
    } catch (err: any) {
      console.log("Accomplishment save error:", err);
      toast.error("Saved locally but failed to sync to server.");
    }
  };

  const handleDownloadMonthly = () => {
    toast.success(`Monthly Accomplishment for ${selectedMonth} downloaded as PDF.`);
    setShowMonthlyAccompModal(false);
  };

  const handleDownloadFullJournal = () => {
    toast.success("Full OJT Journal compiled and downloaded as PDF.");
    setShowFullJournalModal(false);
  };

  const activeDeployment = deploymentData || emptyDeploymentInfo;
  const completedHours = dtrRecords.reduce((s, r) => s + (r.hours || 0), 0);
  const effectiveDeployment = { ...activeDeployment, completedHours: Math.round(completedHours * 10) / 10 };
  const pct = Math.round((effectiveDeployment.completedHours / effectiveDeployment.requiredHours) * 100);

  const renderDashboard = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Welcome back, {user?.name?.split(" ")[0] || studentProfile.name.split(" ")[0]}! 👋</h1>
        <p className="text-muted-foreground mt-1">Here's your OJT progress overview for today, {TODAY_LABEL}.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Hours Completed", value: `${activeDeployment.completedHours}`, total: `/ ${activeDeployment.requiredHours} hrs`, icon: <Timer className="h-5 w-5" />, color: "text-blue-600 bg-blue-100", pct: pct },
          { label: "Accomplishments", value: `${accomplishmentList.length}`, total: "logged", icon: <BookOpen className="h-5 w-5" />, color: "text-green-600 bg-green-100", pct: null },
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
        {/* OJT Progress */}
        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">OJT Progress</CardTitle>
            <CardDescription>{activeDeployment.company} — {activeDeployment.position}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{activeDeployment.completedHours} hours completed</span>
              <span className="text-sm text-muted-foreground">{activeDeployment.requiredHours - activeDeployment.completedHours} hrs remaining</span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden mb-1">
              <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-xs text-muted-foreground text-right">{pct}% complete</p>
            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border">
              <div className="text-center">
                <p className="text-sm font-semibold">{activeDeployment.startDate}</p>
                <p className="text-xs text-muted-foreground">Start Date</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold">{activeDeployment.endDate}</p>
                <p className="text-xs text-muted-foreground">End Date</p>
              </div>
              <div className="text-center">
                <StatusBadge status={activeDeployment.status} />
                <p className="text-xs text-muted-foreground mt-1">Status</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: "Time In / Out", icon: <Camera className="h-4 w-4" />, action: () => setActiveSection("attendance"), color: "bg-blue-50 text-blue-600 hover:bg-blue-100" },
              { label: "Post Accomplishment", icon: <BookOpen className="h-4 w-4" />, action: () => { setActiveSection("accomplishments"); setShowAccomplishmentModal(true); }, color: "bg-green-50 text-green-600 hover:bg-green-100" },
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

      {/* Recent Announcements */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent Announcements</CardTitle>
          <button className="text-xs text-primary hover:underline" onClick={() => setActiveSection("announcements")}>View All</button>
        </CardHeader>
        <CardContent className="space-y-3">
          {announcements.slice(0, 3).map(a => (
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

  const renderProfile = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Profile</h1>
          <p className="text-muted-foreground mt-1">Manage your personal information and skills</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 text-white gap-2">
          <User className="h-4 w-4" /> Save Changes
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6 text-center">
            <div className="h-24 w-24 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-3xl font-bold mx-auto mb-4">MS</div>
            <h3 className="font-semibold text-lg">{studentProfile.name}</h3>
            <p className="text-muted-foreground text-sm">{studentProfile.course}</p>
            <p className="text-muted-foreground text-sm">{studentProfile.year} • {studentProfile.section}</p>
            <p className="text-xs text-muted-foreground mt-1">ID: {studentProfile.studentId}</p>
            <button className="mt-4 text-sm text-primary hover:underline">Change Photo</button>
          </CardContent>
        </Card>

        {/* Personal Info */}
        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-sm text-muted-foreground">Full Name</Label><Input defaultValue={studentProfile.name} className="mt-1.5" /></div>
              <div><Label className="text-sm text-muted-foreground">Student ID</Label><Input defaultValue={studentProfile.studentId} className="mt-1.5" readOnly /></div>
              <div><Label className="text-sm text-muted-foreground">Email</Label><Input defaultValue={studentProfile.email} className="mt-1.5" /></div>
              <div><Label className="text-sm text-muted-foreground">Phone</Label><Input defaultValue={studentProfile.phone} className="mt-1.5" /></div>
              <div><Label className="text-sm text-muted-foreground">Course</Label><Input defaultValue={studentProfile.course} className="mt-1.5" readOnly /></div>
              <div><Label className="text-sm text-muted-foreground">Year & Section</Label><Input defaultValue={`${studentProfile.year} — ${studentProfile.section}`} className="mt-1.5" readOnly /></div>
              <div className="col-span-2"><Label className="text-sm text-muted-foreground">Home Address</Label><Input defaultValue={studentProfile.address} className="mt-1.5" /></div>
              <div className="col-span-2"><Label className="text-sm text-muted-foreground">Emergency Contact</Label><Input defaultValue={studentProfile.emergencyContact} className="mt-1.5" /></div>
            </div>
          </CardContent>
        </Card>

        {/* Skills */}
        <Card className="lg:col-span-3 border-0 shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Skills & Competencies</CardTitle>
            <Button variant="outline" size="sm" className="gap-2 h-8 text-xs"><Plus className="h-3.5 w-3.5" /> Add Skill</Button>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {studentProfile.skills.map((skill, i) => (
                <span key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                  {skill}
                  <button className="text-blue-400 hover:text-blue-600">×</button>
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderDeployment = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Deployment</h1>
        <p className="text-muted-foreground mt-1">Your current OJT deployment details and progress</p>
      </div>

      <div className="grid gap-6">
        {/* Company Info */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Deployment Details</CardTitle>
              <StatusBadge status={activeDeployment.status} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-5 pb-5 border-b border-border">
              <div className="h-14 w-14 bg-blue-100 rounded-xl flex items-center justify-center">
                <Building2 className="h-7 w-7 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-lg">{activeDeployment.company}</h3>
                <p className="text-muted-foreground text-sm flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{activeDeployment.address}</p>
                <p className="text-sm text-blue-600 font-medium mt-1">{activeDeployment.position}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-5">
              {[
                { label: "Supervisor", value: activeDeployment.supervisor },
                { label: "Supervisor Email", value: activeDeployment.supervisorEmail },
                { label: "Start Date", value: activeDeployment.startDate },
                { label: "End Date", value: activeDeployment.endDate },
              ].map((item, i) => (
                <div key={i}>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-sm font-medium mt-0.5">{item.value}</p>
                </div>
              ))}
            </div>
            {/* Progress */}
            <div className="p-4 bg-muted/30 rounded-xl">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Hours Completed</span>
                <span className="text-sm font-bold text-primary">{pct}%</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden mb-2">
                <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full" style={{ width: `${pct}%` }} />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{activeDeployment.completedHours} hrs done</span>
                <span>{activeDeployment.requiredHours - activeDeployment.completedHours} hrs remaining</span>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );

  const renderAttendance = () => {
    const hasTimeIn = !!todayRecord?.timeIn;
    const hasTimeOut = !!todayRecord?.timeOut;
    const sortedRecords = [...dtrRecords].sort((a, b) => b.date.localeCompare(a.date));
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Attendance (DTR)</h1>
          <p className="text-muted-foreground mt-1">Daily Time Record — clock in and out with a selfie</p>
        </div>

        {/* Today's Attendance */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Today's Attendance</CardTitle>
            <CardDescription>{TODAY_LABEL} — {TODAY_DAY}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {/* Time In tile */}
              <div className="p-4 rounded-lg border border-border bg-muted/20">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold">Time In</span>
                  {hasTimeIn ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Recorded</span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">Pending</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-16 w-16 rounded-lg overflow-hidden bg-muted flex items-center justify-center border border-border">
                    {todayRecord?.timeInPhoto
                      ? <img src={todayRecord.timeInPhoto} alt="Time In" className="h-full w-full object-cover" />
                      : <CameraOff className="h-6 w-6 text-muted-foreground" />}
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{todayRecord?.timeIn ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">Selfie + timestamp</p>
                  </div>
                </div>
                <Button
                  className="w-full h-10 bg-green-600 hover:bg-green-700 text-white gap-2"
                  disabled={hasTimeIn}
                  onClick={() => openCamera("in")}
                >
                  <Camera className="h-4 w-4" /> {hasTimeIn ? "Already Timed In" : "Time In"}
                </Button>
              </div>

              {/* Time Out tile */}
              <div className="p-4 rounded-lg border border-border bg-muted/20">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold">Time Out</span>
                  {hasTimeOut ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Recorded</span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">Pending</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-16 w-16 rounded-lg overflow-hidden bg-muted flex items-center justify-center border border-border">
                    {todayRecord?.timeOutPhoto
                      ? <img src={todayRecord.timeOutPhoto} alt="Time Out" className="h-full w-full object-cover" />
                      : <CameraOff className="h-6 w-6 text-muted-foreground" />}
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{todayRecord?.timeOut ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">Selfie + timestamp</p>
                  </div>
                </div>
                <Button
                  className="w-full h-10 bg-red-500 hover:bg-red-600 text-white gap-2"
                  disabled={!hasTimeIn || hasTimeOut}
                  onClick={() => openCamera("out")}
                >
                  <Camera className="h-4 w-4" /> {hasTimeOut ? "Already Timed Out" : "Time Out"}
                </Button>
              </div>
            </div>
            {!hasTimeIn && (
              <p className="text-xs text-muted-foreground mt-3">You must Time In before you can Time Out.</p>
            )}
          </CardContent>
        </Card>

        {/* DTR Table */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Daily Time Record</CardTitle>
            <Button variant="outline" size="sm" className="gap-2 h-8 text-xs"><Download className="h-3.5 w-3.5" /> Export DTR</Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2.5 px-3 text-muted-foreground font-medium">Date</th>
                    <th className="text-left py-2.5 px-3 text-muted-foreground font-medium">Day</th>
                    <th className="text-left py-2.5 px-3 text-muted-foreground font-medium">Time In</th>
                    <th className="text-left py-2.5 px-3 text-muted-foreground font-medium">In Photo</th>
                    <th className="text-left py-2.5 px-3 text-muted-foreground font-medium">Time Out</th>
                    <th className="text-left py-2.5 px-3 text-muted-foreground font-medium">Out Photo</th>
                    <th className="text-left py-2.5 px-3 text-muted-foreground font-medium">Hours</th>
                    <th className="text-left py-2.5 px-3 text-muted-foreground font-medium">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRecords.map((e, i) => (
                    <tr key={e.date} className={`border-b border-border last:border-0 ${i % 2 === 0 ? "bg-muted/20" : ""}`}>
                      <td className="py-2.5 px-3">{formatDate(e.date)}</td>
                      <td className="py-2.5 px-3 text-muted-foreground">{e.day}</td>
                      <td className="py-2.5 px-3 font-medium">{e.timeIn ?? "—"}</td>
                      <td className="py-2.5 px-3">
                        {e.timeInPhoto
                          ? <img src={e.timeInPhoto} alt="" className="h-8 w-8 rounded object-cover border border-border" />
                          : <span className="text-muted-foreground text-xs">—</span>}
                      </td>
                      <td className="py-2.5 px-3 font-medium">{e.timeOut ?? "—"}</td>
                      <td className="py-2.5 px-3">
                        {e.timeOutPhoto
                          ? <img src={e.timeOutPhoto} alt="" className="h-8 w-8 rounded object-cover border border-border" />
                          : <span className="text-muted-foreground text-xs">—</span>}
                      </td>
                      <td className="py-2.5 px-3">{e.hours > 0 ? `${e.hours}h` : "—"}</td>
                      <td className="py-2.5 px-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          e.remarks === "Regular" ? "bg-green-100 text-green-700" :
                          e.remarks === "Late" ? "bg-orange-100 text-orange-700" :
                          "bg-gray-100 text-gray-500"
                        }`}>{e.remarks}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Camera Modal */}
        <Dialog open={cameraOpen} onOpenChange={(o) => { if (!o) closeCamera(); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{cameraMode === "in" ? "Time In — Take Selfie" : "Time Out — Take Selfie"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="aspect-video w-full rounded-lg overflow-hidden bg-black flex items-center justify-center">
                {cameraError ? (
                  <div className="text-white text-sm p-4 text-center">{cameraError}</div>
                ) : (
                  <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                )}
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Center your face in the frame. Your selfie + timestamp will be saved as proof of {cameraMode === "in" ? "time in" : "time out"}.
              </p>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={closeCamera}>Cancel</Button>
                <Button
                  className={`gap-2 text-white ${cameraMode === "in" ? "bg-green-600 hover:bg-green-700" : "bg-red-500 hover:bg-red-600"}`}
                  onClick={handleCapture}
                  disabled={!!cameraError}
                >
                  <Camera className="h-4 w-4" /> Capture & Save
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  };

  const renderAccomplishments = () => {
    const sortedDesc = [...accomplishmentList].sort((a, b) => b.date.localeCompare(a.date));
    const approved = accomplishmentList.filter(a => a.status === "approved").length;
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Daily Accomplishments</h1>
            <p className="text-muted-foreground mt-1">Post your daily accomplishments — your supervisor will review and approve.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" className="gap-2 border-primary text-primary hover:bg-primary/10" onClick={() => setShowMonthlyAccompModal(true)}>
              <Sparkles className="h-4 w-4" /> Generate Monthly Accomplishment
            </Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white gap-2" onClick={() => setShowAccomplishmentModal(true)}>
              <Plus className="h-4 w-4" /> New Accomplishment
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Posts</p><p className="text-2xl font-bold">{accomplishmentList.length}</p></CardContent></Card>
          <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Approved</p><p className="text-2xl font-bold text-green-600">{approved}</p></CardContent></Card>
          <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Hours</p><p className="text-2xl font-bold">{totalHoursAll}</p></CardContent></Card>
        </div>

        <div className="grid gap-4">
          {sortedDesc.map(a => (
            <Card key={a.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileCheck className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-semibold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-md">{formatDate(a.date)}</span>
                      <span className="text-xs text-muted-foreground">{a.hours} hrs</span>
                      <StatusBadge status={a.status} />
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">{a.details}</p>
                    {a.picture && (
                      <img src={a.picture} alt="Accomplishment evidence" className="mt-3 rounded-lg border border-border max-h-56 object-cover" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* New Accomplishment Modal */}
        <Dialog open={showAccomplishmentModal} onOpenChange={setShowAccomplishmentModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Post Daily Accomplishment</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmitAccomplishment} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Date</Label><Input type="date" className="mt-1.5" value={accForm.date} onChange={e => setAccForm({ ...accForm, date: e.target.value })} required /></div>
                <div><Label>Total Hours</Label><Input type="number" step="0.25" placeholder="e.g., 8" className="mt-1.5" value={accForm.hours} onChange={e => setAccForm({ ...accForm, hours: e.target.value })} required /></div>
              </div>
              <div><Label>Details</Label>
                <textarea rows={5} placeholder="Describe what you did today..." className="w-full mt-1.5 border border-border rounded-lg p-3 text-sm bg-card resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" value={accForm.details} onChange={e => setAccForm({ ...accForm, details: e.target.value })} required />
              </div>
              <div>
                <Label>Picture (evidence)</Label>
                <Input type="file" accept="image/*" className="mt-1.5" onChange={e => handlePictureChange(e.target.files?.[0])} />
                {accForm.picture && <img src={accForm.picture} alt="preview" className="mt-2 rounded-lg border border-border max-h-40 object-cover" />}
              </div>
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-700">
                Your supervisor will be notified to review and approve this accomplishment.
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowAccomplishmentModal(false)}>Cancel</Button>
                <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90 text-white">Post</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Monthly Accomplishment Generator */}
        <Dialog open={showMonthlyAccompModal} onOpenChange={setShowMonthlyAccompModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> Generate Monthly Accomplishment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="mb-1.5 block">Select Month</Label>
                <div className="relative">
                  <select className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-card appearance-none focus:outline-none focus:ring-2 focus:ring-primary/30 pr-9" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
                    {availableMonths.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">{monthEntries.length} accomplishments • {monthTotalHours} hours</p>
              </div>

              <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm text-primary">Monthly Accomplishment — {selectedMonth}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{studentProfile.studentId}</span>
                </div>
                <div className="space-y-2">
                  {monthEntries.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No accomplishments recorded for {selectedMonth}.</p>
                  ) : monthEntries.sort((a, b) => a.date.localeCompare(b.date)).map(e => (
                    <div key={e.id} className="border border-border rounded-lg p-3 bg-card">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-medium">{formatDate(e.date)}</span>
                        <span className="text-xs text-muted-foreground">• {e.hours} hrs</span>
                        <StatusBadge status={e.status} />
                      </div>
                      <p className="text-xs text-foreground leading-relaxed">{e.details}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowMonthlyAccompModal(false)}>Cancel</Button>
                <Button disabled={monthEntries.length === 0} className="flex-1 bg-primary hover:bg-primary/90 text-white gap-2 disabled:opacity-50" onClick={handleDownloadMonthly}>
                  <Download className="h-4 w-4" /> Download PDF
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  };

  const renderJournal = () => {
    const grouped: Record<string, DailyAccomplishment[]> = {};
    sortedAll.forEach(a => {
      const k = monthLabel(a.date);
      (grouped[k] ||= []).push(a);
    });
    const months = Object.keys(grouped);
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Journal Logs</h1>
            <p className="text-muted-foreground mt-1">Compiled record of all your OJT accomplishments from start to end</p>
          </div>
          <Button className="bg-primary hover:bg-primary/90 text-white gap-2" onClick={() => setShowFullJournalModal(true)} disabled={accomplishmentList.length === 0}>
            <Sparkles className="h-4 w-4" /> Generate Journal
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Period Covered</p><p className="text-base font-semibold">{sortedAll[0] ? `${formatDate(sortedAll[0].date)} – ${formatDate(sortedAll[sortedAll.length - 1].date)}` : "—"}</p></CardContent></Card>
          <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Entries</p><p className="text-2xl font-bold">{accomplishmentList.length}</p></CardContent></Card>
          <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Hours</p><p className="text-2xl font-bold">{totalHoursAll}</p></CardContent></Card>
        </div>

        <div className="space-y-5">
          {months.map(m => (
            <Card key={m} className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{m}</CardTitle>
                <CardDescription>{grouped[m].length} accomplishments • {grouped[m].reduce((s, e) => s + e.hours, 0)} hours</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {grouped[m].map(e => (
                  <div key={e.id} className="border border-border rounded-lg p-3 bg-muted/10">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-medium">{formatDate(e.date)}</span>
                      <span className="text-xs text-muted-foreground">• {e.hours} hrs</span>
                      <StatusBadge status={e.status} />
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">{e.details}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Full Journal Generator */}
        <Dialog open={showFullJournalModal} onOpenChange={setShowFullJournalModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> Generate Full OJT Journal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm text-primary">OJT Journal — {studentProfile.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{studentProfile.studentId}</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center mb-4">
                  <div className="bg-card rounded-lg p-3 border border-border"><p className="text-lg font-bold">{accomplishmentList.length}</p><p className="text-xs text-muted-foreground">Entries</p></div>
                  <div className="bg-card rounded-lg p-3 border border-border"><p className="text-lg font-bold">{totalHoursAll}</p><p className="text-xs text-muted-foreground">Total Hours</p></div>
                  <div className="bg-card rounded-lg p-3 border border-border"><p className="text-lg font-bold text-green-600">{accomplishmentList.filter(a => a.status === "approved").length}</p><p className="text-xs text-muted-foreground">Approved</p></div>
                </div>
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {sortedAll.map(e => (
                    <div key={e.id} className="border border-border rounded-lg p-2.5 bg-card">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="text-xs font-medium">{formatDate(e.date)}</span>
                        <span className="text-xs text-muted-foreground">• {e.hours} hrs</span>
                        <StatusBadge status={e.status} />
                      </div>
                      <p className="text-xs text-foreground leading-relaxed">{e.details}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowFullJournalModal(false)}>Cancel</Button>
                <Button className="flex-1 bg-primary hover:bg-primary/90 text-white gap-2" onClick={handleDownloadFullJournal}>
                  <Download className="h-4 w-4" /> Download PDF
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  };

  const renderDocuments = () => {
    const submittedCount = studentDocs.filter(d => d.status !== "missing").length;
    const approvedCount = studentDocs.filter(d => d.status === "approved").length;
    const total = studentDocs.length;
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Documents</h1>
          <p className="text-muted-foreground mt-1">Download templates and submit your OJT-required documents</p>
        </div>

        {/* Progress Summary */}
        <Card className="border-0 shadow-sm bg-primary/5">
          <CardContent className="p-5 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm text-muted-foreground">Submission Progress</p>
              <p className="text-2xl font-bold">{approvedCount}/{total} <span className="text-sm font-normal text-muted-foreground">approved</span></p>
              <p className="text-xs text-muted-foreground mt-1">{submittedCount} submitted • {total - submittedCount} not yet submitted</p>
            </div>
            <div className="flex-1 min-w-[200px] max-w-md">
              <div className="h-2 bg-white rounded-full overflow-hidden border border-border">
                <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${Math.round((approvedCount / total) * 100)}%` }} />
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">Once all documents are approved, your coordinator will deploy you to a partner company.</p>
            </div>
          </CardContent>
        </Card>

        {/* Templates from Admin */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Document Templates</CardTitle>
            <CardDescription>Reference templates uploaded by the OJT Coordinator. Download, fill out, and submit below.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-3">
              {templateData.map((t, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/10">
                  <div className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-blue-100 text-blue-600">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{t.file} • {t.size}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => toast.info(`Previewing ${t.name}`)}><Eye className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => toast.success(`Downloading ${t.file}`)}><Download className="h-3.5 w-3.5" /></Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* My Submissions */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">My Submissions</CardTitle>
            <CardDescription>Upload each required document. Your coordinator will review and approve them.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {studentDocs.map((doc, i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-lg border border-border hover:bg-muted/30">
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    doc.status === "approved" ? "bg-green-100 text-green-600" :
                    doc.status === "pending" ? "bg-orange-100 text-orange-600" :
                    "bg-red-100 text-red-500"
                  }`}>
                    <FileCheck className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {doc.file ? `${doc.file} • Uploaded ${doc.uploadedDate}` : "Not yet submitted"}
                    </p>
                  </div>
                  <StatusBadge status={doc.status} />
                  {doc.file && (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => toast.info(`Previewing ${doc.name}`)}><Eye className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => toast.success(`Downloading ${doc.file}`)}><Download className="h-3.5 w-3.5" /></Button>
                    </div>
                  )}
                  {doc.status === "missing" ? (
                    <Button size="sm" className="h-8 text-xs gap-1 bg-primary hover:bg-primary/90 text-white" onClick={() => openDocUpload(doc.name)}>
                      <Upload className="h-3.5 w-3.5" /> Upload
                    </Button>
                  ) : doc.status !== "approved" ? (
                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => openDocUpload(doc.name)}>
                      <Upload className="h-3.5 w-3.5" /> Replace
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Upload Modal */}
        <Dialog open={showDocUpload} onOpenChange={setShowDocUpload}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Submit Document</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Document</Label>
                <select className="w-full mt-1.5 border border-border rounded-lg p-2 text-sm bg-card" value={docUploadForm.name} onChange={e => setDocUploadForm({ ...docUploadForm, name: e.target.value })}>
                  {REQUIRED_DOC_NAMES.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <Label>File (PDF, JPG, PNG up to 10MB)</Label>
                <Input type="file" className="mt-1.5" accept=".pdf,.jpg,.jpeg,.png" onChange={e => handleDocFileChange(e.target.files?.[0])} />
              </div>
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-700">
                Your submission will be reviewed by the OJT Coordinator. You can replace it before approval.
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowDocUpload(false)}>Cancel</Button>
                <Button className="flex-1 bg-primary hover:bg-primary/90 text-white" onClick={handleSubmitDoc}>Submit</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  };

  const renderAnnouncements = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Announcements</h1>
        <p className="text-muted-foreground mt-1">Stay updated with OJT announcements from your coordinator</p>
      </div>
      <div className="grid gap-4">
        {announcements.map(a => (
          <Card key={a.id} className={`border-0 shadow-sm cursor-pointer hover:shadow-md transition-all ${!a.read ? "border-l-4 border-l-primary" : ""}`}>
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className={`p-2.5 rounded-lg flex-shrink-0 ${
                  a.category === "seminar" ? "bg-blue-100 text-blue-600" :
                  a.category === "deadline" ? "bg-red-100 text-red-600" :
                  a.category === "evaluation" ? "bg-purple-100 text-purple-600" :
                  "bg-gray-100 text-gray-600"
                }`}>
                  <Megaphone className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-semibold">{a.title}</h3>
                    {a.priority === "high" && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full flex-shrink-0">High Priority</span>}
                  </div>
                  <p className="text-sm text-muted-foreground">{a.content}</p>
                  <p className="text-xs text-muted-foreground mt-2">{a.date}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const sectionMap: Record<string, () => JSX.Element> = {
    dashboard: renderDashboard,
    profile: renderProfile,
    deployment: renderDeployment,
    attendance: renderAttendance,
    journal: renderJournal,
    accomplishments: renderAccomplishments,
    documents: renderDocuments,
    announcements: renderAnnouncements,
  };

  return (
    <DashboardLayout
      menuItems={menuItems}
      userRole="Student"
      userName={user?.name || studentProfile.name}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
    >
      {(sectionMap[activeSection] || renderDashboard)()}
    </DashboardLayout>
  );
}