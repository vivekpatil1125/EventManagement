import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import './AdminDashboard.css';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    users: 0,
    events: 0,
    registrations: 0,
    announcements: 0
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const BACKEND_URL = "https://localhost:7165"; // Match your C# backend port

  useEffect(() => {
    const fetchAdminMetrics = async () => {
      try {
        const token = localStorage.getItem("token");
        const config = {
          headers: { Authorization: `Bearer ${token}` }
        };

        // Fetch counts in parallel from backend endpoints
        const [usersRes, eventsRes, regsRes, announcementsRes] = await Promise.all([
          axios.get(`${BACKEND_URL}/api/users`, config).catch(() => ({ data: [] })),
          axios.get(`${BACKEND_URL}/api/events`, config).catch(() => ({ data: [] })),
          axios.get(`${BACKEND_URL}/api/registrations`, config).catch(() => ({ data: [] })),
          axios.get(`${BACKEND_URL}/api/announcements`, config).catch(() => ({ data: [] }))
        ]);

        setStats({
          users: usersRes.data.length || 0,
          events: eventsRes.data.length || 0,
          registrations: regsRes.data.length || 0,
          announcements: announcementsRes.data.length || 0
        });
      } catch (err) {
        setError("Failed to fetch administrative records from database.");
      } finally {
        setLoading(false);
      }
    };

    fetchAdminMetrics();
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  return (
    <div className="db-layout">
      {/* Sidebar */}
      <aside className="db-sidebar">
        <div>
          <div className="sidebar-header">
            <div className="logo-box">A</div>
            <div className="logo-text">
              <h1>EventSync</h1>
              <span>ADMINISTRATOR</span>
            </div>
          </div>
          <nav className="sidebar-nav">
            <button className="nav-btn active">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              Dashboard
            </button>
            <button className="nav-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              Users
            </button>
            <button className="nav-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              Events
            </button>
            <button className="nav-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              Registrations
            </button>
            <button className="nav-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              Announcements
            </button>
          </nav>
        </div>
        <div className="sidebar-footer">
          <button className="nav-btn logout-btn" onClick={handleLogout}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="db-main">
        <header className="db-header" style={{ padding: "16px 32px" }}>
          <div className="header-title">
            <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", letterSpacing: "0.05em" }}>EVENTSYNC CONTROL PANEL</span>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "800", margin: "2px 0 0 0", color: "#0f172a" }}>System Overview</h2>
          </div>
          <div className="header-actions">
            <div className="search-container">
              <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" placeholder="Search database..." className="search-input" />
            </div>
            <div className="user-profile">
              <div className="avatar" style={{ background: "#dc2626" }}>A</div>
              <div>
                <div style={{ fontSize: "0.9rem", fontWeight: "700", color: "#0f172a" }}>System Admin</div>
                <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "600" }}>Superuser</div>
              </div>
            </div>
          </div>
        </header>

        <div className="dashboard-content" style={{ padding: "32px", overflowY: "auto" }}>
          {error && (
            <div style={{ color: "#dc2626", background: "#fee2e2", padding: "14px 20px", borderRadius: "10px", marginBottom: "24px", border: "1px solid #fecaca", fontWeight: "600", fontSize: "0.9rem" }}>
              {error}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "24px", marginBottom: "32px" }}>
            <div style={{ background: "#fff", padding: "24px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", letterSpacing: "0.05em" }}>TOTAL USERS</span>
              <h2 style={{ fontSize: "2.2rem", fontWeight: "800", color: "#0f172a", margin: "8px 0 0 0" }}>{loading ? "..." : stats.users}</h2>
            </div>
            <div style={{ background: "#fff", padding: "24px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", letterSpacing: "0.05em" }}>TOTAL EVENTS</span>
              <h2 style={{ fontSize: "2.2rem", fontWeight: "800", color: "#0f172a", margin: "8px 0 0 0" }}>{loading ? "..." : stats.events}</h2>
            </div>
            <div style={{ background: "#fff", padding: "24px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", letterSpacing: "0.05em" }}>REGISTRATIONS</span>
              <h2 style={{ fontSize: "2.2rem", fontWeight: "800", color: "#0f172a", margin: "8px 0 0 0" }}>{loading ? "..." : stats.registrations}</h2>
            </div>
            <div style={{ background: "#fff", padding: "24px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", letterSpacing: "0.05em" }}>ANNOUNCEMENTS</span>
              <h2 style={{ fontSize: "2.2rem", fontWeight: "800", color: "#0f172a", margin: "8px 0 0 0" }}>{loading ? "..." : stats.announcements}</h2>
            </div>
          </div>

          {/* Quick Actions Card */}
          <div style={{ background: "#fff", padding: "28px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: "700", color: "#0f172a", margin: "0 0 16px 0" }}>Quick System Actions</h3>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <button style={{ background: "#2563eb", color: "#fff", border: "none", padding: "10px 18px", borderRadius: "8px", fontWeight: "600", cursor: "pointer" }}>+ Add New User</button>
              <button style={{ background: "#7c3aed", color: "#fff", border: "none", padding: "10px 18px", borderRadius: "8px", fontWeight: "600", cursor: "pointer" }}>+ Create Event</button>
              <button style={{ background: "#d97706", color: "#fff", border: "none", padding: "10px 18px", borderRadius: "8px", fontWeight: "600", cursor: "pointer" }}>Broadcast Announcement</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}