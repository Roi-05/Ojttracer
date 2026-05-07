import { createBrowserRouter } from "react-router";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { StudentDashboard } from "./pages/StudentDashboard";
import { CompanyDashboard } from "./pages/CompanyDashboard";
import { AdminDashboard } from "./pages/AdminDashboard";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { createElement } from "react";

function guardStudent() {
  return createElement(ProtectedRoute, { requiredRole: "student" }, createElement(StudentDashboard));
}
function guardCompany() {
  return createElement(ProtectedRoute, { requiredRole: "company" }, createElement(CompanyDashboard));
}
function guardAdmin() {
  return createElement(ProtectedRoute, { requiredRole: "admin" }, createElement(AdminDashboard));
}

export const router = createBrowserRouter([
  { path: "/", Component: LandingPage },
  { path: "/login", Component: LoginPage },
  { path: "/register", Component: LoginPage },
  { path: "/student/dashboard", Component: guardStudent },
  { path: "/company/dashboard", Component: guardCompany },
  { path: "/admin/dashboard", Component: guardAdmin },
]);
