import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import "./Auth.css";

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
    setTimeout(() => {
      toast.success("Password reset link sent to your email!");
      setLoading(false);
    }, 1200);
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-left">
        <div className="auth-form-container">
          <h1 className="auth-title">Reset Password</h1>
          <p className="auth-subtitle">
            Enter your work email and we'll send you a link to reset your password.
          </p>

          <form onSubmit={handleResetRequest} className="auth-form">
            <div className="input-group">
              <label>Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                required
              />
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Sending Link..." : "Send Reset Link"}
            </button>

            <p className="auth-prompt">
              Remember your password? <Link to="/login">Back to sign in</Link>
            </p>
          </form>
        </div>
      </div>
      <div className="auth-right">
        <img src="/illustration.png" alt="Reset Visual" className="illustration" />
      </div>
    </div>
  );
}