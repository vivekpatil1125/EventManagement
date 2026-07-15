import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import authService from "../../services/authService";
import "./Auth.css";
import illustration from "./illustration.png"; 


export default function ForgotPassword() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");

  const handleResetRequest = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email address.");
      return;
    }

    setLoading(true);
    
    try {
      // Dispatches HTTP POST payload to the C# SendGrid endpoint
      await authService.forgotPassword(email);
      toast.success("Password reset link sent to your email!");
      setEmail(""); 
    } catch (error) {
      console.error("Reset request failed:", error);
      toast.error(typeof error === "string" ? error : "Failed to send reset link. Verify email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      {/* Left Column matching your CSS layout */}
      <div className="auth-left">
        <div className="auth-form-container">
          <h1 className="auth-title">Reset Password</h1>
          <p className="auth-subtitle">
            Enter your work email and we'll send you a link to reset your password.
          </p>

          <form onSubmit={handleResetRequest} className="auth-form" noValidate>
            <div className="auth-input-group">
              <label htmlFor="email-field">Email address</label>
              <input
                id="email-field"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                required
                disabled={loading}
              />
            </div>

            <button type="submit" className="auth-btn-primary" disabled={loading}>
              {loading ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                  {/* Lightweight spinning loading SVG */}
                  <svg style={{ animation: "spin 1s linear infinite" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" />
                  </svg>
                  <span>Sending Link...</span>
                </div>
              ) : (
                "Send Reset Link"
              )}
            </button>

            <p className="auth-prompt">
              Remember your password? 
              <Link to="/login">Back to sign in</Link>
            </p>
          </form>
        </div>
      </div>
      
      {/* Right Column matching your purple illustration backdrop */}
      <div className="auth-right">
        <img 
          src={illustration}
          alt="Reset Password Illustration" 
          className="auth-illustration" 
        />
      </div>
    </div>
  );
}