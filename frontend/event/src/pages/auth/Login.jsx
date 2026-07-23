import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import axios from "axios";
import { useAuth } from "../../context/AuthContext"; // Adjust relative path if needed
import "./Auth.css";
import illustration from "./illustration.png"; 

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeRole, setActiveRole] = useState("Employee");
  const [form, setForm] = useState({ email: "", password: "", remember: false });
  const [showPassword, setShowPassword] = useState(false);

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
    try {
      // Send credentials and active tab's role to the backend database API
      const response = await axios.post("https://localhost:7165/api/auth/login", {
        email: form.email,
        password: form.password,
        role: activeRole // Enforces strict backend cross-portal validation
      });

      toast.success(`Logged in successfully as ${activeRole}`);
      
      // Save session via AuthContext and trigger proper role-based redirection
      const token = response.data.token || response.data.Token;
      login(response.data, token);

    } catch (err) {
      // Catch backend errors (e.g., wrong password or unauthorized cross-portal login attempt)
      const errorMsg = err.response?.data?.message || "Login failed. Please check your credentials.";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
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
              <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="Enter your email" required />
            </div>

            <div className="auth-input-group">
              <label>Password</label>
              <div style={{ position: 'relative', width: '100%' }}>
                <input 
                  type={showPassword ? "text" : "password"} 
                  name="password" 
                  value={form.password} 
                  onChange={handleChange} 
                  placeholder="••••••••" 
                  style={{ width: '100%', paddingRight: '42px' }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ 
                    position: 'absolute', 
                    right: '12px', 
                    top: '50%', 
                    transform: 'translateY(-50%)', 
                    background: 'none', 
                    border: 'none', 
                    cursor: 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    color: '#71717a', 
                    padding: 0 
                  }}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
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
        <img src={illustration} alt="Login Visual" className="auth-illustration" />
      </div>
    </div>
  );
}