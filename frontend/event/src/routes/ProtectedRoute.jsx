import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children, allowedRole }) {
  const token = localStorage.getItem("token");
  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;

  // 1. If not logged in at all, redirect to login
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  // 2. If a specific role is required, verify it matches the user's role
  if (allowedRole && user.Role !== allowedRole) {
    // Redirect unauthorized users to their correct respective dashboard
    if (user.Role === "Admin") return <Navigate to="/admin/dashboard" replace />;
    if (user.Role === "Organizer") return <Navigate to="/organizer/dashboard" replace />;
    return <Navigate to="/employee/dashboard" replace />;
  }

  // 3. Authorized, render the protected component
  return children;
}