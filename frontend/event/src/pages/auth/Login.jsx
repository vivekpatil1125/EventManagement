import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "./Auth.css";
import illustration from "./illustration.png"; // <-- 1. IMPORT IT HERE

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [activeRole, setActiveRole] = useState("Employee");
  const [form, setForm] = useState({ email: "", password: "", remember: false });

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      toast.error("Please fill in all fields.");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      toast.success(`Logged in as ${activeRole}`);
      if (activeRole === "Admin") navigate("/admin/dashboard");
      else if (activeRole === "Organizer") navigate("/organizer/dashboard");
      else navigate("/employee/dashboard");
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-left">
        <div className="auth-form-container">
          <h1 className="auth-title">EventSync Portal</h1>
          <p className="auth-subtitle">Welcome back! Please enter your details.</p>

          <div className="auth-role-tabs">
            {["Employee", "Organizer", "Admin"].map((role) => (
              <button
                key={role}
                type="button"
                className={`auth-role-tab ${activeRole === role ? "active" : ""}`}
                onClick={() => setActiveRole(role)}
              >
                {role}
              </button>
            ))}
          </div>

          <form onSubmit={handleLogin} className="auth-form">
            <div className="auth-input-group">
              <label>Email address</label>
              <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="Enter your email" />
            </div>

            <div className="auth-input-group">
              <label>Password</label>
              <input type="password" name="password" value={form.password} onChange={handleChange} placeholder="••••••••" />
            </div>

            <div className="auth-form-actions">
              <label className="auth-remember-me">
                <input type="checkbox" name="remember" checked={form.remember} onChange={handleChange} />
                Remember for 30 days
              </label>
              <Link to="/forgot-password" className="auth-forgot-password">Forgot password?</Link>
            </div>

            <button type="submit" className="auth-btn-primary" disabled={loading}>
              {loading ? "Authenticating..." : `Sign in as ${activeRole}`}
            </button>

            {activeRole === "Employee" && (
              <p className="auth-prompt">
                Don't have an account? <Link to="/register">Sign up</Link>
              </p>
            )}
          </form>
        </div>
      </div>
      <div className="auth-right">
        {/* 2. USE IT VARIABLE STYLE HERE */}
        <img src={illustration} alt="Login Visual" className="auth-illustration" />
      </div>
    </div>
  );
}