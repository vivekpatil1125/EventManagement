import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import './EmployeeDashboard.css';

// Import Tab Components
import DashboardTab from './tabs/DashboardTab';
import DiscoverTab from './tabs/DiscoverTab';
import MyEventsTab from './tabs/MyEventsTab';
import TicketsTab from './tabs/TicketsTab';
import CertificatesTab from './tabs/CertificatesTab';
import NotificationsTab from './tabs/NotificationsTab';
import ProfileTab from './tabs/ProfileTab';

export default function EmployeeDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [currentUser, setCurrentUser] = useState({
    name: 'Employee',
    email: 'employee@eventsync.com',
    role: 'Employee'
  });

  const [allEvents, setAllEvents] = useState([]);
  const [registeredEvents, setRegisteredEvents] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [qrCodes, setQrCodes] = useState({});
  
  const [showModal, setShowModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', notes: '' });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const BACKEND_URL = "https://localhost:7165";

  const getAuthConfig = () => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const parts = token.split('.');
        if (parts.length > 1) {
          const base64Url = parts[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
          const payload = JSON.parse(jsonPayload);

          const extractedName = payload.name || payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || payload.unique_name || payload.sub || 'Employee';
          const extractedEmail = payload.email || payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] || 'employee@eventsync.com';
          const extractedRole = payload.role || payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || 'Employee';

          setCurrentUser({ name: extractedName, email: extractedEmail, role: extractedRole });
          setFormData(prev => ({ ...prev, name: extractedName, email: extractedEmail }));
        }
      } catch (err) {
        console.error("Failed to decode auth token:", err);
      }
    }
    fetchDashboardData();
  }, []);

  useEffect(() => {
    const generateQRCodes = async () => {
      const codes = {};
      for (const t of registeredEvents) {
        const qrPayload = `ES-PASS:${t.ticketCode}|${t.title}|${t.attendeeEmail}`;
        try {
          const url = await QRCode.toDataURL(qrPayload, { width: 250, margin: 4, errorCorrectionLevel: 'M' });
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
    const requests = await Promise.allSettled([
      axios.get(`${BACKEND_URL}/api/events`, getAuthConfig()),
      axios.get(`${BACKEND_URL}/api/registrations`, getAuthConfig()),
      axios.get(`${BACKEND_URL}/api/announcements`, getAuthConfig())
    ]);

    const [eventsResult, registrationsResult, announcementsResult] = requests;

    // Handle Events
    if (eventsResult.status === 'fulfilled') {
      const rawEvents = Array.isArray(eventsResult.value.data)
        ? eventsResult.value.data
        : [];

      const discoverEvents = rawEvents.map(e => ({
        id: e.id ?? e.Id ?? e.ID,
        title: e.title || e.Title || e.Name || 'Untitled Event',
        description: e.description || e.Description || '',
        date: e.date || e.Date || '',
        location: e.location || e.Location || 'Remote',
        capacity: e.capacity ?? e.Capacity ?? 0,
        registeredCount: e.registered ?? e.Registered ?? 0,
        type: e.type || e.Type || 'CONFERENCE',
        status: e.status || e.Status || 'PUBLISHED'
      }));

      setAllEvents(discoverEvents);
    } else {
      console.error('Events API Error:', eventsResult.reason);
      setAllEvents([]);
    }

    // Handle Registrations
    if (registrationsResult.status === 'fulfilled') {
      const rawRegistrations = Array.isArray(registrationsResult.value.data)
        ? registrationsResult.value.data
        : [];

      const mappedPasses = rawRegistrations.map(r => {
        const eventObj = r.event || r.Event || {};
        const userObj = r.user || r.User || {};

        const registrationId = r.id ?? r.Id;
        const eventId =
          r.eventId ??
          r.EventId ??
          eventObj.id ??
          eventObj.Id ??
          null;

        return {
          id: eventId ?? registrationId,
          eventId: eventId ?? registrationId,
          registrationId,

          title:
            eventObj.title ||
            eventObj.Title ||
            r.title ||
            r.Title ||
            'Registered Event',

          date: eventObj.date || eventObj.Date || '',
          location: eventObj.location || eventObj.Location || 'Remote',
          type: eventObj.type || eventObj.Type || 'CONFERENCE',

          ticketCode:
            r.ticketCode ||
            r.TicketCode ||
            registrationId ||
            'REG-PENDING',

          attendeeName:
            r.name ||
            r.Name ||
            r.fullName ||
            r.FullName ||
            userObj.name ||
            userObj.Name ||
            currentUser.name,

          attendeeEmail:
            r.email ||
            r.Email ||
            userObj.email ||
            userObj.Email ||
            currentUser.email,

          status: r.status || r.Status || 'CONFIRMED',

          isCheckedIn:
            r.isCheckedIn ??
            r.CheckedIn ??
            false,

          checkedInAt:
            r.checkedInAt ||
            r.CheckedInAt ||
            null
        };
      });

      setRegisteredEvents(mappedPasses);
    } else {
      console.error(
        'Registrations API Error:',
        registrationsResult.reason?.response?.data ||
        registrationsResult.reason
      );

      setRegisteredEvents([]);
    }

    // Handle Announcements
    if (announcementsResult.status === 'fulfilled') {
      const rawAnnouncements = Array.isArray(announcementsResult.value.data)
        ? announcementsResult.value.data
        : [];

      const mappedAnnouncements = rawAnnouncements.map(a => ({
        id: a.id ?? a.Id,
        title: a.title || a.Title || 'Notification',
        body:
          a.content ||
          a.Content ||
          a.body ||
          a.Body ||
          '',
        timestamp: a.timestamp || a.Timestamp || '',
        unread: true
      }));

      setNotifications(mappedAnnouncements);
    } else {
      console.error('Announcements API Error:', announcementsResult.reason);
      setNotifications([]);
    }

    // Show which API failed
    const failedApis = [];

    if (eventsResult.status === 'rejected') {
      failedApis.push('Events');
    }

    if (registrationsResult.status === 'rejected') {
      failedApis.push('Registrations');
    }

    if (announcementsResult.status === 'rejected') {
      failedApis.push('Announcements');
    }

    if (failedApis.length > 0) {
      setError(
        `Failed to load ${failedApis.join(', ')}. Check the backend API.`
      );
    }

  } catch (err) {
    console.error('Dashboard synchronization error:', err);

    setError(
      'Failed to synchronize dashboard data with the server.'
    );
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

  const handleCheckIn = async (ticketOrId) => {
    setActionLoading(true);

    const targetId = typeof ticketOrId === 'object'
      ? (ticketOrId.eventId ?? ticketOrId.EventId ?? ticketOrId.id ?? ticketOrId.registrationId ?? ticketOrId.ticketCode)
      : ticketOrId;

    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/attendance/check-in/${encodeURIComponent(targetId)}`,
        {},
        getAuthConfig()
      );
      const timestamp = response.data.checkedInAt || new Date().toISOString();

      setRegisteredEvents(prev => prev.map(t =>
        (t.eventId === targetId || t.id === targetId || t.ticketCode === targetId || t.registrationId === targetId)
          ? { ...t, isCheckedIn: true, checkedInAt: timestamp }
          : t
      ));
      alert(response.data.message || 'Successfully checked in for the event!');
    } catch (err) {
      console.error("Check-in error:", err);
      alert(err.response?.data?.message || 'Unable to process check-in. Please try again.');
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
    doc.text(`${new Date(ticket.date).toLocaleString()} | ${ticket.location || 'Remote'}`, 20, 111);

    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139);
    doc.text("REGISTERED ATTENDEE", 20, 126);
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(13);
    doc.text(`${ticket.attendeeName} (${ticket.attendeeEmail})`, 20, 134);

    if (qrCodes[ticket.id]) {
      doc.addImage(qrCodes[ticket.id], "PNG", 145, 60, 45, 45);
    }
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

  const discoverCatalog = Array.isArray(allEvents) ? allEvents.filter(event => event && !registeredEvents.some(reg => reg?.id === event?.id)) : [];
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
  const filteredRegistered = registeredEvents.filter(e => (e?.title || '').toLowerCase().includes(query) || (e?.location || '').toLowerCase().includes(query));
  const filteredDiscover = discoverCatalog.filter(e => (e?.title || '').toLowerCase().includes(query) || (e?.location || '').toLowerCase().includes(query));
  const filteredNotifications = notifications.filter(n => (n?.title || '').toLowerCase().includes(query) || (n?.body || '').toLowerCase().includes(query));

  return (
    <div className="db-layout">
      {/* SIDEBAR */}
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

      {/* MAIN WORKSPACE */}
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
              {activeTab === 'Dashboard' && <DashboardTab {...{ currentUser, stats, upcomingEvents, setActiveTab, formatDateString, getTypeTheme }} />}
              {activeTab === 'Discover' && <DiscoverTab {...{ filteredDiscover, handleOpenRegistrationModal, formatDateString, getTypeTheme }} />}
              {activeTab === 'My Events' && <MyEventsTab {...{ filteredRegistered, formatDateString, getTypeTheme }} />}
              {activeTab === 'Tickets' && <TicketsTab {...{ filteredRegistered, qrCodes, handleDownloadPDF, handleCheckIn, actionLoading, formatDateString, getTypeTheme }} />}
              {activeTab === 'Certificates' && <CertificatesTab />}
              {activeTab === 'Notifications' && <NotificationsTab {...{ filteredNotifications, markNotificationAsRead }} />}
              {activeTab === 'Profile' && <ProfileTab {...{ currentUser }} />}
            </>
          )}
        </div>
      </main>

      {/* REGISTRATION MODAL */}
      {showModal && selectedEvent && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', width: '100%', maxWidth: '480px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', fontWeight: 700 }}>Register for Event</h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#64748b' }}>Confirm your registration details for <strong>{selectedEvent.title}</strong>.</p>
            
            <form onSubmit={handleRegistrationSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '6px' }}>ATTENDEE NAME</label>
                <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '6px' }}>ATTENDEE EMAIL</label>
                <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '6px' }}>NOTES / SPECIAL REQUIREMENTS (OPTIONAL)</label>
                <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Any dietary preferences, accessibility needs..." rows="3" style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', resize: 'vertical' }} />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: '10px', background: '#f1f5f9', color: '#0f172a', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={actionLoading} style={{ flex: 1, padding: '10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>{actionLoading ? 'Submitting...' : 'Confirm Registration'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}