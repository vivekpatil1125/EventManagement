import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import authService from "../../services/authService";
import "./Auth.css";
import illustration from "./illustration.png";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async (event) => {
    event.preventDefault();
    if (!token) {
      toast.error("This password reset link is invalid or expired.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const result = await authService.resetPassword({ token, newPassword });
      toast.success(result.message || "Your password has been reset.");
      navigate("/login", { replace: true });
    } catch (error) {
      toast.error(typeof error === "string" ? error : "This password reset link is invalid or expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-left">
        <div className="auth-form-container">
          <h1 className="auth-title">Choose a new password</h1>
          <p className="auth-subtitle">Your reset link is valid for 30 minutes.</p>

          <form onSubmit={handleReset} className="auth-form">
            <div className="auth-input-group">
              <label htmlFor="new-password">New password</label>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                minLength={6}
                required
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                disabled={loading || !token}
              />
            </div>

            <div className="auth-input-group">
              <label htmlFor="confirm-password">Confirm new password</label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                minLength={6}
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                disabled={loading || !token}
              />
            </div>

            <button type="submit" className="auth-btn-primary" disabled={loading || !token}>
              {loading ? "Updating password..." : "Reset password"}
            </button>

            {!token && (
              <p className="auth-prompt">
                Request a new <Link to="/forgot-password">password reset link</Link>.
              </p>
            )}
          </form>
        </div>
      </div>
      <div className="auth-right">
        <img src={illustration} alt="Password reset" className="auth-illustration" />
      </div>
    </div>
  );
}