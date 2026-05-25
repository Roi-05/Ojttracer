import { useState, useMemo } from "react";
import { DashboardLayout } from "../components/DashboardLayout";
import { useAuth } from "../contexts/AuthContext";
import { useAdminData, CompanyLocation } from "../hooks/useAdminData";

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
import { MapTab } from "../components/admin/MapTab";
import { EvaluationsTab } from "../components/admin/EvaluationsTab";

import { LayoutDashboard, Building2, MapPin, Clock, BookOpen, Upload, Megaphone, BarChart3, Map, GraduationCap, Briefcase, Star } from "lucide-react";

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
  { icon: <Map className="h-4 w-4" />, label: "Map View", value: "map" },
];

const SECTIONS = ["4A", "4B", "4C", "4D"];
const COLORS = ["#2563EB", "#16A34A", "#EA580C", "#7C3AED", "#DC2626"];
const monthlyPlacementData: any[] = [];
const hoursProgressData: any[] = [];

export function AdminDashboard() {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState("dashboard");
  const [selectedMapCompany, setSelectedMapCompany] = useState<CompanyLocation | null>(null);

  const {
    students, companies, evaluations, dtrLogs, journalLogs, announcements, templates, studentSubmissions,
    verifyCompany, updateMoaStatus, uploadTemplate, reviewDocument, deployStudent, deleteAnnouncement, deleteCompany, reload
  } = useAdminData();

  const companyLocations = useMemo(() => {
    return companies
      .filter(c => c.latitude != null && c.longitude != null)
      .map(c => {
        const lat = c.latitude!;
        const lng = c.longitude!;
        
        // Standard geographic bounds for Pampanga:
        // Lat: 14.85 to 15.22
        // Lng: 120.45 to 120.85
        const minLat = 14.85;
        const maxLat = 15.22;
        const minLng = 120.45;
        const maxLng = 120.85;
        
        // Convert to percentage coordinates (clamped to 5% - 95% to avoid borders)
        const x = Math.min(95, Math.max(5, ((lng - minLng) / (maxLng - minLng)) * 100));
        const y = Math.min(95, Math.max(5, 100 - (((lat - minLat) / (maxLat - minLat)) * 100)));
        
        return {
          name: c.name,
          address: c.location,
          lat,
          lng,
          industry: c.industry,
          interns: c.activeInterns,
          x,
          y,
          geofenceRadius: c.geofenceRadius
        };
      });
  }, [companies]);

  // Modals state
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [showTemplateUpload, setShowTemplateUpload] = useState(false);
  const [viewSubmissionId, setViewSubmissionId] = useState<string | number | null>(null);
  const [showDeployModal, setShowDeployModal] = useState<{ open: boolean, studentId: string | number }>({ open: false, studentId: "" });
  const [moaModalCompany, setMoaModalCompany] = useState<any | null>(null);
  const [showMoaTemplateUpload, setShowMoaTemplateUpload] = useState(false);
  const [showReportsModal, setShowReportsModal] = useState(false);

  const sectionDistribution = SECTIONS.map((name, i) => ({
    name,
    value: students.filter(s => s.section === name).length,
    color: COLORS[i % COLORS.length],
  }));

  const viewSub = studentSubmissions.find(s => s.studentId === viewSubmissionId) || null;

  const allDocsApproved = (subId: string | number) => {
    const s = studentSubmissions.find(x => x.studentId === subId);
    return !!s && s.docs.every(d => d.status === "approved");
  };


  const sectionMap: Record<string, () => JSX.Element> = {
    dashboard: () => <OverviewTab students={students} companies={companies} setActiveSection={setActiveSection} monthlyPlacementData={monthlyPlacementData} sectionDistribution={sectionDistribution} openReportsModal={() => setShowReportsModal(true)} />,
    students: () => <StudentsTab students={students} sections={SECTIONS} openImportModal={() => setShowImportModal(true)} />,
    companies: () => <CompaniesTab companies={companies} onManageMoa={(c) => setMoaModalCompany(c)} openUploadMoa={() => setShowMoaTemplateUpload(true)} onDelete={deleteCompany} />,
    deployment: () => <DeploymentTab students={students} />,
    attendance: () => <AttendanceTab dtrLogs={dtrLogs} />,
    journals: () => <JournalsTab journalLogs={journalLogs} />,
    evaluations: () => <EvaluationsTab evaluations={evaluations} />,
    announcements: () => <AnnouncementsTab announcements={announcements} openAddModal={() => setShowAnnouncementModal(true)} onDelete={deleteAnnouncement} />,
    documents: () => <DocumentsTab 
      templates={templates} studentSubmissions={studentSubmissions} 
      openTemplateUpload={() => setShowTemplateUpload(true)} 
      deleteTemplate={(name, slug) => {}} // TODO implement real template delete
      openReviewSubmission={(id) => setViewSubmissionId(id)} 
      openDeployModal={(id) => setShowDeployModal({ open: true, studentId: id })} 
    />,
    analytics: () => <AnalyticsTab students={students} companies={companies} overviewStats={[]} hoursProgressData={[]} monthlyPlacementData={[]} sectionDistribution={sectionDistribution} />,
    map: () => <MapTab companyLocations={companyLocations} selectedMapCompany={selectedMapCompany} setSelectedMapCompany={setSelectedMapCompany} />
  };

  return (
    <DashboardLayout
      menuItems={menuItems}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      userRole="coordinator"
      userName={user?.name || "Admin"}
    >
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 animate-in fade-in duration-500">
        {sectionMap[activeSection] ? sectionMap[activeSection]() : <div>Section not found</div>}
      </div>

      <ImportStudentsModal open={showImportModal} onClose={() => setShowImportModal(false)} onImported={reload} />
      <AddCompanyModal open={showCompanyModal} onClose={() => setShowCompanyModal(false)} />
      <AddAnnouncementModal open={showAnnouncementModal} onClose={() => setShowAnnouncementModal(false)} onAdded={() => reload()} />
      <UploadTemplateModal open={showTemplateUpload} onClose={() => setShowTemplateUpload(false)} onSave={uploadTemplate} />
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
      <GenerateReportsModal open={showReportsModal} onClose={() => setShowReportsModal(false)} students={students} companies={companies} />
    </DashboardLayout>
  );
}
