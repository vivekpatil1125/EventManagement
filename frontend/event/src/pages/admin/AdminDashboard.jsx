import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { BrowserQRCodeReader } from "@zxing/browser";
import { reviewService } from "../../services/api";
import { useAuth } from "../../context/AuthContext"; // Import AuthContext
import './AdminDashboard.css';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const authContext = useAuth ? useAuth() : {};
  const user = authContext?.user;
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [eventsView, setEventsView] = useState('calendar');
  const [events, setEvents] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [organizers, setOrganizers] = useState([]);
  const [organizersUnavailable, setOrganizersUnavailable] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [announcementForm, setAnnouncementForm] = useState({ title: '', eventId: '', body: '' });
  const [announcementSubmitting, setAnnouncementSubmitting] = useState(false);
  const [announcementMessage, setAnnouncementMessage] = useState('');
  const [scannerActive, setScannerActive] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanMessage, setScanMessage] = useState('');
  const [scanMessageType, setScanMessageType] = useState('');
  const scannerVideoRef = useRef(null);
  const scanLockRef = useRef(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(null);

  const [stats, setStats] = useState({
    users: 0,
    events: 0,
    registrations: 0,
    announcements: 0
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState({
    name: '',
    email: '',
    role: ''
  });

  const BACKEND_URL = "https://localhost:7165"; // Match your C# backend port

  // Dynamic user details fallback
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const displayName = 
    user?.fullName || 
    user?.FullName || 
    user?.name || 
    currentUser.name || 
    storedUser?.fullName || 
    storedUser?.FullName || 
    "System Admin";

  const displayRole = 
    user?.role || 
    user?.Role || 
    currentUser.role || 
    storedUser?.role || 
    storedUser?.Role || 
    "Administrator";

  useEffect(() => {
    // Extract user details from JWT token if available
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const base64Url = token.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split("")
            .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
            .join("")
        );
        const payload = JSON.parse(jsonPayload);

        const extractedName =
          payload.name ||
          payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] ||
          payload.unique_name ||
          payload.sub ||
          "System Admin";

        const extractedRole =
          payload.role ||
          payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ||
          "Administrator";

        setCurrentUser({
          name: extractedName,
          email: payload.email || "",
          role: extractedRole
        });
      } catch (err) {
        console.error("Failed to decode token:", err);
      }
    }

    const fetchAdminMetrics = async () => {
      try {
        const config = {
          headers: { Authorization: `Bearer ${token}` }
        };

        // Fetch counts in parallel from backend endpoints
        const [usersRes, eventsRes, regsRes, announcementsRes, reviewsRes] = await Promise.all([
          axios.get(`${BACKEND_URL}/api/users`, config).catch((requestError) => {
            console.error("Failed to load organizer details:", requestError);
            setOrganizersUnavailable(true);
            setError((currentError) => currentError || (
              requestError.response?.status === 404
                ? "The organizer API is not available in the running backend. Restart the backend using the latest build to show organizer details."
                : "Failed to load organizer details. Event data is available, but organizers could not be displayed."
            ));
            return { data: [], failed: true };
          }),
          axios.get(`${BACKEND_URL}/api/events`, config).catch((requestError) => {
            console.error("Failed to load events:", requestError);
            setError("Failed to load events from the server.");
            return { data: [], failed: true };
          }),
          axios.get(`${BACKEND_URL}/api/registrations`, config).catch((requestError) => {
            console.error("Failed to load registrations:", requestError);
            setError((currentError) => currentError || "Attendee totals are unavailable because registrations could not be loaded.");
            return { data: [], failed: true };
          }),
          axios.get(`${BACKEND_URL}/api/announcements`, config).catch((requestError) => {
            console.error("Failed to load announcements:", requestError);
            setError((currentError) => currentError || "Announcements could not be loaded.");
            return { data: [], failed: true };
          }),
          reviewService.getAll().catch((requestError) => {
            console.error("Failed to load event reviews:", requestError);
            setError((currentError) => currentError || "Average ratings are unavailable because event reviews could not be loaded.");
            return { data: [], failed: true };
          })
        ]);

        const eventList = Array.isArray(eventsRes.data) ? eventsRes.data : [];
        const organizerList = Array.isArray(usersRes.data) ? usersRes.data : [];
        const registrationList = Array.isArray(regsRes.data) ? regsRes.data : [];
        const announcementList = Array.isArray(announcementsRes.data) ? announcementsRes.data : [];
        const reviewList = Array.isArray(reviewsRes.data) ? reviewsRes.data : [];
        setOrganizersUnavailable(Boolean(usersRes.failed));
        setEvents(eventList.map((event) => ({
          id: event.id ?? event.Id,
          name: event.title || event.Title || event.name || event.Name || 'Untitled event',
          department: event.department || event.Department || 'General',
          date: event.date || event.Date || '',
          location: event.location || event.Location || 'Location unavailable',
          status: event.status || event.Status || ''
        })));
        setOrganizers(organizerList.filter((organizer) =>
          organizer.role === 3 || organizer.role === 'Organizer' || organizer.role === 'organizer'
        ));
        setRegistrations(registrationList);
        setReviews(reviewList);
        setAnnouncements(announcementList);

        setStats({
          users: organizerList.filter((account) =>
            account.role === 2 || account.role === 3 ||
            account.role === 'Employee' || account.role === 'Organizer' ||
            account.role === 'employee' || account.role === 'organizer'
          ).length,
          events: eventList.length || 0,
          registrations: registrationList.length,
          announcements: announcementList.length
        });
      } catch (err) {
        setError("We couldn’t load the administration overview. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchAdminMetrics();
  }, []);

  const handleScannedQr = useCallback(async (rawValue) => {
    const ticketMatch = rawValue.trim().match(/^ES-PASS:([^|]+)\|/);
    if (!ticketMatch) {
      setScanMessage('This QR code is not a valid EventSync employee pass.');
      setScanMessageType('error');
      return;
    }

    const registrationId = ticketMatch[1].trim();
    setScanLoading(true);
    setScanMessage('Verifying ticket and marking attendance...');
    setScanMessageType('info');

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${BACKEND_URL}/api/registrations/${encodeURIComponent(registrationId)}/check-in`,
        {},
        { headers: { Authorization: ['Bearer', token].join(' ') } }
      );
      const checkedInAt = response.data.checkedInAt;
      setRegistrations((current) => current.map((registration) =>
        String(registration.id ?? registration.Id) === registrationId
          ? { ...registration, isCheckedIn: true, IsCheckedIn: true, checkedInAt, CheckedInAt: checkedInAt }
          : registration
      ));
      setScanMessage(response.data.message || 'Attendance marked successfully.');
      setScanMessageType('success');
    } catch (requestError) {
      console.error('Failed to check in scanned ticket:', requestError);
      setScanMessage(requestError.response?.data?.message || 'Unable to mark attendance for this ticket.');
      setScanMessageType('error');
    } finally {
      setScanLoading(false);
    }
  }, [BACKEND_URL]);

  useEffect(() => {
    if (activeTab !== 'Check-in Scanner' || !scannerActive || !scannerVideoRef.current) return undefined;

    const reader = new BrowserQRCodeReader();
    let controls;
    let disposed = false;
    scanLockRef.current = false;
    setScanMessage('Starting camera...');
    setScanMessageType('info');

    reader.decodeFromVideoDevice(undefined, scannerVideoRef.current, (result) => {
      if (!result || scanLockRef.current) return;
      scanLockRef.current = true;
      setScannerActive(false);
      handleScannedQr(result.getText());
    }).then((videoControls) => {
      controls = videoControls;
      if (disposed) controls.stop();
      else if (!scanLockRef.current) {
        setScanMessage('Camera ready. Hold the employee pass QR code in front of the camera.');
        setScanMessageType('info');
      }
    }).catch((scannerError) => {
      if (disposed) return;
      console.error('Unable to start QR scanner:', scannerError);
      setScannerActive(false);
      setScanMessage('Camera access is unavailable. Allow camera access and try again.');
      setScanMessageType('error');
    });

    return () => {
      disposed = true;
      controls?.stop();
      reader.reset();
    };
  }, [activeTab, scannerActive, handleScannedQr]);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const eventDate = (event) => {
    const parsed = new Date(event.date);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };
  const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthStart = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - monthStart.getDay());
  const calendarDays = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return date;
  });
  const selectedDateEvents = selectedDate
    ? events.filter((event) => {
      const date = eventDate(event);
      return date && dateKey(date) === selectedDate;
    })
    : [];
  const organizersForEvent = (event) => organizers.filter((organizer) =>
    (organizer.department || '').trim().toLowerCase() === (event.department || '').trim().toLowerCase()
  );
  const departmentReports = events.reduce((groups, event) => {
    const departmentName = (event.department || 'General').trim() || 'General';
    const group = groups.find((item) => item.name.toLowerCase() === departmentName.toLowerCase());
    const attendees = registrations.filter((registration) =>
      Number(registration.eventId ?? registration.EventId ?? registration.event?.id ?? registration.Event?.Id) === Number(event.id)
    ).length;
    const eventReviews = reviews.filter((review) =>
      Number(review.eventId ?? review.EventId) === Number(event.id)
    );
    const ratingTotal = eventReviews.reduce((total, review) => total + Number(review.rating ?? review.Rating ?? 0), 0);
    const eventReport = {
      ...event,
      attendees,
      reviewCount: eventReviews.length,
      averageRating: eventReviews.length ? ratingTotal / eventReviews.length : null
    };
    if (group) {
      group.events.push(eventReport);
    } else {
      groups.push({ name: departmentName, events: [eventReport] });
    }
    return groups;
  }, []).sort((left, right) => left.name.localeCompare(right.name));
  const selectedDepartmentReport = departmentReports.find((group) => group.name === selectedDepartment);
  const eventStatusCounts = events.reduce((counts, event) => {
    const date = eventDate(event);
    if (date && date < today) counts.expired += 1;
    else counts.upcoming += 1;
    return counts;
  }, { upcoming: 0, expired: 0 });
  const averageRating = reviews.length
    ? reviews.reduce((total, review) => total + Number(review.rating ?? review.Rating ?? 0), 0) / reviews.length
    : null;
  const departmentMaxEvents = Math.max(...departmentReports.map((group) => group.events.length), 1);

  const handleAnnouncementSubmit = async (submitEvent) => {
    submitEvent.preventDefault();
    setAnnouncementMessage('');
    setAnnouncementSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(`${BACKEND_URL}/api/announcements`, {
        title: announcementForm.title.trim(),
        eventId: Number(announcementForm.eventId),
        body: announcementForm.body.trim()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAnnouncements((current) => [response.data, ...current]);
      setStats((current) => ({ ...current, announcements: current.announcements + 1 }));
      setAnnouncementForm({ title: '', eventId: '', body: '' });
      setAnnouncementMessage('Announcement published to organizers and employees.');
    } catch (requestError) {
      console.error('Failed to publish announcement:', requestError);
      setAnnouncementMessage(requestError.response?.data?.message || 'Announcement could not be published. Please try again.');
    } finally {
      setAnnouncementSubmitting(false);
    }
  };

  return (
    <div className="db-layout">
      {/* Sidebar */}
      <aside className="db-sidebar">
        <div>
          <div className="sidebar-header">
            <div className="logo-box">
              {displayName ? displayName.charAt(0).toUpperCase() : "A"}
            </div>
            <div className="logo-text">
              <h1>EventSync</h1>
              <span>ADMINISTRATOR</span>
            </div>
          </div>
          <nav className="sidebar-nav">
            <button className={`nav-btn ${activeTab === 'Dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('Dashboard')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              Dashboard
            </button>
            <button className={`nav-btn ${activeTab === 'Event Schedules' ? 'active' : ''}`} onClick={() => setActiveTab('Event Schedules')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              Event Schedules
            </button>
            <button className={`nav-btn ${activeTab === 'Events' ? 'active' : ''}`} onClick={() => { setActiveTab('Events'); setSelectedDepartment(null); }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              Events
            </button>
            <button className={`nav-btn ${activeTab === 'Check-in Scanner' ? 'active' : ''}`} onClick={() => setActiveTab('Check-in Scanner')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM20 14v2M14 20h2M20 19v2"/></svg>
              Check-in Scanner
            </button>
            <button className={`nav-btn ${activeTab === 'Announcements' ? 'active' : ''}`} onClick={() => setActiveTab('Announcements')}>
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
            <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", letterSpacing: "0.05em" }}>EVENTSYNC · ADMINISTRATION</span>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "800", margin: "2px 0 0 0", color: "#0f172a" }}>
              {{
                Dashboard: 'Overview',
                'Event Schedules': 'Event schedule',
                Events: 'Department reports',
                'Check-in Scanner': 'Attendance check-in',
                Announcements: 'Announcements'
              }[activeTab] || activeTab}
            </h2>
          </div>
          <div className="header-actions">
            <div className="search-container">
              <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" placeholder="Search records..." className="search-input" />
            </div>

            {/* DYNAMIC ADMIN USER PROFILE */}
            <div className="user-profile">
              <div className="avatar" style={{ background: "#dc2626" }}>
                {displayName ? displayName.charAt(0).toUpperCase() : "A"}
              </div>
              <div>
                <div style={{ fontSize: "0.9rem", fontWeight: "700", color: "#0f172a" }}>
                  {displayName}
                </div>
                <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "600", textTransform: "capitalize" }}>
                  {displayRole}
                </div>
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

          {activeTab === 'Dashboard' && (
            <section className="admin-report">
              <div className="admin-kpi-grid">
                {[
                  { label: 'People', value: stats.users, note: 'Employees and organizers', tone: 'blue' },
                  { label: 'Events', value: stats.events, note: `${eventStatusCounts.upcoming} upcoming · ${eventStatusCounts.expired} expired`, tone: 'violet' },
                  { label: 'Attendees', value: stats.registrations, note: 'Total event registrations', tone: 'green' },
                  { label: 'Average rating', value: averageRating === null ? '—' : `${averageRating.toFixed(1)} / 5`, note: `${reviews.length} attendee reviews`, tone: 'amber' },
                  { label: 'Announcements', value: stats.announcements, note: 'Organization-wide updates', tone: 'rose' }
                ].map((kpi) => (
                  <article className={`admin-kpi-card ${kpi.tone}`} key={kpi.label}>
                    <span>{kpi.label}</span>
                    <strong>{loading ? '…' : kpi.value}</strong>
                    <small>{kpi.note}</small>
                  </article>
                ))}
              </div>
              <div className="admin-report-grid">
                <section className="admin-report-card">
                  <div className="admin-report-card-heading">
                    <div><span className="admin-events-eyebrow">EVENT DISTRIBUTION</span><h3>Events by department</h3></div>
                    <button type="button" onClick={() => setActiveTab('Events')}>View report <span aria-hidden="true">→</span></button>
                  </div>
                  {departmentReports.length ? (
                    <div className="admin-department-chart">
                      {departmentReports.map((group) => (
                        <div className="admin-department-bar-row" key={group.name}>
                          <span title={group.name}>{group.name}</span>
                          <div className="admin-department-bar-track"><i style={{ width: `${Math.max((group.events.length / departmentMaxEvents) * 100, 4)}%` }} /></div>
                          <strong>{group.events.length}</strong>
                        </div>
                      ))}
                    </div>
                  ) : <p className="admin-report-empty">No event data available yet.</p>}
                </section>
                <section className="admin-report-card">
                  <div className="admin-report-card-heading">
                    <div><span className="admin-events-eyebrow">PORTFOLIO HEALTH</span><h3>Event status</h3></div>
                  </div>
                  <div className="admin-status-chart">
                    <div
                      className="admin-status-total"
                      style={{ background: stats.events ? `conic-gradient(#16a34a 0% ${(eventStatusCounts.upcoming / stats.events) * 100}%, #dc2626 ${(eventStatusCounts.upcoming / stats.events) * 100}% 100%)` : '#e2e8f0' }}
                    >
                      <strong>{stats.events}</strong><span>Total events</span>
                    </div>
                    <div className="admin-status-legend">
                      <div><i className="upcoming-dot" /><span>Upcoming</span><strong>{eventStatusCounts.upcoming}</strong></div>
                      <div><i className="expired-dot" /><span>Expired</span><strong>{eventStatusCounts.expired}</strong></div>
                    </div>
                  </div>
                </section>
              </div>
              <div className="admin-report-footer">
                <span>Report updated from current events, registrations and attendee reviews.</span>
                <button type="button" onClick={() => setActiveTab('Announcements')}>Create announcement</button>
              </div>
            </section>
          )}

          {activeTab === 'Check-in Scanner' && (
            <section className="admin-qr-checkin">
              <div className="admin-events-heading">
                <div>
                  <span className="admin-events-eyebrow">ATTENDANCE</span>
                  <h3>Scan employee pass</h3>
                  <p>Scan an EventSync ticket QR code to mark the registration as checked in.</p>
                </div>
              </div>
              <div className="admin-qr-scanner-card">
                {scannerActive
                  ? <video className="admin-qr-scanner-video" ref={scannerVideoRef} autoPlay muted playsInline />
                  : <div className="admin-qr-scanner-placeholder">Camera scanner is stopped.</div>}
                <div className="admin-qr-scanner-controls">
                  <button
                    type="button"
                    className="admin-qr-start-button"
                    disabled={scannerActive || scanLoading}
                    onClick={() => {
                      setScanMessage('');
                      setScannerActive(true);
                    }}
                  >
                    {scanLoading ? 'Processing check-in...' : scannerActive ? 'Scanner active' : 'Start scanner'}
                  </button>
                  {scannerActive && (
                    <button type="button" className="admin-qr-stop-button" onClick={() => setScannerActive(false)}>
                      Stop scanner
                    </button>
                  )}
                </div>
                {scanMessage && <p className={`admin-qr-scan-message ${scanMessageType}`} role="status">{scanMessage}</p>}
              </div>
            </section>
          )}

          {activeTab === 'Event Schedules' && (
            <section className="admin-events">
              <div className="admin-events-heading">
                <div>
                  <span className="admin-events-eyebrow">ORGANIZATION SCHEDULE</span>
                  <h3>All events</h3>
                  <p>{events.length} {events.length === 1 ? 'event' : 'events'} across all departments</p>
                </div>
                <div className="admin-view-switch" role="tablist" aria-label="Event views">
                  <button type="button" role="tab" aria-selected={eventsView === 'calendar'} className={eventsView === 'calendar' ? 'selected' : ''} onClick={() => setEventsView('calendar')}>
                    <span aria-hidden="true">▦</span> Calendar
                  </button>
                  <button type="button" role="tab" aria-selected={eventsView === 'list'} className={eventsView === 'list' ? 'selected' : ''} onClick={() => setEventsView('list')}>
                    <span aria-hidden="true">☷</span> List
                  </button>
                </div>
              </div>

              {eventsView === 'calendar' ? (
                <div className="admin-calendar">
                  <div className="admin-calendar-toolbar">
                    <div>
                      <h4>{calendarMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h4>
                      <p>Select a date to view its event schedule</p>
                    </div>
                    <div className="admin-calendar-nav">
                      <button type="button" aria-label="Previous month" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}>‹</button>
                      <button type="button" onClick={() => setCalendarMonth(new Date(today.getFullYear(), today.getMonth(), 1))}>Today</button>
                      <button type="button" aria-label="Next month" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}>›</button>
                    </div>
                  </div>
                  <div className="admin-calendar-grid admin-calendar-weekdays">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <div key={day}>{day}</div>)}
                  </div>
                  <div className="admin-calendar-grid admin-calendar-days">
                    {calendarDays.map((date) => {
                      const key = dateKey(date);
                      const dayEvents = events.filter((event) => {
                        const parsed = eventDate(event);
                        return parsed && dateKey(parsed) === key;
                      });
                      const inMonth = date.getMonth() === calendarMonth.getMonth();
                      const isExpiredDay = date < today;
                      return (
                        <button
                          type="button"
                          key={key}
                          className={`admin-calendar-day ${inMonth ? '' : 'outside-month'} ${key === dateKey(today) ? 'is-today' : ''} ${selectedDate === key ? 'is-selected' : ''}`}
                          onClick={() => setSelectedDate(dayEvents.length ? key : null)}
                          aria-label={`${date.toLocaleDateString()}${dayEvents.length ? `, ${dayEvents.length} events` : ', no events'}`}
                          aria-pressed={selectedDate === key}
                        >
                          <span className="admin-calendar-date">{date.getDate()}</span>
                          {dayEvents.slice(0, 2).map((event, index) => (
                            <span key={`${event.id}-${index}`} className={`admin-calendar-event ${isExpiredDay ? 'expired' : 'upcoming'}`}>
                              {event.name}
                            </span>
                          ))}
                          {dayEvents.length > 2 && <span className="admin-calendar-more">+{dayEvents.length - 2} more</span>}
                        </button>
                      );
                    })}
                  </div>
                  <div className="admin-calendar-legend">
                    <span><i className="upcoming-dot" /> Upcoming</span>
                    <span><i className="expired-dot" /> Expired</span>
                  </div>
                </div>
              ) : (
                <div className="admin-event-list-wrap">
                  <table className="admin-event-table">
                    <thead>
                      <tr><th>Event</th><th>Department</th><th>Date</th><th>Location</th><th>Organizer</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {events.map((event, index) => {
                        const date = eventDate(event);
                        const expired = date && date < today;
                        const assignedOrganizers = organizersForEvent(event);
                        return (
                          <tr key={event.id ?? `${event.name}-${index}`}>
                            <td><strong>{event.name}</strong></td>
                            <td><span className="admin-department-tag">{event.department}</span></td>
                            <td>{date ? date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Date unavailable'}</td>
                            <td>{event.location}</td>
                            <td>
                              {assignedOrganizers.length
                                ? assignedOrganizers.map((organizer) => <div className="admin-organizer" key={organizer.id}><strong>{organizer.name}</strong><span>{organizer.email}</span></div>)
                                : <span className="admin-no-organizer">{organizersUnavailable ? 'Organizer details unavailable' : 'No organizer assigned'}</span>}
                            </td>
                            <td><span className={`admin-event-status ${expired ? 'expired' : 'upcoming'}`}>{expired ? 'Expired' : (event.status || 'Upcoming')}</span></td>
                          </tr>
                        );
                      })}
                      {events.length === 0 && <tr><td colSpan="6" className="admin-no-events">No events found.</td></tr>}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {activeTab === 'Events' && (
            <section className="admin-department-reports">
              <div className="admin-events-heading">
                <div>
                  <span className="admin-events-eyebrow">DEPARTMENT PERFORMANCE</span>
                  <h3>{selectedDepartmentReport ? `${selectedDepartmentReport.name} report` : 'Events by department'}</h3>
                  <p>{selectedDepartmentReport
                    ? `${selectedDepartmentReport.events.length} events · attendee and review summary`
                    : 'Select a department to view attendee counts and event ratings.'}</p>
                </div>
                {selectedDepartmentReport && (
                  <button className="admin-back-button" type="button" onClick={() => setSelectedDepartment(null)}>← All departments</button>
                )}
              </div>

              {selectedDepartmentReport ? (
                <div className="admin-event-list-wrap">
                  <table className="admin-event-table">
                    <thead>
                      <tr><th>Event</th><th>Date</th><th>Organizer</th><th>Attendees</th><th>Average rating</th><th>Reviews</th></tr>
                    </thead>
                    <tbody>
                      {selectedDepartmentReport.events.map((event, index) => {
                        const date = eventDate(event);
                        const assignedOrganizers = organizersForEvent(event);
                        return (
                          <tr key={event.id ?? `${event.name}-${index}`}>
                            <td><strong>{event.name}</strong><span className={`admin-event-status ${date && date < today ? 'expired' : 'upcoming'}`}>{date && date < today ? 'Expired' : 'Upcoming'}</span></td>
                            <td>{date ? date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Date unavailable'}</td>
                            <td>{assignedOrganizers.length
                              ? assignedOrganizers.map((organizer) => <div className="admin-organizer" key={organizer.id}><strong>{organizer.name}</strong><span>{organizer.email}</span></div>)
                              : <span className="admin-no-organizer">{organizersUnavailable ? 'Organizer details unavailable' : 'No organizer assigned'}</span>}</td>
                            <td><strong>{event.attendees}</strong></td>
                            <td>{event.averageRating === null
                              ? <span className="admin-no-organizer">No ratings yet</span>
                              : <span className="admin-rating-value">★ {event.averageRating.toFixed(1)} <small>/ 5</small></span>}</td>
                            <td>{event.reviewCount}</td>
                          </tr>
                        );
                      })}
                      {selectedDepartmentReport.events.length === 0 && <tr><td colSpan="6" className="admin-no-events">No events in this department.</td></tr>}
                    </tbody>
                  </table>
                </div>
              ) : departmentReports.length ? (
                <div className="admin-department-cards">
                  {departmentReports.map((department) => {
                    const attendees = department.events.reduce((total, event) => total + event.attendees, 0);
                    const reviewCount = department.events.reduce((total, event) => total + event.reviewCount, 0);
                    const departmentRating = reviewCount
                      ? department.events.reduce((total, event) => total + (event.averageRating || 0) * event.reviewCount, 0) / reviewCount
                      : null;
                    return (
                      <button className="admin-department-card" type="button" key={department.name} onClick={() => setSelectedDepartment(department.name)}>
                        <span className="admin-department-card-icon" aria-hidden="true">{department.name.charAt(0).toUpperCase()}</span>
                        <span className="admin-department-card-main">
                          <strong>{department.name}</strong>
                          <small>{department.events.length} {department.events.length === 1 ? 'event' : 'events'}</small>
                        </span>
                        <span className="admin-department-card-metric"><strong>{attendees}</strong><small>attendees</small></span>
                        <span className="admin-department-card-metric"><strong>{departmentRating === null ? '—' : `★ ${departmentRating.toFixed(1)}`}</strong><small>avg. rating</small></span>
                        <span className="admin-department-card-arrow" aria-hidden="true">→</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="admin-report-empty-panel">No department event data is available.</div>
              )}
            </section>
          )}

          {activeTab === 'Announcements' && (
            <section className="admin-announcements">
              <div className="admin-events-heading">
                <div>
                  <span className="admin-events-eyebrow">ORGANIZATION-WIDE COMMUNICATION</span>
                  <h3>Announcements</h3>
                  <p>Announcements are visible to both organizers and employees.</p>
                </div>
              </div>
              <div className="admin-announcement-grid">
                <form className="admin-announcement-form" onSubmit={handleAnnouncementSubmit}>
                  <h4>Publish an announcement</h4>
                  <label htmlFor="admin-announcement-title">Announcement title</label>
                  <input id="admin-announcement-title" required maxLength="150" value={announcementForm.title} onChange={(event) => setAnnouncementForm((current) => ({ ...current, title: event.target.value }))} placeholder="e.g. Important event update" />
                  <label htmlFor="admin-announcement-event">Related event</label>
                  <select id="admin-announcement-event" required value={announcementForm.eventId} onChange={(event) => setAnnouncementForm((current) => ({ ...current, eventId: event.target.value }))}>
                    <option value="">Select an event</option>
                    {events.map((event, index) => <option key={event.id ?? index} value={event.id}>{event.name} · {event.department}</option>)}
                  </select>
                  <label htmlFor="admin-announcement-body">Message</label>
                  <textarea id="admin-announcement-body" required maxLength="4000" rows="5" value={announcementForm.body} onChange={(event) => setAnnouncementForm((current) => ({ ...current, body: event.target.value }))} placeholder="Write the update you want everyone to see..." />
                  {announcementMessage && <p className={`admin-announcement-message ${announcementMessage.startsWith('Announcement published') ? 'success' : 'error'}`} role="status">{announcementMessage}</p>}
                  <button type="submit" disabled={announcementSubmitting || events.length === 0}>{announcementSubmitting ? 'Publishing…' : 'Publish to all audiences'}</button>
                </form>
                <div className="admin-announcement-feed">
                  <h4>Recent announcements <span>{announcements.length}</span></h4>
                  {announcements.length ? announcements.map((announcement, index) => {
                    const eventId = Number(announcement.eventId ?? announcement.EventId);
                    const linkedEvent = events.find((event) => Number(event.id) === eventId);
                    return (
                      <article className="admin-announcement-item" key={announcement.id ?? announcement.Id ?? index}>
                        <div className="admin-announcement-item-top">
                          <strong>{announcement.title || announcement.Title}</strong>
                          <time>{new Date(announcement.timestamp || announcement.Timestamp).toLocaleDateString()}</time>
                        </div>
                        <p>{announcement.body || announcement.Body}</p>
                        <small>{linkedEvent ? `${linkedEvent.name} · ${linkedEvent.department}` : 'Organization-wide'}</small>
                      </article>
                    );
                  }) : <p className="admin-report-empty">No announcements have been published yet.</p>}
                </div>
              </div>
            </section>
          )}
        </div>
      </main>
      {selectedDate && (
        <div className="admin-event-modal-backdrop" role="presentation" onClick={(clickEvent) => {
          if (clickEvent.target === clickEvent.currentTarget) setSelectedDate(null);
        }}>
          <section className="admin-event-modal" role="dialog" aria-modal="true" aria-labelledby="admin-event-modal-title">
            <div className="admin-event-modal-header">
              <div>
                <span className="admin-events-eyebrow">{selectedDateEvents.length} {selectedDateEvents.length === 1 ? 'EVENT' : 'EVENTS'}</span>
                <h3 id="admin-event-modal-title">{new Date(`${selectedDate}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</h3>
              </div>
              <button type="button" aria-label="Close event details" onClick={() => setSelectedDate(null)}>×</button>
            </div>
            <div className="admin-event-modal-list">
              {selectedDateEvents.map((event, index) => {
                const date = eventDate(event);
                const expired = date && date < today;
                const assignedOrganizers = organizersForEvent(event);
                return (
                  <article className={`admin-event-popup-card ${expired ? 'expired' : 'upcoming'}`} key={event.id ?? `${event.name}-${index}`}>
                    <span className={`admin-event-status ${expired ? 'expired' : 'upcoming'}`}>{expired ? 'Expired' : 'Upcoming'}</span>
                    <h4>{event.name}</h4>
                    <p><strong>Department</strong><span>{event.department}</span></p>
                    <p><strong>Organizer</strong><span>{assignedOrganizers.length ? assignedOrganizers.map((organizer) => `${organizer.name} (${organizer.email})`).join(', ') : (organizersUnavailable ? 'Organizer details unavailable' : 'No organizer assigned')}</span></p>
                    <p><strong>Location</strong><span>{event.location}</span></p>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}