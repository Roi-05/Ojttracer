import { useState, useEffect } from "react";
import { toast } from "sonner";
import { getCurrentPosition, checkGeofence, normalizePolygon } from "../lib/geolocation";
import { DashboardLayout } from "../components/DashboardLayout";
import { useAuth } from "../contexts/AuthContext";
import { useStudentData } from "../hooks/useStudentData";
import * as api from "../lib/api";

import { ClockInModal } from "../components/student/ClockInModal";
import { UploadDocumentModal } from "../components/student/UploadDocumentModal";
import { AddAccomplishmentModal } from "../components/student/AddAccomplishmentModal";

import { DashboardTab } from "../components/student/DashboardTab";
import { ProfileTab } from "../components/student/ProfileTab";
import { DeploymentTab } from "../components/student/DeploymentTab";
import { DTRTab } from "../components/student/DTRTab";
import { JournalTab } from "../components/student/JournalTab";
import { DocumentsTab } from "../components/student/DocumentsTab";
import { AnnouncementsTab } from "../components/student/AnnouncementsTab";
import { EvaluationTab } from "../components/student/EvaluationTab";
import { StudentJourneyChecklist } from "../components/shared/OnboardingChecklist";
import { generateECertificatePDF } from "../lib/generateECertificatePDF";
import { generateECertificateDOCX, ECertificateInfo } from "../lib/generateECertificate";

import { LayoutDashboard, User, MapPin, Clock, BookOpen, Upload, Megaphone, Star } from "lucide-react";
import { TODAY_ISO } from "../components/student/shared";

const menuItems = [
  { icon: <LayoutDashboard className="h-4 w-4" />, label: "Dashboard", value: "dashboard" },
  { icon: <User className="h-4 w-4" />, label: "My Profile", value: "profile" },
  { icon: <MapPin className="h-4 w-4" />, label: "My Deployment", value: "deployment" },
  { icon: <Clock className="h-4 w-4" />, label: "Attendance (DTR)", value: "attendance" },
  { icon: <BookOpen className="h-4 w-4" />, label: "Journal", value: "journal" },
  { icon: <Upload className="h-4 w-4" />, label: "Documents", value: "documents" },
  { icon: <Star className="h-4 w-4" />, label: "My Evaluation", value: "evaluation" },
  { icon: <Megaphone className="h-4 w-4" />, label: "Announcements", value: "announcements" },
];

const emptyStudentInfo = {
  name: "", studentId: "", course: "BSIT", year: "4th Year", section: "",
  email: "", phone: "", address: "", skills: [] as string[], religion: "",
};

const emptyDeploymentInfo = {
  company: "", supervisor: "", supervisorEmail: "", address: "", companyAddress: "",
  startDate: "", endDate: "", requiredHours: 486, completedHours: 0, position: "", status: "pending",
  companyLat: null as number | null, companyLng: null as number | null, geofenceRadius: 200,
  geofencePolygon: null as [number, number][] | null,
  supervisorSignatureUrl: null as string | null,
};

export function StudentDashboard() {
  const { user } = useAuth();
  const studentProfile = {
    name: user?.name || emptyStudentInfo.name,
    studentId: (user as any)?.studentId || emptyStudentInfo.studentId,
    lastName: (user as any)?.lastName || "",
    firstName: (user as any)?.firstName || "",
    middleName: (user as any)?.middleName || "",
    course: (user as any)?.course || emptyStudentInfo.course,
    year: (user as any)?.yearLevel || emptyStudentInfo.year,
    schoolYear: (user as any)?.schoolYear || "2025-2026",
    section: (user as any)?.section || emptyStudentInfo.section,
    dateOfBirth: (user as any)?.dateOfBirth || null,
    civilStatus: (user as any)?.civilStatus || "",
    sex: (user as any)?.sex || "",
    email: user?.email || emptyStudentInfo.email,
    phone: (user as any)?.phone || emptyStudentInfo.phone,
    address: (user as any)?.address || emptyStudentInfo.address,
    skills: (user as any)?.skills || emptyStudentInfo.skills,
    religion: (user as any)?.religion || "",
    avatarUrl: (user as any)?.avatarUrl || null,
    signatureUrl: (user as any)?.signatureUrl || null,
    fatherName: (user as any)?.fatherName || "",
    fatherOccupation: (user as any)?.fatherOccupation || "",
    fatherPhone: (user as any)?.fatherPhone || "",
    motherName: (user as any)?.motherName || "",
    motherOccupation: (user as any)?.motherOccupation || "",
    motherPhone: (user as any)?.motherPhone || "",
    guardianName: (user as any)?.guardianName || "",
    guardianRelationship: (user as any)?.guardianRelationship || "",
    guardianPhone: (user as any)?.guardianPhone || "",
  };

  const {
    loading, dtrRecords, accomplishments, documents, deployment, announcements, templates,
    activeCompanies, intendedCompanyId, intendedPosition, evaluation, setTargetCompany,
    deviceInfo, registerCurrentDevice, requestDeviceReset,
    clockIn, clockOut, submitDocument, submitAccomplishment, updateProfileData
  } = useStudentData();

  const [activeSection, setActiveSection] = useState("dashboard");
  const [coordinatorName, setCoordinatorName] = useState("");

  // Fetch coordinator name once on mount
  useEffect(() => {
    api.getCoordinatorName().then((res: any) => {
      if (res?.name) setCoordinatorName(res.name);
    }).catch(() => {});
  }, []);
  
  // Modal states
  const [cameraModal, setCameraModal] = useState<{ open: boolean, mode: "in" | "out" }>({ open: false, mode: "in" });
  const [docUploadModal, setDocUploadModal] = useState<{ open: boolean, docName: string }>({ open: false, docName: "" });
  const [accModalOpen, setAccModalOpen] = useState(false);
  const [geofenceStatus, setGeofenceStatus] = useState<"idle" | "checking" | "allowed" | "denied" | "out_of_range" | "no_gps">("idle");

  // Derived state
  const todayRecord = dtrRecords.find(r => r.date === TODAY_ISO) || null;
  const activeDeployment = deployment || emptyDeploymentInfo;
  const isDeployed = !!deployment && activeDeployment.status !== "pending";
  const completedHours = dtrRecords.filter(r => r.status === "approved").reduce((s, r) => s + (r.hours || 0), 0);
  const roundedHours = Math.round(completedHours * 10) / 10;
  const hoursDone = activeDeployment.requiredHours > 0 && roundedHours >= activeDeployment.requiredHours;
  const effectiveDeployment = {
    ...activeDeployment,
    completedHours: roundedHours,
    status: hoursDone ? "completed" : activeDeployment.status,
  };
  const pct = effectiveDeployment.requiredHours
    ? Math.min(100, Math.round((effectiveDeployment.completedHours / effectiveDeployment.requiredHours) * 100))
    : 0;

  // Geofence-gated camera opener
  const openDTRCamera = async (mode: "in" | "out") => {
    const companyLat = activeDeployment?.companyLat;
    const companyLng = activeDeployment?.companyLng;
    const radius = activeDeployment?.geofenceRadius || 200;
    const polygon = normalizePolygon((activeDeployment as any)?.geofencePolygon);

    const hasPolygon = polygon.length >= 3;

    // Grace mode: no GPS and no polygon set for company — skip geofencing
    if (!hasPolygon && (companyLat == null || companyLng == null)) {
      setGeofenceStatus("no_gps");
      setCameraModal({ open: true, mode });
      return;
    }

    setGeofenceStatus("checking");
    try {
      const pos = await getCurrentPosition();
      const result = checkGeofence(pos.latitude, pos.longitude, companyLat, companyLng, radius, polygon);
      if (result.allowed) {
        setGeofenceStatus("allowed");
        setCameraModal({ open: true, mode });
      } else {
        setGeofenceStatus("out_of_range");
        if (result.mode === "polygon") {
          toast.error(
            `You are outside your company's polygon geofence boundary (${result.distance ?? 0}m away). You must be inside the designated company boundary to Time ${mode === "in" ? "In" : "Out"}.`,
            { duration: 5500 }
          );
        } else {
          toast.error(
            `You are ${result.distance}m away from your company. You must be within ${result.radius}m to Time ${mode === "in" ? "In" : "Out"}.`,
            { duration: 5000 }
          );
        }
      }
    } catch (err: any) {
      setGeofenceStatus("denied");
      toast.error(err as string, { duration: 5000 });
    }
  };

  // Actual camera capture handler (called after geofence is cleared)
  const handleCameraCapture = async (photo: string) => {
    const d = new Date();
    // Always use 24h HH:MM so backend parsing is unambiguous
    const now = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    const today = d.toLocaleDateString("en-US", { weekday: "long" }).slice(0, 3);

    if (cameraModal.mode === "in") {
      await clockIn(TODAY_ISO, now, photo, today);
    } else {
      let hours = 0;
      if (todayRecord?.timeIn) {
        const [inH, inM] = todayRecord.timeIn.split(":").map(Number);
        const [outH, outM] = now.split(":").map(Number);
        const inTotalMin = inH * 60 + inM;
        const outTotalMin = outH * 60 + outM;
        const diffMinutes = outTotalMin - inTotalMin;
        let deductionMinutes = 0;

        if (effectiveDeployment.breakStart && effectiveDeployment.breakEnd) {
          const [bStartH, bStartM] = effectiveDeployment.breakStart.split(":").map(Number);
          const [bEndH, bEndM] = effectiveDeployment.breakEnd.split(":").map(Number);
          const bStartMin = bStartH * 60 + bStartM;
          const bEndMin = bEndH * 60 + bEndM;
          const overlapStart = Math.max(inTotalMin, bStartMin);
          const overlapEnd = Math.min(outTotalMin, bEndMin);
          deductionMinutes = Math.max(0, overlapEnd - overlapStart);
        }

        const netMinutes = Math.max(0, diffMinutes - deductionMinutes);
        hours = Math.max(0, parseFloat((netMinutes / 60).toFixed(2)));
      }
      await clockOut(TODAY_ISO, now, photo, hours);
      if (hours < 8) {
        toast.warning(`Timed out: ${hours.toFixed(2)}h recorded (Undertime — less than 8 hours).`, { duration: 5000 });
      } else {
        toast.success(`Timed out: ${hours.toFixed(2)}h recorded (Completed — 8 hours or more).`, { duration: 5000 });
      }
    }
    setCameraModal({ ...cameraModal, open: false });
  };

  const handleDocSubmit = async (docName: string, file: File) => {
    await submitDocument(docName, file);
    setDocUploadModal({ ...docUploadModal, open: false });
  };

  const handleAccSubmit = async (date: string, hours: number, details: string, photo: string | null) => {
    if (accomplishments.some(a => a.date === date)) {
      toast.error(`You already have a journal entry for ${date}.`);
      return;
    }
    await submitAccomplishment(date, hours, details, photo);
    setAccModalOpen(false);
  };

  const isCompleted = effectiveDeployment.status === "completed" || hoursDone;

  // Exact date the intern reached their required OJT hours based on approved DTR records
  const actualCompletionDate = (() => {
    const approvedSorted = [...dtrRecords]
      .filter(r => r.status === "approved" && r.date && (r.hours || 0) > 0)
      .sort((a, b) => a.date.localeCompare(b.date));
    if (approvedSorted.length === 0) {
      return effectiveDeployment.endDate || TODAY_ISO;
    }
    const reqHrs = effectiveDeployment.requiredHours || 486;
    let cumulative = 0;
    for (const rec of approvedSorted) {
      cumulative += rec.hours || 0;
      if (cumulative >= reqHrs) {
        return rec.date;
      }
    }
    return approvedSorted[approvedSorted.length - 1].date;
  })();

  const handleExportCertificatePDF = async () => {
    const payload: ECertificateInfo = {
      studentName: studentProfile.name || user?.name || "Student",
      companyName: effectiveDeployment.company || "",
      position: effectiveDeployment.position || "Intern",
      schoolYear: studentProfile.schoolYear || effectiveDeployment.schoolYear || "",
      startDate: effectiveDeployment.startDate || "",
      endDate: effectiveDeployment.endDate || "",
      completionDate: actualCompletionDate,
      supervisorName: effectiveDeployment.supervisor || "",
      coordinatorName: coordinatorName || "",
    };

    toast.promise(generateECertificatePDF(payload), {
      loading: "Compiling Certificate PDF...",
      success: "E-Certificate PDF downloaded successfully!",
      error: "Failed to compile Certificate PDF. Please try again.",
    });
  };

  const handleExportCertificateDOCX = async () => {
    const payload: ECertificateInfo = {
      studentName: studentProfile.name || user?.name || "Student",
      companyName: effectiveDeployment.company || "",
      position: effectiveDeployment.position || "Intern",
      schoolYear: studentProfile.schoolYear || effectiveDeployment.schoolYear || "",
      startDate: effectiveDeployment.startDate || "",
      endDate: effectiveDeployment.endDate || "",
      completionDate: actualCompletionDate,
      supervisorName: effectiveDeployment.supervisor || "",
      coordinatorName: coordinatorName || "",
    };

    toast.promise(generateECertificateDOCX(payload), {
      loading: "Generating Word Document...",
      success: "E-Certificate (.docx) downloaded successfully!",
      error: "Failed to generate Word Document. Please try again.",
    });
  };

  const sectionMap: Record<string, () => JSX.Element> = {
    dashboard: () => <DashboardTab 
      user={user} studentProfile={studentProfile} effectiveDeployment={effectiveDeployment} pct={pct} 
      accomplishmentList={accomplishments} studentDocs={documents} announcementData={announcements} 
      setActiveSection={setActiveSection} setShowAccomplishmentModal={setAccModalOpen} 
      isCompleted={isCompleted} onExportCertificatePDF={handleExportCertificatePDF}
    />,
    profile: () => <ProfileTab studentProfile={studentProfile} updateProfileData={updateProfileData} />,
    deployment: () => <DeploymentTab 
      effectiveDeployment={effectiveDeployment} pct={pct} 
      isCompleted={isCompleted}
      onExportCertificatePDF={handleExportCertificatePDF}
      onExportCertificateDOCX={handleExportCertificateDOCX}
    />,
    attendance: () => !isDeployed ? (
      <div className="p-8 text-center bg-muted/5 border border-border rounded-xl mt-6">
        <p className="font-medium text-lg">Deployment Not Active</p>
        <p className="text-sm text-muted-foreground mt-1">You must have an ongoing deployment to view and manage your Daily Time Record.</p>
      </div>
    ) : <DTRTab
      dtrRecords={dtrRecords}
      todayRecord={todayRecord}
      openCamera={openDTRCamera}
      geofenceStatus={geofenceStatus}
      deviceInfo={deviceInfo}
      onRegisterDevice={registerCurrentDevice}
      onRequestResetDevice={requestDeviceReset}
      studentProfile={studentProfile}
      supervisorSignatureUrl={activeDeployment.supervisorSignatureUrl || null}
      companyLocation={{
        latitude: activeDeployment.companyLat,
        longitude: activeDeployment.companyLng,
        geofenceRadius: activeDeployment.geofenceRadius || 200,
        geofencePolygon: activeDeployment.geofencePolygon || null,
        companyName: activeDeployment.company || "Company Office",
        companyAddress: activeDeployment.companyAddress || activeDeployment.address || "",
      }}
    />,
    journal: () => !isDeployed ? (
      <div className="p-8 text-center bg-muted/5 border border-border rounded-xl mt-6">
        <p className="font-medium text-lg">Deployment Not Active</p>
        <p className="text-sm text-muted-foreground mt-1">You must have an ongoing deployment to view and manage your Internship Journal.</p>
      </div>
    ) : <JournalTab
      accomplishmentList={accomplishments}
      openAddModal={() => setAccModalOpen(true)}
      studentId={studentProfile.studentId}
      studentName={studentProfile.name}
      studentSection={`${studentProfile.course} ${studentProfile.year} ${studentProfile.section}`}
      studentProfile={studentProfile}
      coordinatorName={coordinatorName}
      deployment={{ company: activeDeployment.company, position: activeDeployment.position, supervisor: activeDeployment.supervisor, companyAddress: activeDeployment.companyAddress || activeDeployment.address || "", supervisorContact: activeDeployment.supervisorEmail || "" }}
    />,
    documents: () => (
      <DocumentsTab 
        studentDocs={documents} 
        templateData={templates} 
        activeCompanies={activeCompanies}
        intendedCompanyId={intendedCompanyId}
        intendedPosition={intendedPosition}
        setTargetCompany={setTargetCompany}
        openDocUpload={(docName) => setDocUploadModal({ open: true, docName })} 
      />
    ),
    evaluation: () => <EvaluationTab evaluation={evaluation} />,
    announcements: () => <AnnouncementsTab announcements={announcements} />,
  };

  return (
    <DashboardLayout
      menuItems={menuItems}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      userRole="student"
      userName={studentProfile.name}
      avatarUrl={studentProfile.avatarUrl}
    >
      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 animate-in fade-in duration-500">
        {["dashboard", "deployment", "attendance", "journal"].includes(activeSection) && (
          <StudentJourneyChecklist
            studentProfile={studentProfile}
            intendedCompanyId={intendedCompanyId}
            intendedPosition={intendedPosition}
            studentDocs={documents}
            isDeployed={isDeployed}
            deployedCompany={activeDeployment.company}
            onNavigate={setActiveSection}
          />
        )}
        {sectionMap[activeSection] ? sectionMap[activeSection]() : <div>Section not found</div>}
      </div>

      <ClockInModal 
        open={cameraModal.open} 
        mode={cameraModal.mode} 
        onClose={() => setCameraModal({ ...cameraModal, open: false })} 
        onCapture={handleCameraCapture} 
      />

      <UploadDocumentModal 
        open={docUploadModal.open} 
        defaultDocName={docUploadModal.docName} 
        onClose={() => setDocUploadModal({ ...docUploadModal, open: false })} 
        onSubmit={handleDocSubmit} 
      />

      <AddAccomplishmentModal 
        open={accModalOpen} 
        onClose={() => setAccModalOpen(false)} 
        onSubmit={handleAccSubmit} 
      />
    </DashboardLayout>
  );
}