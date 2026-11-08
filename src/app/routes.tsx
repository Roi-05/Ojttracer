import { createBrowserRouter, Outlet } from "react-router";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";

// AuthProvider lives only in App.tsx — no duplicate wrapper here.
function Root() {
  return <Outlet />;
}

// Dashboards are code-split: each role only downloads its own bundle.
export const router = createBrowserRouter([
  {
    Component: Root,
    children: [
      { path: "/", Component: LandingPage },
      { path: "/login", Component: LoginPage },
      { path: "/register", Component: LoginPage },
      { path: "/admin/login", Component: LoginPage },
      {
        element: <ProtectedRoute allowedRoles={["student"]} />,
        children: [{
          path: "/student/dashboard",
          lazy: async () => ({ Component: (await import("./pages/StudentDashboard")).StudentDashboard }),
        }],
      },
      {
        element: <ProtectedRoute allowedRoles={["company"]} />,
        children: [{
          path: "/company/dashboard",
          lazy: async () => ({ Component: (await import("./pages/CompanyDashboard")).CompanyDashboard }),
        }],
      },
      {
        element: <ProtectedRoute allowedRoles={["coordinator", "superadmin"]} />,
        children: [{
          path: "/admin/dashboard",
          lazy: async () => ({ Component: (await import("./pages/AdminDashboard")).AdminDashboard }),
        }],
      },
      {
        element: <ProtectedRoute allowedRoles={["superadmin"]} />,
        children: [{
          path: "/superadmin/dashboard",
          lazy: async () => ({ Component: (await import("./pages/SuperAdminDashboard")).SuperAdminDashboard }),
        }],
      },
    ],
  },
]);
