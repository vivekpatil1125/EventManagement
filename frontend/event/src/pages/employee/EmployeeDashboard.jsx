import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import './EmployeeDashboard.css';

export default function EmployeeDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Authenticated User State
  const [currentUser, setCurrentUser] = useState({
    name: 'Employee',
    email: 'employee@eventsync.com',
    role: 'Employee'
  });

  // Core Operational States (Guaranteed Arrays)
  const [allEvents, setAllEvents] = useState([]);
  const [registeredEvents, setRegisteredEvents] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [qrCodes, setQrCodes] = useState({});
  
  // Registration Modal States
  const [showModal, setShowModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    notes: ''
  });
  
  // System Status Trackers
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const BACKEND_URL = "https://localhost:7165";

  const getAuthConfig = () => {
    const token = localStorage.getItem('token');
    return {
      headers: { Authorization: `Bearer ${token}` }
    };
  };

  // Decode JWT or extract user info on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
        const payload = JSON.parse(jsonPayload);

        // Extract name and email supporting standard ASP.NET Core claim types & standard JWT keys
        const extractedName = 
          payload.name || 
          payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || 
          payload.unique_name || 
          payload.sub || 
          'Employee';

        const extractedEmail = 
          payload.email || 
          payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] || 
          'employee@eventsync.com';

        const extractedRole = 
          payload.role || 
          payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || 
          'Employee';

        setCurrentUser({
          name: extractedName,
          email: extractedEmail,
          role: extractedRole
        });

        setFormData(prev => ({
          ...prev,
          name: extractedName,
          email: extractedEmail
        }));
      } catch (err) {
        console.error("Failed to decode auth token:", err);
      }
    }
    fetchDashboardData();
  }, []);

  // Generate local QR codes whenever registered events update
  useEffect(() => {
    const generateQRCodes = async () => {
      const codes = {};
      for (const t of registeredEvents) {
        const qrPayload = `ES-PASS:${t.ticketCode}|${t.title}|${t.attendeeEmail}`;

        try {
          const url = await QRCode.toDataURL(qrPayload, { 
            width: 250, 
            margin: 4,
            errorCorrectionLevel: 'M'
          });
          codes[t.id] = url;
        } catch (err) {
          console.error("QR generation error:", err);
        }
      }
      setQrCodes(codes);
    };

    generateQRCodes();
  }, [registeredEvents]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const [eventsRes, registrationsRes, announcementsRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/events`, getAuthConfig()),
        axios.get(`${BACKEND_URL}/api/registrations`, getAuthConfig()),
        axios.get(`${BACKEND_URL}/api/announcements`, getAuthConfig())
      ]);

      const rawEvents = Array.isArray(eventsRes.data) ? eventsRes.data : [];
      const rawRegistrations = Array.isArray(registrationsRes.data) ? registrationsRes.data : [];
      const rawAnnouncements = Array.isArray(announcementsRes.data) ? announcementsRes.data : [];

      const discoverEvents = rawEvents.map(e => ({
        id: e.id !== undefined ? e.id : (e.Id !== undefined ? e.Id : e.ID),
        title: e.title || e.Title || e.Name || 'Untitled Event',
        description: e.description || e.Description || '',
        date: e.date || e.Date || '',
        location: e.location || e.Location || 'Remote',
        capacity: e.capacity || e.Capacity || 0,
        registeredCount: e.registered || e.Registered || 0,
        type: e.type || e.Type || 'CONFERENCE',
        status: e.status || e.Status || 'PUBLISHED'
      }));

      const mappedPasses = rawRegistrations.map(r => {
        const eventObj = r.event || r.Event || {};
        const userObj = r.user || r.User || {};
        const id = eventObj.id || eventObj.Id || r.eventId || r.EventId || r.Id || r.id;
        
        // Robust fallback checking across all possible name / email properties in backend response
        const resolvedName = 
          r.name || r.Name || 
          r.fullName || r.FullName || 
          userObj.name || userObj.Name || 
          userObj.fullName || userObj.FullName || 
          currentUser.name;

        const resolvedEmail = 
          r.email || r.Email || 
          userObj.email || userObj.Email || 
          currentUser.email;

        return {
          id: id,
          title: eventObj.title || eventObj.Title || r.title || r.Title || 'Registered Event',
          date: eventObj.date || eventObj.Date || '',
          location: eventObj.location || eventObj.Location || 'Remote',
          type: eventObj.type || eventObj.Type || 'CONFERENCE',
          ticketCode: r.id || r.Id || r.ticketCode || 'REG-PENDING',
          attendeeName: resolvedName,
          attendeeEmail: resolvedEmail,
          status: 'CONFIRMED'
        };
      });

      const mappedAnnouncements = rawAnnouncements.map(a => ({
        id: a.id || a.Id,
        title: a.title || a.Title || 'Notification',
        body: a.content || a.Content || a.body || a.Body || '',
        timestamp: a.timestamp || a.Timestamp || '',
        unread: true
      }));

      setAllEvents(discoverEvents);
      setRegisteredEvents(mappedPasses);
      setNotifications(mappedAnnouncements);

    } catch (err) {
      console.error("Dashboard synchronization error:", err);
      setError('Failed to synchronize database records with the server.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenRegistrationModal = (event) => {
    setSelectedEvent(event);
    setShowModal(true);
  };

  const handleRegistrationSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEvent) return;

    setActionLoading(true);
    try {
      await axios.post(`${BACKEND_URL}/api/registrations`, {
        EventId: selectedEvent.id,
        Name: formData.name,
        Email: formData.email,
        Notes: formData.notes
      }, getAuthConfig());
      
      alert('Registration successful and saved to database!');
      setShowModal(false);
      setSelectedEvent(null);
      fetchDashboardData(); 
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Unable to complete event registration.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadPDF = (ticket) => {
    const doc = new jsPDF();

    doc.setFillColor(30, 58, 138);
    doc.rect(0, 0, 210, 45, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("EventSync Enterprise Pass", 20, 28);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(16);
    doc.text(`${ticket.title}`, 20, 65);

    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139);
    doc.text("TOKEN ID", 20, 80);
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(13);
    doc.text(`${ticket.ticketCode}`, 20, 88);

    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139);
    doc.text("DATE & VENUE", 20, 103);
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(13);
    doc.text(`${new Date(ticket.date).toLocaleString()} • ${ticket.location || 'Remote'}`, 20, 111);

    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139);
    doc.text("REGISTERED ATTENDEE", 20, 126);
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(13);
    doc.text(`${ticket.attendeeName} (${ticket.attendeeEmail})`, 20, 134);

    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139);
    doc.text("PASS CLASSIFICATION", 20, 149);
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(13);
    doc.text(`${ticket.type || 'CONFERENCE'} (Confirmed)`, 20, 157);

    if (qrCodes[ticket.id]) {
      doc.addImage(qrCodes[ticket.id], "PNG", 145, 60, 45, 45);
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text("Scan to Verify", 147, 110);
    }
    
    doc.setLineWidth(0.5);
    doc.setDrawColor(203, 213, 225);
    doc.line(20, 175, 190, 175);

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text("Verified secure corporate access token. Authorized personnel only.", 20, 190);

    doc.save(`${ticket.ticketCode}-pass.pdf`);
  };

  const markNotificationAsRead = async (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, unread: false } : n));
    try {
      await axios.put(`${BACKEND_URL}/api/announcements/${id}/read`, {}, getAuthConfig());
    } catch (err) {
      console.warn('Notification status update skipped on server:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const formatDateString = (rawDate) => {
    if (!rawDate) return 'TBD';
    const parsed = Date.parse(rawDate);
    return isNaN(parsed) ? 'TBD' : new Date(parsed).toLocaleDateString('en-GB');
  };

  const getTypeTheme = (type) => {
    switch (type?.toUpperCase()) {
      case 'CONFERENCE': return 'bg-blue-light';
      case 'WORKSHOP': return 'bg-purple-light';
      case 'SEMINAR': return 'bg-orange-light';
      default: return 'bg-blue-light';
    }
  };

  const discoverCatalog = Array.isArray(allEvents) 
    ? allEvents.filter(event => event && !registeredEvents.some(reg => reg?.id === event?.id))
    : [];

  const upcomingEvents = registeredEvents.filter(e => {
    if (!e?.date) return false;
    const d = new Date(e.date);
    return !isNaN(d.getTime()) && d >= new Date();
  }); 

  const unreadCount = notifications.filter(n => n?.unread).length;

  const stats = [
    { title: 'REGISTERED', value: registeredEvents.length.toString(), theme: 'theme-blue', type: 'ticket' },
    { title: 'UPCOMING', value: upcomingEvents.length.toString(), theme: 'theme-purple', type: 'calendar' },
    { title: 'CERTIFICATES', value: certificates.length.toString(), theme: 'theme-green', type: 'badge' },
    { title: 'UNREAD', value: unreadCount.toString(), theme: 'theme-orange', type: 'bell' }
  ];

  const query = (searchQuery || '').toLowerCase();
  
  const filteredRegistered = registeredEvents.filter(e => 
    (e?.title || '').toLowerCase().includes(query) || 
    (e?.location || '').toLowerCase().includes(query)
  );
  
  const filteredDiscover = discoverCatalog.filter(e => 
    (e?.title || '').toLowerCase().includes(query) || 
    (e?.location || '').toLowerCase().includes(query)
  );
  
  const filteredNotifications = notifications.filter(n => 
    (n?.title || '').toLowerCase().includes(query) || 
    (n?.body || '').toLowerCase().includes(query)
  );

  return (
    <div className="db-layout">
      
      {/* --- SIDEBAR PANEL LEFT --- */}
      <aside className="db-sidebar">
        <div>
          <div className="sidebar-header">
            <div className="logo-box">E</div>
            <div className="logo-text">
              <h1>EventSync</h1>
              <span>EMPLOYEE</span>
            </div>
          </div>

          <nav className="sidebar-nav">
            {[
              { name: 'Dashboard', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
              { name: 'Discover', icon: 'M14 10l-4 4m0 0l-4-4m4 4V4M4 20h16a2 2 0 002-2V6a2 2 0 00-2-2H4a2 2 0 00-2 2v12a2 2 0 002 2z' },
              { name: 'My Events', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
              { name: 'Tickets', icon: 'M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z' },
              { name: 'Certificates', icon: 'M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z' },
              { name: 'Notifications', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' }
            ].map((item) => (
              <button
                key={item.name}
                onClick={() => { setActiveTab(item.name); setSearchQuery(''); }}
                className={`nav-btn ${activeTab === item.name ? 'active' : ''}`}
              >
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
                <span>{item.name}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="sidebar-footer">
          <button className="nav-btn" onClick={() => setActiveTab('Profile')}>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>Profile</span>
          </button>
          <button className="nav-btn logout-btn" onClick={handleLogout}>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* --- MAIN DISPLAY WORKSPACE --- */}
      <main className="db-main" style={{ backgroundColor: '#ffffff' }}>
        <header className="db-header" style={{ height: '80px', padding: '0 40px', borderBottom: '1px solid #f1f5f9', background: '#fff' }}>
          <div className="header-title">
            <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, letterSpacing: '0.1em' }}>EVENTSYNC</span>
            <h2 style={{ margin: '2px 0 0 0', fontSize: '1.5rem', fontWeight: 800 }}>
              {activeTab === 'Dashboard' ? 'My Dashboard' : activeTab}
            </h2>
          </div>

          <div className="header-actions">
            <div className="search-container">
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              <svg className="search-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            <button className="bell-btn" onClick={() => setActiveTab('Notifications')}>
              <svg style={{ width: 20, height: 20, color: '#0f172a' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && <span className="bell-badge">{unreadCount}</span>}
            </button>

            <div className="user-profile">
              <div className="avatar">{currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'E'}</div>
              <div className="user-info">
                <div className="name" style={{ fontSize: '0.9rem', fontWeight: 700 }}>{currentUser.name}</div>
                <div className="role" style={{ fontSize: '11px', color: '#64748b' }}>{currentUser.role}</div>
              </div>
            </div>
          </div>
        </header>

        <div className="db-body" style={{ padding: '32px 40px', backgroundColor: '#f8fafc' }}>
          
          {error && (
            <div style={{ padding: '12px 20px', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '8px', marginBottom: '20px', fontWeight: 600, fontSize: '14px' }}>
              {error}
            </div>
          )}

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '350px', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <p style={{ color: '#64748b', fontWeight: 600 }}>Syncing organization catalog from database...</p>
            </div>
          ) : (
            <>
              {/* VIEW ONE: CORE DASHBOARD */}
              {activeTab === 'Dashboard' && (
                <>
                  <section className="hero-banner" style={{ display: 'flex', background: 'linear-gradient(90deg, #1d4ed8 0%, #172554 100%)', borderRadius: '16px', overflow: 'hidden', color: 'white', minHeight: '220px', marginBottom: '24px' }}>
                    <div className="hero-left" style={{ flex: '1.2', padding: '36px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start', gap: '12px' }}>
                      <span className="welcome-tag" style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.2em', color: '#93c5fd', textTransform: 'uppercase' }}>WELCOME BACK</span>
                      <h3 style={{ fontSize: '2.2rem', fontWeight: 800, margin: 0 }}>Hey {currentUser.name.split(' ')[0]} 👋</h3>
                      <p style={{ margin: '4px 0 12px 0', fontSize: '0.95rem', color: '#93c5fd', lineHeight: 1.5, maxWidth: '480px' }}>
                        Here's what's happening across your organization. Discover upcoming database events and manage your attendance.
                      </p>
                      <button className="explore-btn" onClick={() => setActiveTab('Discover')} style={{ backgroundColor: 'white', color: '#1e3a8a', padding: '10px 20px', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>
                        Explore events
                      </button>
                    </div>
                    <div className="hero-right" style={{ flex: 1, backgroundImage: "url('https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&auto=format&fit=crop&q=80')", backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}>
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, #1d4ed8 0%, transparent 40%)' }}></div>
                    </div>
                  </section>

                  <section className="metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '24px' }}>
                    {stats.map((stat, idx) => (
                      <div key={idx} className="metric-card" style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '110px' }}>
                        <div className="metric-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className="metric-title" style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', letterSpacing: '0.1em' }}>{stat.title}</span>
                          <div className={`metric-icon-box ${stat.theme}`} style={{ width: '24px', height: '24px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg style={{ width: 14, height: 14 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                              {stat.type === 'ticket' && <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />}
                              {stat.type === 'calendar' && <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />}
                              {stat.type === 'badge' && <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />}
                              {stat.type === 'bell' && <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />}
                            </svg>
                          </div>
                        </div>
                        <div className="metric-value" style={{ fontSize: '2rem', fontWeight: 800 }}>{stat.value}</div>
                      </div>
                    ))}
                  </section>

                  <section className="events-panel" style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', minHeight: '280px' }}>
                    <div className="events-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>Your upcoming events</h3>
                      <button onClick={() => setActiveTab('My Events')} style={{ color: '#2563eb', fontSize: '0.85rem', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}>
                        View all →
                      </button>
                    </div>
                    
                    {upcomingEvents.length === 0 ? (
                      <div className="events-empty-content" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: '54px', height: '54px', backgroundColor: '#f1f5f9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                          <svg style={{ width: 22, height: 22 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6z" />
                          </svg>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                        {upcomingEvents.slice(0, 3).map(e => (
                          <div key={e.id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', backgroundColor: '#fff' }}>
                            <span className={`tag ${getTypeTheme(e.type)}`}>{e.type || 'Event'}</span>
                            <h4 style={{ margin: '10px 0 4px 0', fontSize: '1rem', fontWeight: 700 }}>{e.title}</h4>
                            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>{formatDateString(e.date)} • {e.location || 'Remote'}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </>
              )}

              {/* VIEW TWO: DISCOVER & REGISTER */}
              {activeTab === 'Discover' && (
                <section className="events-panel" style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ marginBottom: '16px', fontWeight: 700 }}>Available Organization Events (From Database)</h3>
                  {filteredDiscover.length === 0 ? (
                    <p style={{ color: '#64748b', fontSize: '14px', textAlign: 'center', padding: '40px 0' }}>No new events available for registration.</p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                      {filteredDiscover.map(e => (
                        <div key={e.id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', backgroundColor: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                          <div>
                            <span className={`tag ${getTypeTheme(e.type)}`}>{e.type}</span>
                            <h4 style={{ margin: '12px 0 6px 0', fontSize: '1.1rem', fontWeight: 700 }}>{e.title}</h4>
                            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>{formatDateString(e.date)} • {e.location || 'TBD'}</p>
                            {e.description && <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#475569', lineHeight: 1.4 }}>{e.description}</p>}
                            <div style={{ marginTop: '10px', fontSize: '12px', color: '#64748b' }}>
                              <span>Capacity: <strong>{e.capacity}</strong></span> | <span>Registered: <strong>{e.registeredCount}</strong></span>
                            </div>
                          </div>
                          <button 
                            onClick={() => handleOpenRegistrationModal(e)}
                            style={{ marginTop: '14px', width: '100%', padding: '10px', border: 'none', background: '#2563eb', color: '#fff', fontWeight: 600, borderRadius: '6px', cursor: 'pointer' }}
                          >
                            Register Pass
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {/* VIEW THREE: MY EVENTS */}
              {activeTab === 'My Events' && (
                <section className="events-panel" style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ marginBottom: '16px', fontWeight: 700 }}>Your Registered Corporate Passes</h3>
                  {filteredRegistered.length === 0 ? (
                    <p style={{ color: '#64748b', fontSize: '14px', textAlign: 'center', padding: '40px 0' }}>You haven't registered for any active events yet.</p>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                        <thead>
                          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'left' }}>
                            <th style={{ padding: '12px 16px' }}>Event Title</th>
                            <th style={{ padding: '12px 16px' }}>Schedule</th>
                            <th style={{ padding: '12px 16px' }}>Type</th>
                            <th style={{ padding: '12px 16px' }}>Registration ID / Token</th>
                            <th style={{ padding: '12px 16px' }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredRegistered.map(event => (
                            <tr key={event.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '16px', fontWeight: 700 }}>{event.title}</td>
                              <td style={{ padding: '16px', color: '#475569' }}>{formatDateString(event.date)} <span style={{ fontSize: '12px', color: '#94a3b8' }}>({event.location || 'Remote'})</span></td>
                              <td style={{ padding: '16px' }}><span className={`tag ${getTypeTheme(event.type)}`}>{event.type}</span></td>
                              <td style={{ padding: '16px', fontFamily: 'monospace', color: '#64748b', fontWeight: 600 }}>{event.ticketCode}</td>
                              <td style={{ padding: '16px' }}><span className="tag bg-green-light">{event.status}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              )}

              {/* VIEW FOUR: TICKETS */}
              {activeTab === 'Tickets' && (
                <section className="events-panel" style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0, fontWeight: 700 }}>Active Enterprise Entry Tickets</h3>
                    <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Secure Corporate Passes</span>
                  </div>

                  {filteredRegistered.length === 0 ? (
                    <p style={{ color: '#64748b', fontSize: '14px', textAlign: 'center', padding: '40px 0' }}>No active entry tokens found. Register for events in the Discover tab.</p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '24px' }}>
                      {filteredRegistered.map(t => {
                        const localQrSrc = qrCodes[t.id];
                        
                        return (
                          <div key={t.id} style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: '14px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                            
                            <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)', color: '#fff', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', opacity: 0.85 }}>{t.type || 'EVENT'} PASS</span>
                                <h4 style={{ margin: '2px 0 0 0', fontSize: '1.1rem', fontWeight: 800 }}>{t.title}</h4>
                              </div>
                              <span style={{ fontSize: '10px', fontWeight: 700, background: '#10b981', color: '#fff', padding: '3px 8px', borderRadius: '4px' }}>{t.status}</span>
                            </div>

                            <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div>
                                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Date & Venue</div>
                                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#0f172a' }}>{formatDateString(t.date)}</div>
                                  <div style={{ fontSize: '12px', color: '#475569' }}>{t.location || 'Remote'}</div>
                                </div>
                                <div>
                                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Attendee</div>
                                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{t.attendeeName}</div>
                                </div>
                                <div>
                                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Token ID</div>
                                  <div style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>{t.ticketCode}</div>
                                </div>
                              </div>

                              <div style={{ background: '#fff', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '8px', textAlign: 'center' }}>
                                {localQrSrc ? (
                                  <img 
                                    src={localQrSrc} 
                                    alt="Scannable Ticket QR Code" 
                                    style={{ 
                                      width: '140px', 
                                      height: '140px', 
                                      display: 'block', 
                                      imageRendering: 'pixelated'
                                    }} 
                                  />
                                ) : (
                                  <div style={{ width: '140px', height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#64748b' }}>Loading...</div>
                                )}
                                <span style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', marginTop: '4px', display: 'block' }}>Scan to Verify</span>
                              </div>
                            </div>

                            <div style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', padding: '12px 20px', display: 'flex', justifyContent: 'flex-end' }}>
                              <button 
                                onClick={() => handleDownloadPDF(t)}
                                style={{ width: '100%', background: '#2563eb', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                              >
                                <svg style={{ width: 16, height: 16 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Download Ticket (PDF)
                              </button>
                            </div>

                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}

              {/* VIEW FIVE: CERTIFICATES */}
              {activeTab === 'Certificates' && (
                <section className="events-panel" style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0', textAlign: 'center', minHeight: '260px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                  <div style={{ color: '#94a3b8', marginBottom: '12px' }}>
                    <svg style={{ width: 44, height: 44 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                    </svg>
                  </div>
                  <h3 style={{ margin: 0, fontWeight: 700, color: '#334155' }}>No Completed Modules</h3>
                  <p style={{ color: '#64748b', fontSize: '14px', marginTop: '6px' }}>Attend registered workspaces to unlock completion credentials.</p>
                </section>
              )}

              {/* VIEW SIX: NOTIFICATIONS */}
              {activeTab === 'Notifications' && (
                <section className="events-panel" style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ marginBottom: '16px', fontWeight: 700 }}>System Broadcast Bulletin Feeds</h3>
                  {filteredNotifications.length === 0 ? (
                    <p style={{ color: '#64748b', fontSize: '14px', textAlign: 'center', padding: '40px 0' }}>Your notification feed is currently clear.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {filteredNotifications.map(n => (
                        <div key={n.id} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', backgroundColor: n.unread ? '#f8fafc' : '#fff' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>{n.title}</h4>
                            </div>
                            <span style={{ fontSize: '12px', color: '#94a3b8' }}>{n.timestamp ? formatDateString(n.timestamp) : 'Just Now'}</span>
                          </div>
                          <p style={{ margin: '8px 0 0 0', fontSize: '13.5px', color: '#475569', lineHeight: 1.5 }}>{n.body}</p>
                          {n.unread && (
                            <button onClick={() => markNotificationAsRead(n.id)} style={{ marginTop: '10px', background: '#eff6ff', color: '#2563eb', border: 'none', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                              Mark read
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {/* VIEW SEVEN: PROFILE */}
              {activeTab === 'Profile' && (
                <section className="events-panel" style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0', maxWidth: '500px' }}>
                  <h3 style={{ marginBottom: '20px', fontWeight: 700 }}>Account Specifications</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                    <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#eff6ff', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 800 }}>
                      {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'E'}
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{currentUser.name}</h4>
                      <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#64748b' }}>{currentUser.email} • {currentUser.role}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px', color: '#475569' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                      <span style={{ fontWeight: 600, color: '#64748b' }}>Status</span>
                      <span className="tag bg-green-light">Active</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                      <span style={{ fontWeight: 600, color: '#64748b' }}>Organization</span>
                      <span>EventSync Enterprise</span>
                    </div>
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </main>

      {/* --- EVENT REGISTRATION FORM MODAL --- */}
      {showModal && selectedEvent && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', width: '100%', maxWidth: '480px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>Register for Event</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}>✕</button>
            </div>

            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
              <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>{selectedEvent.title}</h4>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>{formatDateString(selectedEvent.date)} • {selectedEvent.location}</p>
            </div>

            <form onSubmit={handleRegistrationSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Full Name</label>
                <input 
                  type="text" 
                  value={formData.name} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})} 
                  required
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Work Email</label>
                <input 
                  type="email" 
                  value={formData.email} 
                  onChange={(e) => setFormData({...formData, email: e.target.value})} 
                  required
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Special Requirements / Notes (Optional)</label>
                <textarea 
                  value={formData.notes} 
                  onChange={(e) => setFormData({...formData, notes: e.target.value})} 
                  rows="3"
                  placeholder="Dietary preferences, accessibility requirements, etc."
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  style={{ flex: 1, padding: '10px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={actionLoading}
                  style={{ flex: 1, padding: '10px', background: actionLoading ? '#93c5fd' : '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: actionLoading ? 'not-allowed' : 'pointer' }}
                >
                  {actionLoading ? 'Saving...' : 'Confirm Registration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}