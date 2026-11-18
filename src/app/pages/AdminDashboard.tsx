import { useState, useMemo } from "react";
import { DashboardLayout } from "../components/DashboardLayout";
import { useAuth } from "../contexts/AuthContext";
import { useAdminData } from "../hooks/useAdminData";

import { ImportStudentsModal } from "../components/admin/ImportStudentsModal";
import { AddCompanyModal } from "../components/admin/AddCompanyModal";
import { AddAnnouncementModal } from "../components/admin/AddAnnouncementModal";
import { UploadTemplateModal } from "../components/admin/UploadTemplateModal";
import { ViewSubmissionModal } from "../components/admin/ViewSubmissionModal";
import { DeployStudentModal } from "../components/admin/DeployStudentModal";
import { UpdateMoaModal } from "../components/admin/UpdateMoaModal";
import { UploadMoaTemplateModal } from "../components/admin/UploadMoaTemplateModal";
import { GenerateReportsModal } from "../components/admin/GenerateReportsModal";

import { OverviewTab } from "../components/admin/OverviewTab";
import { StudentsTab } from "../components/admin/StudentsTab";
import { CompaniesTab } from "../components/admin/CompaniesTab";
import { DeploymentTab } from "../components/admin/DeploymentTab";
import { AttendanceTab } from "../components/admin/AttendanceTab";
import { JournalsTab } from "../components/admin/JournalsTab";
import { AnnouncementsTab } from "../components/admin/AnnouncementsTab";
import { DocumentsTab } from "../components/admin/DocumentsTab";
import { AnalyticsTab } from "../components/admin/AnalyticsTab";
import { EvaluationsTab } from "../components/admin/EvaluationsTab";
import { SettingsTab } from "../components/admin/SettingsTab";

import { LayoutDashboard, Building2, Clock, BookOpen, Upload, Megaphone, BarChart3, GraduationCap, Briefcase, Star, Settings } from "lucide-react";

const menuItems = [
  { icon: <LayoutDashboard className="h-4 w-4" />, label: "Overview", value: "dashboard" },
  { icon: <GraduationCap className="h-4 w-4" />, label: "Students", value: "students" },
  { icon: <Building2 className="h-4 w-4" />, label: "Companies / HTEs", value: "companies" },
  { icon: <Briefcase className="h-4 w-4" />, label: "Deployment", value: "deployment" },
  { icon: <Clock className="h-4 w-4" />, label: "Attendance (DTR)", value: "attendance" },
  { icon: <BookOpen className="h-4 w-4" />, label: "Journals", value: "journals" },
  { icon: <Star className="h-4 w-4" />, label: "Evaluations", value: "evaluations" },
  { icon: <Megaphone className="h-4 w-4" />, label: "Announcements", value: "announcements" },
  { icon: <Upload className="h-4 w-4" />, label: "Documents", value: "documents" },
  { icon: <BarChart3 className="h-4 w-4" />, label: "Analytics", value: "analytics" },
  { icon: <Settings className="h-4 w-4" />, label: "Settings", value: "settings" },
];

const COLORS = ["#2563EB", "#16A34A", "#EA580C", "#7C3AED", "#DC2626"];
const monthlyPlacementData: any[] = [];
const hoursProgressData: any[] = [];

export function AdminDashboard() {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState("dashboard");

  const {
    students, companies, evaluations, dtrLogs, journalLogs, announcements, templates, studentSubmissions,
    verifyCompany, updateMoaStatus, uploadTemplate, reviewDocument, deployStudent, resetStudentDevice, rejectStudentDevice, deleteAnnouncement, deleteCompany, deleteTemplate, reload
  } = useAdminData();

  // Modals state
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [templateUploadModal, setTemplateUploadModal] = useState<{ open: boolean; templateName: string }>({ open: false, templateName: "" });
  const [viewSubmissionId, setViewSubmissionId] = useState<string | number | null>(null);
  const [showDeployModal, setShowDeployModal] = useState<{ open: boolean, studentId: string | number }>({ open: false, studentId: "" });
  const [moaModalCompany, setMoaModalCompany] = useState<any | null>(null);
  const [showMoaTemplateUpload, setShowMoaTemplateUpload] = useState(false);
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [selectedSchoolYear, setSelectedSchoolYear] = useState<string>("all");

  const schoolYears = useMemo(() => {
    const set = new Set<string>();
    students.forEach(s => { if (s.schoolYear) set.add(s.schoolYear); });
    if (set.size === 0) set.add("2025-2026");
    return Array.from(set).sort().reverse();
  }, [students]);

  const filteredStudents = useMemo(() => {
    if (selectedSchoolYear === "all") return students;
    return students.filter(s => s.schoolYear === selectedSchoolYear);
  }, [students, selectedSchoolYear]);

  const filteredDtrLogs = useMemo(() => {
    if (selectedSchoolYear === "all") return dtrLogs;
    return dtrLogs.filter(d => d.schoolYear === selectedSchoolYear);
  }, [dtrLogs, selectedSchoolYear]);

  const filteredJournalLogs = useMemo(() => {
    if (selectedSchoolYear === "all") return journalLogs;
    return journalLogs.filter(j => j.schoolYear === selectedSchoolYear);
  }, [journalLogs, selectedSchoolYear]);

  const filteredSubmissions = useMemo(() => {
    if (selectedSchoolYear === "all") return studentSubmissions;
    return studentSubmissions.filter(s => s.schoolYear === selectedSchoolYear);
  }, [studentSubmissions, selectedSchoolYear]);

  const filteredEvaluations = useMemo(() => {
    if (selectedSchoolYear === "all") return evaluations;
    return evaluations.filter(e => e.schoolYear === selectedSchoolYear);
  }, [evaluations, selectedSchoolYear]);

  const dynamicSections = useMemo(() => {
    const set = new Set<string>();
    filteredStudents.forEach(s => {
      if (s.section && s.section !== "—") set.add(s.section);
    });
    return Array.from(set).sort();
  }, [filteredStudents]);

  const sectionDistribution = dynamicSections.map((name, i) => ({
    name,
    value: filteredStudents.filter(s => s.section === name).length,
    color: COLORS[i % COLORS.length],
  }));

  const viewSub = studentSubmissions.find(s => s.studentId === viewSubmissionId) || null;

  const allDocsApproved = (subId: string | number) => {
    const s = studentSubmissions.find(x => x.studentId === subId);
    return !!s && s.docs.every(d => d.status === "approved");
  };


  const sectionMap: Record<string, () => JSX.Element> = {
    dashboard: () => <OverviewTab students={filteredStudents} companies={companies} setActiveSection={setActiveSection} monthlyPlacementData={monthlyPlacementData} sectionDistribution={sectionDistribution} openReportsModal={() => setShowReportsModal(true)} />,
    students: () => <StudentsTab students={filteredStudents} sections={dynamicSections} openImportModal={() => setShowImportModal(true)} onResetDevice={resetStudentDevice} onRejectDevice={rejectStudentDevice} />,
    companies: () => <CompaniesTab companies={companies} onManageMoa={(c) => setMoaModalCompany(c)} openUploadMoa={() => setShowMoaTemplateUpload(true)} onDelete={deleteCompany} />,
    deployment: () => <DeploymentTab students={filteredStudents} />,
    attendance: () => <AttendanceTab dtrLogs={filteredDtrLogs} />,
    journals: () => <JournalsTab journalLogs={filteredJournalLogs} />,
    evaluations: () => <EvaluationsTab evaluations={filteredEvaluations} />,
    announcements: () => <AnnouncementsTab announcements={announcements} openAddModal={() => setShowAnnouncementModal(true)} onDelete={deleteAnnouncement} />,
    documents: () => <DocumentsTab
      templates={templates} studentSubmissions={filteredSubmissions}
      openTemplateUpload={(name) => setTemplateUploadModal({ open: true, templateName: name })}
      deleteTemplate={deleteTemplate}
      openReviewSubmission={(id) => setViewSubmissionId(id)}
      openDeployModal={(id) => setShowDeployModal({ open: true, studentId: id })}
    />,
    analytics: () => <AnalyticsTab students={filteredStudents} companies={companies} overviewStats={[]} hoursProgressData={[]} monthlyPlacementData={[]} sectionDistribution={sectionDistribution} />,
    settings: () => <SettingsTab />,
  };

  return (
    <DashboardLayout
      menuItems={menuItems}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      userRole={user?.coordinatorCourse ? `${user.coordinatorCourse} Coordinator` : "Coordinator"}
      userName={user?.name || "Coordinator"}
    >
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 animate-in fade-in duration-500">
        {/* Academic School Year Cohort Banner */}
        <div className="flex items-center justify-between flex-wrap gap-3 mb-6 bg-card border border-border/70 rounded-xl p-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs shrink-0">
              {user?.coordinatorCourse || "OJT"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {user?.coordinatorCourse ? `${user.coordinatorCourse} Department • Academic Cohort` : "Academic Cohort Filter"}
                </p>
                {user?.coordinatorCourse && (
                  <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-100 text-purple-700">
                    {user.coordinatorCourse}
                  </span>
                )}
              </div>
              <p className="text-xs text-foreground font-medium">
                Active View: <strong className="text-blue-700 font-semibold">{selectedSchoolYear === "all" ? "All School Years (Combined)" : `S.Y. ${selectedSchoolYear}`}</strong>
                <span className="text-muted-foreground ml-2 font-normal">({filteredStudents.length} student{filteredStudents.length !== 1 ? "s" : ""})</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium hidden sm:inline">Cohort (S.Y.):</span>
            <select
              value={selectedSchoolYear}
              onChange={(e) => setSelectedSchoolYear(e.target.value)}
              aria-label="Filter by School Year"
              className="border border-border bg-card text-foreground rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer shadow-xs"
            >
              <option value="all">🎓 All School Years</option>
              {schoolYears.map(sy => (
                <option key={sy} value={sy}>S.Y. {sy}</option>
              ))}
            </select>
          </div>
        </div>
        {sectionMap[activeSection] ? sectionMap[activeSection]() : <div>Section not found</div>}
      </div>

      <ImportStudentsModal open={showImportModal} onClose={() => setShowImportModal(false)} onImported={reload} />
      <AddCompanyModal open={showCompanyModal} onClose={() => setShowCompanyModal(false)} />
      <AddAnnouncementModal open={showAnnouncementModal} onClose={() => setShowAnnouncementModal(false)} onAdded={() => reload()} />
      <UploadTemplateModal
        open={templateUploadModal.open}
        initialName={templateUploadModal.templateName}
        onClose={() => setTemplateUploadModal(prev => ({ ...prev, open: false }))}
        onSave={uploadTemplate}
      />
      <ViewSubmissionModal
        viewSub={viewSub} onClose={() => setViewSubmissionId(null)}
        onApproveDoc={reviewDocument} onRejectDoc={reviewDocument}
        onOpenDeploy={(id) => setShowDeployModal({ open: true, studentId: id })}
        allDocsApproved={allDocsApproved}
      />
      <DeployStudentModal
        open={showDeployModal.open} studentId={showDeployModal.studentId}
        companyList={companies}
        intendedCompanyId={students.find(s => s.id === showDeployModal.studentId)?.intendedCompanyId}
        intendedPosition={students.find(s => s.id === showDeployModal.studentId)?.intendedPosition}
        onClose={() => setShowDeployModal({ open: false, studentId: "" })}
        onDeploy={deployStudent}
      />
      <UpdateMoaModal
        open={!!moaModalCompany}
        company={moaModalCompany}
        onClose={() => setMoaModalCompany(null)}
        onSave={async (id, status, expiry) => { await updateMoaStatus(id, status, expiry); setMoaModalCompany(null); }}
      />
      <UploadMoaTemplateModal
        open={showMoaTemplateUpload}
        onClose={() => setShowMoaTemplateUpload(false)}
        onSave={uploadTemplate}
      />
      <GenerateReportsModal open={showReportsModal} onClose={() => setShowReportsModal(false)} students={filteredStudents} companies={companies} />
    </DashboardLayout>
  );
}
