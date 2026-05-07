import { createBrowserRouter, Outlet } from "react-router";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { StudentDashboard } from "./pages/StudentDashboard";
import { CompanyDashboard } from "./pages/CompanyDashboard";
import { AdminDashboard } from "./pages/AdminDashboard";

// AuthProvider lives only in App.tsx — no duplicate wrapper here.
function Root() {
  return <Outlet />;
}

export const router = createBrowserRouter([
  {
    Component: Root,
    children: [
      { path: "/", Component: LandingPage },
      { path: "/login", Component: LoginPage },
      { path: "/register", Component: LoginPage },
      {
        element: <ProtectedRoute allowedRoles={["student"]} />,
        children: [{ path: "/student/dashboard", Component: StudentDashboard }],
      },
      {
        element: <ProtectedRoute allowedRoles={["company"]} />,
        children: [{ path: "/company/dashboard", Component: CompanyDashboard }],
      },
      {
        element: <ProtectedRoute allowedRoles={["admin"]} />,
        children: [{ path: "/admin/dashboard", Component: AdminDashboard }],
      },
    ],
  },
]);