import { Routes, Route, Navigate } from "react-router-dom";
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import ForgotPassword from "../pages/auth/ForgotPassword";
import OrganizerDashboard from "../pages/organizer/OrganizerDashboard";
import EmployeeDashboard from "../pages/employee/EmployeeDashboard"; // Added import

export default function AppRoutes() {
  return (
    <Routes>
      {/* Auth Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      {/* Dashboards */}
      <Route path="/admin/dashboard" element={<div style={{ padding: 20 }}><h2>Admin Dashboard</h2></div>} />
      <Route path="/organizer/dashboard" element={<OrganizerDashboard />} />
      <Route path="/employee/dashboard" element={<EmployeeDashboard />} /> {/* Updated route */}

      {/* Default Route redirection */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}