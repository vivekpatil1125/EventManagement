import { Routes, Route, Navigate } from "react-router-dom";
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import ForgotPassword from "../pages/auth/ForgotPassword";
import AdminDashboard from "../pages/admin/AdminDashboard";
import OrganizerDashboard from "../pages/organizer/OrganizerDashboard";
import EmployeeDashboard from "../pages/employee/EmployeeDashboard";
import ProtectedRoute from "../routes/ProtectedRoute"; // Adjust import path if needed

export default function AppRoutes() {
  return (
    <Routes>
      {/* Auth Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      {/* Protected Dashboards */}
      <Route 
        path="/admin/dashboard" 
        element={
          <ProtectedRoute allowedRole="Admin">
            <AdminDashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/organizer/dashboard" 
        element={
          <ProtectedRoute allowedRole="Organizer">
            <OrganizerDashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/employee/dashboard" 
        element={
          <ProtectedRoute allowedRole="Employee">
            <EmployeeDashboard />
          </ProtectedRoute>
        } 
      />

      {/* Default Route redirection */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}