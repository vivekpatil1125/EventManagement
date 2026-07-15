import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import authService from "../../services/authService";
import "./Auth.css";
import illustration from "./illustration.png"; 

export default function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: "" });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!form.name.trim()) {
      newErrors.name = "Full name is required.";
    } else if (form.name.trim().length < 2) {
      newErrors.name = "Full name must be at least 2 characters long.";
    }

    if (!form.email.trim()) {
      newErrors.email = "Work email is required.";
    } else if (!emailRegex.test(form.email)) {
      newErrors.email = "Please enter a valid email address.";
    }

    if (!form.password) {
      newErrors.password = "Password is required.";
    } else if (form.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters long.";
    }

    if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match!";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error("Please satisfy all field validation rules.");
      return;
    }

    setLoading(true);

    try {
      // FIX: Groups form variables into the exact object payload structure your authService expects
      await authService.register({
        fullName: form.name,
        workEmail: form.email,
        password: form.password
      });
      
      toast.success("Account created successfully!");
      navigate("/login");
    } catch (error) {
      console.error("Registration failed:", error);
      
      // FIX: Maps the error properties directly from the object thrown by authService.js
      if (error && error.errors) {
        const backendErrors = error.errors;
        const mappedErrors = {};

        if (backendErrors.FullName) mappedErrors.name = backendErrors.FullName.join(" ");
        if (backendErrors.Email) mappedErrors.email = backendErrors.Email.join(" ");
        if (backendErrors.Password) mappedErrors.password = backendErrors.Password.join(" ");

        setErrors(mappedErrors);
        toast.error("Registration failed. Please satisfy backend validation rules.");
      } else {
        const errorMsg = error?.message || (typeof error === 'string' ? error : "Registration failed.");
        toast.error(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-left">
        <div className="auth-form-container">
          <h1 className="auth-title">Create Account</h1>
          <p className="auth-subtitle">Join EventSync to explore and manage enterprise events.</p>

          <form onSubmit={handleRegister} className="auth-form" noValidate>
            <div className="auth-input-group">
              <label>Full Name</label>
              <input 
                type="text" 
                name="name" 
                value={form.name} 
                onChange={handleChange} 
                placeholder="John Doe" 
                style={errors.name ? { borderColor: '#d92d20' } : {}}
              />
              {errors.name && <span style={{ color: '#d92d20', fontSize: '0.825rem', marginTop: '6px', fontWeight: '500' }}>{errors.name}</span>}
            </div>

            <div className="auth-input-group">
              <label>Work Email</label>
              <input 
                type="email" 
                name="email" 
                value={form.email} 
                onChange={handleChange} 
                placeholder="name@company.com" 
                style={errors.email ? { borderColor: '#d92d20' } : {}}
              />
              {errors.email && <span style={{ color: '#d92d20', fontSize: '0.825rem', marginTop: '6px', fontWeight: '500' }}>{errors.email}</span>}
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
                  style={{ 
                    width: '100%', 
                    paddingRight: '42px',
                    ...(errors.password ? { borderColor: '#d92d20' } : {})
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#71717a', padding: 0 }}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
              {errors.password && <span style={{ color: '#d92d20', fontSize: '0.825rem', marginTop: '6px', fontWeight: '500' }}>{errors.password}</span>}
            </div>

            <div className="auth-input-group">
              <label>Confirm Password</label>
              <div style={{ position: 'relative', width: '100%' }}>
                <input 
                  type={showConfirmPassword ? "text" : "password"} 
                  name="confirmPassword" 
                  value={form.confirmPassword} 
                  onChange={handleChange} 
                  placeholder="••••••••" 
                  style={{ 
                    width: '100%', 
                    paddingRight: '42px',
                    ...(errors.confirmPassword ? { borderColor: '#d92d20' } : {})
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#71717a', padding: 0 }}
                >
                  {showConfirmPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
              {errors.confirmPassword && <span style={{ color: '#d92d20', fontSize: '0.825rem', marginTop: '6px', fontWeight: '500' }}>{errors.confirmPassword}</span>}
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