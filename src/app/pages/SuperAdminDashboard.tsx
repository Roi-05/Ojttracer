import { useState, useEffect } from "react";
import { 
  LayoutDashboard, Users, GraduationCap, Building2, ShieldCheck, 
  Loader2 
} from "lucide-react";
import { DashboardLayout } from "../components/DashboardLayout";
import { OverviewTab } from "../components/superadmin/OverviewTab";
import { CoordinatorsTab } from "../components/superadmin/CoordinatorsTab";
import { SuperAdminStudentsTab } from "../components/superadmin/SuperAdminStudentsTab";
import { SuperAdminCompaniesTab } from "../components/superadmin/SuperAdminCompaniesTab";
import { useAdminData } from "../hooks/useAdminData";
import { useAuth } from "../contexts/AuthContext";
import { getCoordinators, CoordinatorItem } from "../lib/api";

const menuItems = [
  { value: "overview", label: "Overview", icon: <LayoutDashboard className="h-4 w-4" /> },
  { value: "coordinators", label: "Coordinators", icon: <Users className="h-4 w-4" /> },
  { value: "students", label: "All Students", icon: <GraduationCap className="h-4 w-4" /> },
  { value: "companies", label: "Companies", icon: <Building2 className="h-4 w-4" /> },
];

export function SuperAdminDashboard() {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState("overview");
  const { students, companies, loading: dataLoading } = useAdminData();
  const [coordinators, setCoordinators] = useState<CoordinatorItem[]>([]);
  const [coordLoading, setCoordLoading] = useState(true);

  useEffect(() => {
    getCoordinators()
      .then((data) => setCoordinators(data))
      .catch(() => setCoordinators([]))
      .finally(() => setCoordLoading(false));
  }, [activeSection]);

  const renderSection = () => {
    switch (activeSection) {
      case "overview":
        return (
          <OverviewTab
            students={students}
            companies={companies}
            coordinators={coordinators}
            onNavigate={(sec) => setActiveSection(sec)}
          />
        );
      case "coordinators":
        return <CoordinatorsTab />;
      case "students":
        return <SuperAdminStudentsTab students={students} />;
      case "companies":
        return <SuperAdminCompaniesTab companies={companies} />;
      default:
        return (
          <OverviewTab
            students={students}
            companies={companies}
            coordinators={coordinators}
            onNavigate={(sec) => setActiveSection(sec)}
          />
        );
    }
  };

  return (
    <DashboardLayout
      menuItems={menuItems}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      userRole="superadmin"
      userName={user?.name || "Super Admin"}
    >
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 animate-in fade-in duration-500">
        {dataLoading && activeSection === "overview" && coordLoading ? (
          <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-xs">Loading university data...</p>
          </div>
        ) : (
          renderSection()
        )}
      </div>
    </DashboardLayout>
  );
}

