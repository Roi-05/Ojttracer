import { useState } from "react";
import { DashboardLayout } from "../components/DashboardLayout";
import { useAuth } from "../contexts/AuthContext";
import { useCompanyData } from "../hooks/useCompanyData";

import { EvalModal } from "../components/company/EvalModal";
import { DashboardTab } from "../components/company/DashboardTab";
import { ProfileTab } from "../components/company/ProfileTab";
import { InternsTab } from "../components/company/InternsTab";
import { AccomplishmentsTab } from "../components/company/AccomplishmentsTab";
import { EvaluationsTab } from "../components/company/EvaluationsTab";
import { MoaTab } from "../components/company/MoaTab";
import { AttendanceTab } from "../components/admin/AttendanceTab";

import {
  LayoutDashboard, Building2, Users, Star, FileCheck, ShieldCheck, Clock
} from "lucide-react";

const menuItems = [
  { icon: <LayoutDashboard className="h-4 w-4" />, label: "Dashboard", value: "dashboard" },
  { icon: <Building2 className="h-4 w-4" />, label: "Company Profile", value: "profile" },
  { icon: <ShieldCheck className="h-4 w-4" />, label: "Accreditation", value: "accreditation" },
  { icon: <Users className="h-4 w-4" />, label: "My Interns", value: "interns" },
  { icon: <Clock className="h-4 w-4" />, label: "Attendance (DTR)", value: "attendance" },
  { icon: <FileCheck className="h-4 w-4" />, label: "Accomplishments", value: "accomplishments" },
  { icon: <Star className="h-4 w-4" />, label: "Evaluations", value: "evaluations" },
];

export function CompanyDashboard() {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState("dashboard");
  const [showEvalModal, setShowEvalModal] = useState<string | number | null>(null);
  const [evalScores, setEvalScores] = useState<Record<string, number>>({});
  const [evalComments, setEvalComments] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "approved" | "rejected">("all");

  const {
    companyInfo,
    interns,
    dtrLogs,
    accomplishments,
    moaTemplateUrl,
    signedMoaUrl,
    uploadSignedMoa,
    approveAccomplishment,
    rejectAccomplishment,
    submitEvaluation,
    getEvaluation,
  } = useCompanyData();

  const handleOpenEvalModal = async (id: string | number) => {
    setShowEvalModal(id);
    const existing = await getEvaluation(id);
    if (existing && existing.scores) {
      setEvalScores(existing.scores);
      setEvalComments(existing.comments || "");
    } else {
      setEvalScores({});
      setEvalComments("");
    }
  };

  const handleSubmitEval = async (e: React.FormEvent) => {
    e.preventDefault();
    const intern = interns.find(i => i.id === showEvalModal);
    const currentInternId = showEvalModal;
    setShowEvalModal(null);
    setEvalScores({});
    setEvalComments("");
    if (!intern || !currentInternId) return;
    await submitEvaluation(currentInternId, intern.name, evalScores, evalComments);
  };

  const sectionMap: Record<string, () => JSX.Element> = {
    dashboard: () => <DashboardTab companyInfo={companyInfo} interns={interns} setActiveSection={setActiveSection} />,
    profile: () => <ProfileTab companyInfo={companyInfo} />,
    accreditation: () => (
      <MoaTab
        moaStatus={companyInfo.moaStatus || 'pending'}
        moaExpiry={(companyInfo as any).accreditedUntil || '—'}
        signedMoaUrl={signedMoaUrl}
        moaTemplateUrl={moaTemplateUrl}
        onUploadSigned={uploadSignedMoa}
      />
    ),
    interns: () => <InternsTab interns={interns} />,
    attendance: () => (
      <AttendanceTab
        dtrLogs={dtrLogs}
        title="Intern Attendance (DTR)"
        subtitle="Daily time records for interns deployed to your company — expand a row to view full history"
      />
    ),
    accomplishments: () => (
      <AccomplishmentsTab
        accomplishments={accomplishments}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        onApprove={approveAccomplishment}
        onReject={rejectAccomplishment}
      />
    ),
    evaluations: () => <EvaluationsTab interns={interns} onEvaluate={(id) => handleOpenEvalModal(id)} />,
  };

  return (
    <DashboardLayout
      menuItems={menuItems}
      userRole="Company"
      userName={companyInfo.hrContact}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
    >
      <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 animate-in fade-in duration-500">
        {sectionMap[activeSection] ? sectionMap[activeSection]() : sectionMap["dashboard"]()}
      </div>

      <EvalModal
        internId={showEvalModal}
        interns={interns}
        evalScores={evalScores}
        setEvalScores={setEvalScores}
        evalComments={evalComments}
        setEvalComments={setEvalComments}
        onClose={() => { setShowEvalModal(null); setEvalScores({}); setEvalComments(""); }}
        onSubmit={handleSubmitEval}
      />
    </DashboardLayout>
  );
}
