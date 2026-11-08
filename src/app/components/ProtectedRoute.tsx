import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../contexts/AuthContext";

type Role = "student" | "company" | "coordinator" | "superadmin";

interface ProtectedRouteProps {
  children?: React.ReactNode;
  allowedRoles?: Role[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role as Role)) {
    const redirect =
      user.role === "student" ? "/student/dashboard" :
      user.role === "company" ? "/company/dashboard" :
      user.role === "superadmin" ? "/superadmin/dashboard" :
      "/admin/dashboard";
    return <Navigate to={redirect} replace />;
  }

  return <>{children ?? <Outlet />}</>;
}
