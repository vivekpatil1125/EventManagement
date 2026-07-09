import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "./Auth.css";
import illustration from "./illustration.png"; // <-- IMPORT HERE

export default function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match!");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      toast.success("Account created successfully!");
      navigate("/login");
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-left">
        <div className="auth-form-container">
          <h1 className="auth-title">Create Account</h1>
          <p className="auth-subtitle">Join EventSync to explore and manage enterprise events.</p>

          <form onSubmit={handleRegister} className="auth-form">
            <div className="auth-input-group">
              <label>Full Name</label>
              <input type="text" name="name" value={form.name} onChange={handleChange} placeholder="John Doe" required />
            </div>

            <div className="auth-input-group">
              <label>Work Email</label>
              <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="name@company.com" required />
            </div>

            <div className="auth-input-group">
              <label>Password</label>
              <input type="password" name="password" value={form.password} onChange={handleChange} placeholder="••••••••" required />
            </div>

            <div className="auth-input-group">
              <label>Confirm Password</label>
              <input type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} placeholder="••••••••" required />
            </div>

            <button type="submit" className="auth-btn-primary" disabled={loading}>
              {loading ? "Creating Account..." : "Sign up"}
            </button>

            <p className="auth-prompt">
              Already have an account? <Link to="/login">Sign in</Link>
            </p>
          </form>
        </div>
      </div>
      <div className="auth-right">
        <img src={illustration} alt="Register Visual" className="auth-illustration" />
      </div>
    </div>
  );
}