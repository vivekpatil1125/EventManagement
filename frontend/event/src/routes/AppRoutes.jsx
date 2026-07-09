import { Routes, Route, Navigate } from "react-router-dom";
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import ForgotPassword from "../pages/auth/ForgotPassword";

export default function AppRoutes() {
  return (
    <Routes>
      {/* Auth Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      {/* Mock Dashboards (Placeholders until we build layout wrappers) */}
      <Route path="/admin/dashboard" element={<div style={{ padding: 20 }}><h2>Admin Dashboard</h2></div>} />
      <Route path="/organizer/dashboard" element={<div style={{ padding: 20 }}><h2>Organizer Dashboard</h2></div>} />
      <Route path="/employee/dashboard" element={<div style={{ padding: 20 }}><h2>Employee Dashboard</h2></div>} />

      {/* Default Route redirection */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}