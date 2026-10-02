import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { eventService, registrationService, attendanceService, announcementService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './OrganizerDashboard.css';

export default function OrganizerDashboard() {
  const navigate = useNavigate();
  const authContext = useAuth ? useAuth() : {};
  const user = authContext?.user;

  // Dynamically resolve user attributes
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  
  const displayName = 
    user?.fullName || 
    user?.FullName || 
    user?.name || 
    storedUser?.fullName || 
    storedUser?.FullName || 
    "Organizer";

  const displayRole = 
    user?.role || 
    user?.Role || 
    storedUser?.role || 
    storedUser?.Role || 
    "Host Admin";

  const userDepartment = 
    user?.department || 
    user?.Department || 
    storedUser?.department || 
    storedUser?.Department || 
    "";

  const [activeTab, setActiveTab] = useState('Dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Operational State Collections
  const [events, setEvents] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [announcements, setAnnouncements] = useState([]);

  // Modal / Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAnnounceModalOpen, setIsAnnounceModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  
  const [formData, setFormData] = useState({
    title: '', 
    description: '',
    date: '', 
    location: '', 
    capacity: '', 
    type: 'CONFERENCE', 
    status: 'PUBLISHED', 
    img: '', 
    department: userDepartment || 'HR'
  });

  const [announceData, setAnnounceData] = useState({
    title: '', 
    targetEventId: '', 
    body: ''
  });

  // Keep form department updated when session context loads
  useEffect(() => {
    if (userDepartment) {
      setFormData(prev => ({ ...prev, department: userDepartment }));
    }
  }, [userDepartment]);

  // --- Live API Synchronization ---
  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [eventsRes, regsRes, attRes, announceRes] = await Promise.allSettled([
        eventService.getAll(),
        registrationService.getAll(),
        attendanceService.getAll(),
        announcementService.getAll()
      ]);

      const failedEndpoints = [];
      if (eventsRes.status === 'rejected') failedEndpoints.push('Events (/api/events)');
      if (regsRes.status === 'rejected') failedEndpoints.push('Registrations (/api/registrations)');
      if (attRes.status === 'rejected') failedEndpoints.push('Attendance (/api/attendance)');
      if (announceRes.status === 'rejected') failedEndpoints.push('Announcements (/api/announcements)');

      if (failedEndpoints.length > 0) {
        setError(`Data sync partial failure on: ${failedEndpoints.join(', ')}.`);
      }

      const rawEvents = eventsRes.status === 'fulfilled' && Array.isArray(eventsRes.value.data) ? eventsRes.value.data : [];
      const rawRegs = regsRes.status === 'fulfilled' && Array.isArray(regsRes.value.data) ? regsRes.value.data : [];
      const rawAtt = attRes.status === 'fulfilled' && Array.isArray(attRes.value.data) ? attRes.value.data : [];
      const rawAnnounce = announceRes.status === 'fulfilled' && Array.isArray(announceRes.value.data) ? announceRes.value.data : [];

      const orgDeptLower = (userDepartment || '').trim().toLowerCase();
      
      // Filter events by department if specified
      const filteredDeptEvents = orgDeptLower
        ? rawEvents.filter(e => ((e.department || e.Department || '').trim().toLowerCase() === orgDeptLower))
        : rawEvents;

      const deptEventIds = new Set(
        filteredDeptEvents.map(e => Number(e.id ?? e.Id)).filter(id => !isNaN(id) && id > 0)
      );

      // Safe filtering for registrations
      const filteredDeptRegs = rawRegs.filter(r => {
        if (deptEventIds.size === 0) return true;
        const evId = Number(r.eventId || r.EventId || r.event?.id || r.Event?.Id);
        return deptEventIds.has(evId);
      });

      // Resilient Attendance filtering (prevents wiping out records if eventId is unpopulated)
      let filteredDeptAtt = rawAtt;
      if (deptEventIds.size > 0) {
        const matched = rawAtt.filter(a => {
          const evId = Number(a.eventId || a.EventId || a.event?.id || a.Event?.Id);
          const dept = (a.event?.department || a.Event?.Department || a.department || '').trim().toLowerCase();
          return deptEventIds.has(evId) || (dept && dept === orgDeptLower);
        });

        if (matched.length > 0) {
          filteredDeptAtt = matched;
        }
      }

      setEvents(filteredDeptEvents);
      setRegistrations(filteredDeptRegs.length > 0 ? filteredDeptRegs : rawRegs);
      setAttendance(filteredDeptAtt);
      setAnnouncements(rawAnnounce);

      if (filteredDeptEvents.length > 0) {
        setAnnounceData(prev => ({ 
          ...prev, 
          targetEventId: (filteredDeptEvents[0].id ?? filteredDeptEvents[0].Id).toString() 
        }));
      }
    } catch (err) {
      console.error("Dashboard synchronization failure:", err);
      setError("Failed to communicate with the database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [userDepartment]);

  // --- Analytical Calculations ---
  const confirmedRegs = registrations.filter(r => (r.status || r.Status || '').toUpperCase() === 'CONFIRMED' || (r.status || r.Status || '').toUpperCase() === 'PUBLISHED').length;
  const verifiedCheckIns = attendance.filter(a => a.checkedIn || a.CheckedIn).length;
  const totalAttendanceRecords = attendance.length;
  const attendanceRate = totalAttendanceRecords > 0 ? Math.round((verifiedCheckIns / totalAttendanceRecords) * 100) : 0;

  const stats = [
    { title: 'DEPARTMENT EVENTS', value: events.length.toString(), sub: `${userDepartment || 'All'} Division`, theme: 'bg-blue-light', type: 'calendar' },
    { title: 'REGISTRATIONS', value: registrations.length.toString(), sub: `${confirmedRegs} confirmed seats`, theme: 'bg-purple-light', type: 'users' },
    { title: 'ATTENDANCE RATE', value: `${attendanceRate}%`, sub: `${verifiedCheckIns} check-ins processed`, theme: 'bg-green-light', type: 'ticket' },
    { title: 'ANNOUNCEMENTS', value: announcements.length.toString(), sub: 'Active broadcasts', theme: 'bg-orange-light', type: 'star' }
  ];

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const openCreateModal = () => {
    setEditingEvent(null);
    setFormData({
      title: '', 
      description: '',
      date: '', 
      location: '', 
      capacity: '', 
      type: 'CONFERENCE', 
      status: 'PUBLISHED', 
      img: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=500&auto=format&fit=crop&q=60',
      department: userDepartment || 'HR'
    });
    setIsModalOpen(true);
  };

  const openEditModal = (event) => {
    setEditingEvent(event);
    const cleanDate = event.date ? event.date.split('T')[0] : '';
    setFormData({
      title: event.title || '', 
      description: event.description || event.Description || '',
      date: cleanDate, 
      location: event.location || '', 
      capacity: event.capacity || '', 
      type: event.type || 'CONFERENCE', 
      status: event.status || 'PUBLISHED', 
      img: event.img || '',
      department: event.department || userDepartment || 'HR'
    });
    setIsModalOpen(true);
  };

  // --- CRUD Mutations ---
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      const targetId = editingEvent ? Number(editingEvent.id ?? editingEvent.Id) : 0;

      let safeDate = new Date().toISOString();
      if (formData.date) {
        const parsed = new Date(formData.date);
        if (!isNaN(parsed.getTime())) {
          safeDate = parsed.toISOString();
        }
      }

      const payload = {
        id: targetId,
        Id: targetId,
        title: (formData.title || '').trim(),
        description: (formData.description || '').trim(),
        date: safeDate,
        location: (formData.location || '').trim(),
        capacity: parseInt(formData.capacity, 10) || 0,
        registered: editingEvent ? Number(editingEvent.registered ?? editingEvent.Registered ?? 0) : 0,
        type: formData.type || 'CONFERENCE',
        status: formData.status || 'PUBLISHED',
        img: formData.img || '',
        department: userDepartment || formData.department || 'HR'
      };

      if (editingEvent) {
        await eventService.update(targetId, payload);
      } else {
        await eventService.create(payload);
      }
      setIsModalOpen(false);
      fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.detail || err.response?.data?.message || "Error saving event configuration schema.");
    }
  };

  const handleDeleteEvent = async (id) => {
    if (window.confirm("Are you sure you want to delete this event? This action is permanent.")) {
      try {
        await eventService.delete(id);
        fetchDashboardData();
      } catch (err) {
        alert("Failed to delete event record.");
      }
    }
  };

  // --- Attendance Gate Check-In Function with Optimistic Update ---
  const toggleCheckIn = async (id) => {
    // 1. Optimistic UI update so the button flips state immediately
    setAttendance(prev => prev.map(item => {
      const itemId = item.id ?? item.Id;
      if (itemId === id) {
        const nextState = !(item.checkedIn || item.CheckedIn);
        return {
          ...item,
          checkedIn: nextState,
          CheckedIn: nextState,
          time: nextState ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--',
          Time: nextState ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'
        };
      }
      return item;
    }));

    // 2. Persist state to backend
    try {
      await attendanceService.toggleCheckIn(id);
      fetchDashboardData();
    } catch (err) {
      console.error("Admission gate toggle error:", err);
      alert("Unable to toggle admission status at this gate. Reverting changes.");
      fetchDashboardData();
    }
  };

  const handleAnnouncementSubmit = async (e) => {
    e.preventDefault();
    if (!announceData.targetEventId) {
      alert("Please ensure at least one active department event exists before dispatching notifications.");
      return;
    }

    try {
      const payload = {
        title: announceData.title,
        eventId: parseInt(announceData.targetEventId, 10),
        body: announceData.body
      };
      await announcementService.create(payload);
      setAnnounceData(prev => ({ ...prev, title: '', body: '' }));
      setIsAnnounceModalOpen(false);
      fetchDashboardData();
    } catch (err) {
      alert("Transmission failure when dispatching notification.");
    }
  };

  const formatDateString = (rawDate) => {
    if (!rawDate) return '';
    return new Date(rawDate).toLocaleDateString('en-GB');
  };

  const q = (searchQuery || '').toLowerCase().trim();

  const filteredEvents = events.filter(e => 
    (e.title?.toLowerCase() || '').includes(q) || 
    (e.location?.toLowerCase() || '').includes(q) ||
    (e.description?.toLowerCase() || '').includes(q)
  );
  
  const filteredRegistrations = registrations.filter(r => 
    (r.name || r.Name || '').toLowerCase().includes(q) || 
    (r.email || r.Email || '').toLowerCase().includes(q) ||
    (r.event?.title || r.Event?.Title || '').toLowerCase().includes(q)
  );
  
  const filteredAttendance = attendance.filter(a => {
    if (!q) return true;
    const attendeeName = (a.name || a.Name || a.attendeeName || a.AttendeeName || '').toLowerCase();
    const attendeeEmail = (a.email || a.Email || a.attendeeEmail || a.AttendeeEmail || '').toLowerCase();
    const eventName = (a.event?.title || a.Event?.Title || a.eventTitle || '').toLowerCase();
    const token = (a.ticketCode || a.TicketCode || a.id || a.Id || '').toString().toLowerCase();
    return attendeeName.includes(q) || attendeeEmail.includes(q) || eventName.includes(q) || token.includes(q);
  });

  const getTypeTheme = (type) => {
    const maps = { CONFERENCE: 'bg-blue-light', WORKSHOP: 'bg-purple-light', SEMINAR: 'bg-orange-light' };
    return maps[type?.toUpperCase()] || 'bg-blue-light';
  };

  const getStatusTheme = (status) => {
    return status === 'PUBLISHED' ? 'bg-green-light' : 'bg-orange-light';
  };

  return (
    <div className="db-layout">
      {/* SIDEBAR PANEL */}
      <aside className="db-sidebar">
        <div>
          <div className="sidebar-header">
            <div className="logo-box">E</div>
            <div className="logo-text">
              <h1>EventSync</h1>
              <span>ORGANIZER</span>
            </div>
          </div>

          <nav className="sidebar-nav">
            {[
              { name: 'Dashboard', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
              { name: 'Events', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
              { name: 'Registrations', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
              { name: 'Attendance', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2 2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
              { name: 'Announcements', icon: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z' }
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
          <button className="nav-btn logout-btn" onClick={handleLogout}>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* MAIN VIEW */}
      <main className="db-main">
        <header className="db-header">
          <div className="header-title">
            <span>EVENTSYNC • {userDepartment ? userDepartment.toUpperCase() : 'GENERAL'}</span>
            <h2>{activeTab === 'Dashboard' ? `Welcome, ${displayName}` : `Manage ${activeTab}`}</h2>
          </div>

          <div className="header-actions">
            <div className="search-container">
              <input
                type="text"
                placeholder={`Filter ${activeTab.toLowerCase()}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              <svg className="search-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            <div className="user-profile">
              <div className="avatar">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="user-info">
                <div className="name">{displayName}</div>
                <div className="role" style={{ textTransform: 'capitalize' }}>
                  {displayRole} ({userDepartment || 'General'})
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="db-body">
          {error && (
            <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '14px', borderRadius: '8px', marginBottom: '16px', fontWeight: '500', fontSize: '14px' }}>
              ⚠️ {error}
            </div>
          )}

          {loading && (
            <div style={{ color: '#2563eb', padding: '12px 0', fontSize: '14px', fontWeight: '600', letterSpacing: '0.5px' }}>
              🔄 Synchronizing database collections...
            </div>
          )}

          {/* VIEW: DASHBOARD METRICS */}
          {activeTab === 'Dashboard' && !loading && (
            <>
              <section className="metrics-grid">
                {stats.map((stat, idx) => (
                  <div key={idx} className="metric-card">
                    <div className="metric-info">
                      <span className="metric-title">{stat.title}</span>
                      <div className="metric-value">{stat.value}</div>
                      <span className="metric-sub">{stat.sub}</span>
                    </div>
                    <div className={`metric-icon-box ${stat.theme}`}>
                      <svg style={{ width: 20, height: 20 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        {stat.type === 'calendar' && <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />}
                        {stat.type === 'users' && <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />}
                        {stat.type === 'ticket' && <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />}
                        {stat.type === 'star' && <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />}
                      </svg>
                    </div>
                  </div>
                ))}
              </section>

              <section className="events-panel">
                <h3>{userDepartment || 'Active'} Events Pipeline</h3>
                <div className="events-grid">
                  {filteredEvents.map((event) => (
                    <div key={event.id} className="event-card">
                      {event.img && <img src={event.img} alt={event.title} className="event-img" />}
                      <div className="event-details">
                        <div className="tag-row">
                          <span className={`tag ${getTypeTheme(event.type)}`}>{event.type}</span>
                          <span className={`tag ${getStatusTheme(event.status)}`}>{event.status}</span>
                        </div>
                        <h4>{event.title}</h4>
                        {event.description && (
                          <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 8px 0', lineHeight: 1.4 }}>
                            {event.description}
                          </p>
                        )}
                        <div className="meta-info-list">
                          <div className="meta-item">
                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>{formatDateString(event.date)} • {event.location}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {filteredEvents.length === 0 && <p style={{ padding: '16px', color: '#64748b' }}>No {userDepartment} events found.</p>}
                </div>
              </section>
            </>
          )}

          {/* VIEW: EVENTS CATALOG */}
          {activeTab === 'Events' && (
            <section className="events-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3>{userDepartment || 'Active'} Event Catalog</h3>
                <button onClick={openCreateModal} style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
                  + Add Event
                </button>
              </div>
              <div style={{ overflowX: 'auto', backgroundColor: '#fff', borderRadius: '12px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'left' }}>
                      <th style={{ padding: '14px 16px' }}>Event Details</th>
                      <th style={{ padding: '14px 16px' }}>Schedule</th>
                      <th style={{ padding: '14px 16px' }}>Department</th>
                      <th style={{ padding: '14px 16px' }}>Capacity</th>
                      <th style={{ padding: '14px 16px' }}>Status</th>
                      <th style={{ padding: '14px 16px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEvents.map(event => (
                      <tr key={event.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '16px' }}>
                          <div style={{ fontWeight: '700', color: '#0f172a' }}>{event.title}</div>
                          {event.description && (
                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', maxWidth: '300px' }}>
                              {event.description}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '16px', color: '#475569' }}>{formatDateString(event.date)} <span style={{ fontSize: '12px', color: '#94a3b8' }}>({event.location})</span></td>
                        <td style={{ padding: '16px' }}><span className="tag bg-blue-light">{event.department || userDepartment}</span></td>
                        <td style={{ padding: '16px' }}>{event.registered}/{event.capacity}</td>
                        <td style={{ padding: '16px' }}><span className={`tag ${getStatusTheme(event.status)}`}>{event.status}</span></td>
                        <td style={{ padding: '16px', textAlign: 'right' }}>
                          <button onClick={() => openEditModal(event)} style={{ background: '#eff6ff', color: '#2563eb', border: 'none', padding: '6px 12px', borderRadius: '6px', marginRight: '6px', cursor: 'pointer', fontWeight: '600' }}>Edit</button>
                          <button onClick={() => handleDeleteEvent(event.id)} style={{ background: '#fff1f2', color: '#f43f5e', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* VIEW: REGISTRATIONS */}
          {activeTab === 'Registrations' && (
            <section className="events-panel">
              <h3 style={{ marginBottom: '14px' }}>Ticket Registration Workspace ({userDepartment || 'All'})</h3>
              <div style={{ overflowX: 'auto', backgroundColor: '#fff', borderRadius: '12px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'left' }}>
                      <th style={{ padding: '14px 16px' }}>ID Reference</th>
                      <th style={{ padding: '14px 16px' }}>Attendee</th>
                      <th style={{ padding: '14px 16px' }}>Target Event</th>
                      <th style={{ padding: '14px 16px' }}>Pass Category</th>
                      <th style={{ padding: '14px 16px' }}>Booked Date</th>
                      <th style={{ padding: '14px 16px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRegistrations.map((reg) => (
                      <tr key={reg.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '16px', fontFamily: 'monospace', color: '#64748b', fontWeight: '600' }}>{reg.id?.substring?.(0, 8) || reg.id}</td>
                        <td style={{ padding: '16px' }}>
                          <div style={{ fontWeight: '700' }}>{reg.name || reg.Name}</div>
                          <div style={{ fontSize: '12px', color: '#94a3b8' }}>{reg.email || reg.Email}</div>
                        </td>
                        <td style={{ padding: '16px', color: '#334155', fontWeight: '500' }}>{reg.event?.title || reg.Event?.Title || 'N/A'}</td>
                        <td style={{ padding: '16px' }}>
                          <span style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', background: reg.tier === 'VIP' ? '#fef3c7' : '#f1f5f9', color: reg.tier === 'VIP' ? '#d97706' : '#475569' }}>{reg.tier || 'Standard'}</span>
                        </td>
                        <td style={{ padding: '16px', color: '#64748b' }}>{formatDateString(reg.registrationDate || reg.RegistrationDate)}</td>
                        <td style={{ padding: '16px' }}>
                          <span className={`tag ${(reg.status || reg.Status) === 'CONFIRMED' ? 'bg-green-light' : 'bg-orange-light'}`}>{reg.status || reg.Status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* VIEW: ATTENDANCE & ADMISSION ROSTER */}
          {activeTab === 'Attendance' && (
            <section className="events-panel">
              <h3 style={{ marginBottom: '14px' }}>Admission Gate Roster ({userDepartment || 'All'})</h3>
              <div style={{ overflowX: 'auto', backgroundColor: '#fff', borderRadius: '12px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'left' }}>
                      <th style={{ padding: '14px 16px' }}>Attendee</th>
                      <th style={{ padding: '14px 16px' }}>Target Scope</th>
                      <th style={{ padding: '14px 16px' }}>Access Token</th>
                      <th style={{ padding: '14px 16px' }}>Gate Status</th>
                      <th style={{ padding: '14px 16px' }}>Check-in Log</th>
                      <th style={{ padding: '14px 16px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAttendance.map((att, idx) => {
                      const attId = att.id || att.Id || `ATT-${idx}`;
                      const isChecked = Boolean(att.checkedIn ?? att.CheckedIn);
                      const checkInTime = att.time || att.Time || '--:--';
                      const attendeeName = att.name || att.Name || att.attendeeName || att.AttendeeName || 'Registered Attendee';
                      const attendeeEmail = att.email || att.Email || att.attendeeEmail || att.AttendeeEmail || '';
                      const eventTitle = att.event?.title || att.Event?.Title || att.eventTitle || 'Department Event';
                      const ticketCode = att.ticketCode || att.TicketCode || attId;

                      return (
                        <tr key={attId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '16px' }}>
                            <div style={{ fontWeight: '700', color: '#0f172a' }}>{attendeeName}</div>
                            {attendeeEmail && <div style={{ fontSize: '12px', color: '#94a3b8' }}>{attendeeEmail}</div>}
                          </td>
                          <td style={{ padding: '16px', color: '#475569' }}>{eventTitle}</td>
                          <td style={{ padding: '16px', fontFamily: 'monospace', color: '#64748b' }}>{ticketCode}</td>
                          <td style={{ padding: '16px' }}>
                            <span style={{ 
                              padding: '4px 8px', 
                              borderRadius: '6px', 
                              fontSize: '12px', 
                              fontWeight: '700', 
                              background: isChecked ? '#dcfce7' : '#fee2e2', 
                              color: isChecked ? '#15803d' : '#b91c1c' 
                            }}>
                              {isChecked ? 'VERIFIED' : 'ABSENT'}
                            </span>
                          </td>
                          <td style={{ padding: '16px', color: '#64748b', fontWeight: '500' }}>{checkInTime}</td>
                          <td style={{ padding: '16px', textAlign: 'right' }}>
                            <button 
                              type="button"
                              onClick={() => toggleCheckIn(attId)}
                              style={{
                                border: 'none', 
                                padding: '8px 16px', 
                                borderRadius: '6px', 
                                fontWeight: '700', 
                                cursor: 'pointer',
                                transition: 'all 0.15s ease-in-out',
                                background: isChecked ? '#fee2e2' : '#2563eb', 
                                color: isChecked ? '#b91c1c' : '#ffffff',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                              }}
                            >
                              {isChecked ? 'Revoke Admission' : 'Grant Entry'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredAttendance.length === 0 && (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                          No admission records found for {userDepartment || 'this department'}.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* VIEW: ANNOUNCEMENTS */}
          {activeTab === 'Announcements' && (
            <section className="events-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3>Broadcast Bulletin Feeds</h3>
                <button onClick={() => setIsAnnounceModalOpen(true)} style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
                  + Dispatch Notification
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {announcements.map((ann) => (
                  <div key={ann.id} style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', alignItems: 'flex-start' }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>{ann.title}</h4>
                        <span style={{ fontSize: '12px', color: '#2563eb', fontWeight: '600' }}>Scope: {ann.event?.title || 'Global Context'}</span>
                      </div>
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>{new Date(ann.timestamp).toLocaleString()}</span>
                    </div>
                    <p style={{ margin: '8px 0 0 0', color: '#475569', fontSize: '14px', lineHeight: '1.5' }}>{ann.body}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      {/* MODAL: CREATE / EDIT */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#fff', width: '520px', borderRadius: '16px', padding: '28px', border: '1px solid #e2e8f0', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: '700', color: '#0f172a' }}>
              {editingEvent ? 'Modify Event Settings' : `Deploy New ${userDepartment || ''} Event`}
            </h3>
            <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Event Title</label>
                <input 
                  type="text" 
                  required 
                  value={formData.title} 
                  onChange={e => setFormData({...formData, title: e.target.value})} 
                  style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none' }} 
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Description</label>
                <textarea 
                  rows="3"
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                  placeholder="Provide an agenda, topics covered, or event details..."
                  style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Date</label>
                  <input 
                    type="date" 
                    required 
                    value={formData.date} 
                    onChange={e => setFormData({...formData, date: e.target.value})} 
                    style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none' }} 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Max Capacity</label>
                  <input 
                    type="number" 
                    required 
                    min="1" 
                    value={formData.capacity} 
                    onChange={e => setFormData({...formData, capacity: e.target.value})} 
                    style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none' }} 
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Location / Venue Room</label>
                <input 
                  type="text" 
                  required 
                  value={formData.location} 
                  onChange={e => setFormData({...formData, location: e.target.value})} 
                  style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none' }} 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Event Structure</label>
                  <select 
                    value={formData.type} 
                    onChange={e => setFormData({...formData, type: e.target.value})} 
                    style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#fff' }}
                  >
                    <option value="CONFERENCE">CONFERENCE</option>
                    <option value="WORKSHOP">WORKSHOP</option>
                    <option value="SEMINAR">SEMINAR</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Deployment Status</label>
                  <select 
                    value={formData.status} 
                    onChange={e => setFormData({...formData, status: e.target.value})} 
                    style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#fff' }}
                  >
                    <option value="PUBLISHED">PUBLISHED</option>
                    <option value="DRAFT">DRAFT</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Department</label>
                <input 
                  type="text" 
                  disabled 
                  value={userDepartment || 'General'} 
                  style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc', color: '#64748b' }} 
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Banner Image URL</label>
                <input 
                  type="text" 
                  value={formData.img} 
                  onChange={e => setFormData({...formData, img: e.target.value})} 
                  style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none' }} 
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  style={{ background: '#f1f5f9', color: '#475569', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
                >
                  Save Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ANNOUNCEMENT */}
      {isAnnounceModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#fff', width: '480px', borderRadius: '16px', padding: '28px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>Compose System Broadcast Notification</h3>
            <form onSubmit={handleAnnouncementSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Notification Subject Header</label>
                <input 
                  type="text" 
                  required 
                  value={announceData.title} 
                  onChange={e => setAnnounceData({...announceData, title: e.target.value})} 
                  style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none' }} 
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Target Pipeline Scope</label>
                <select 
                  value={announceData.targetEventId} 
                  onChange={e => setAnnounceData({...announceData, targetEventId: e.target.value})} 
                  style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#fff' }}
                >
                  {events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Broadcast Announcement Copy Content</label>
                <textarea 
                  required 
                  rows="4" 
                  value={announceData.body} 
                  onChange={e => setAnnounceData({...announceData, body: e.target.value})} 
                  style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none', resize: 'none', fontFamily: 'sans-serif' }} 
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button 
                  type="button" 
                  onClick={() => setIsAnnounceModalOpen(false)} 
                  style={{ background: '#f1f5f9', color: '#475569', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
                >
                  Deploy Transmission
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}