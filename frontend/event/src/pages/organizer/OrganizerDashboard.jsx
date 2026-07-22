import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { eventService, registrationService, attendanceService, announcementService } from '../../services/api';
import './OrganizerDashboard.css';

export default function OrganizerDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Database-backed State Arrays
  const [events, setEvents] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [announcements, setAnnouncements] = useState([]);

  // Modal / Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAnnounceModalOpen, setIsAnnounceModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  
  const [formData, setFormData] = useState({
    title: '', date: '', location: '', capacity: '', type: 'CONFERENCE', status: 'PUBLISHED', img: ''
  });

  const [announceData, setAnnounceData] = useState({
    title: '', targetEventId: '', body: ''
  });

  // --- Live API Sync Hook ---
  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [eventsRes, regsRes, attRes, announceRes] = await Promise.all([
        eventService.getAll(),
        registrationService.getAll(),
        attendanceService.getAll(),
        announcementService.getAll()
      ]);

      setEvents(eventsRes.data);
      setRegistrations(regsRes.data);
      setAttendance(attRes.data);
      setAnnouncements(announceRes.data);

      // Dynamically set default option for the announcement target dropdown
      if (eventsRes.data.length > 0) {
        setAnnounceData(prev => ({ ...prev, targetEventId: eventsRes.data[0].id.toString() }));
      }
    } catch (err) {
      console.error("Dashboard synchronization failure:", err);
      setError("Failed to synchronize dashboard state with SQL Server. Please check connection status.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // --- Analytical Calculations ---
  const confirmedRegs = registrations.filter(r => r.status === 'CONFIRMED' || r.status === 'PUBLISHED').length;
  const verifiedCheckIns = attendance.filter(a => a.checkedIn).length;
  const totalAttendanceRecords = attendance.length;
  const attendanceRate = totalAttendanceRecords > 0 ? Math.round((verifiedCheckIns / totalAttendanceRecords) * 100) : 0;

  const stats = [
    { title: 'MY EVENTS', value: events.length.toString(), sub: 'Active database rows', theme: 'bg-blue-light', type: 'calendar' },
    { title: 'REGISTRATIONS', value: registrations.length.toString(), sub: `${confirmedRegs} confirmed seats`, theme: 'bg-purple-light', type: 'users' },
    { title: 'ATTENDANCE RATE', value: `${attendanceRate}%`, sub: `${verifiedCheckIns} check-ins processed`, theme: 'bg-green-light', type: 'ticket' },
    { title: 'ANNOUNCEMENTS', value: announcements.length.toString(), sub: 'Broadcasts broadcasted', theme: 'bg-orange-light', type: 'star' }
  ];

  const handleLogout = () => {
    localStorage.removeItem('token'); // Secure identity flush
    navigate('/login');
  };

  const openCreateModal = () => {
    setEditingEvent(null);
    setFormData({
      title: '', date: '', location: '', capacity: '', type: 'CONFERENCE', status: 'PUBLISHED',
      img: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=500&auto=format&fit=crop&q=60'
    });
    setIsModalOpen(true);
  };

  const openEditModal = (event) => {
    setEditingEvent(event);
    // Standardize ISO format dates down to YYYY-MM-DD for form input constraints
    const cleanDate = event.date ? event.date.split('T')[0] : '';
    setFormData({
      title: event.title, date: cleanDate, location: event.location, capacity: event.capacity, type: event.type, status: event.status, img: event.img
    });
    setIsModalOpen(true);
  };

  // --- Event CRUD Mutations ---
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        capacity: parseInt(formData.capacity) || 0
      };

      if (editingEvent) {
        payload.id = editingEvent.id;
        payload.registered = editingEvent.registered;
        await eventService.update(editingEvent.id, payload);
      } else {
        await eventService.create(payload);
      }
      setIsModalOpen(false);
      fetchDashboardData(); // Force global re-evaluation loop
    } catch (err) {
      alert("Error saving event configuration schema.");
    }
  };

  const handleDeleteEvent = async (id) => {
    if (window.confirm("Are you absolutely sure you want to delete this event? This action is permanent.")) {
      try {
        await eventService.delete(id);
        fetchDashboardData();
      } catch (err) {
        alert("Failed to delete event record.");
      }
    }
  };

  // --- Roster Gate Mutator ---
  const toggleCheckIn = async (id) => {
    try {
      await attendanceService.toggleCheckIn(id);
      fetchDashboardData();
    } catch (err) {
      alert("Unable to toggle admission status at this gate.");
    }
  };

  // --- Broadcast Dispatcher ---
  const handleAnnouncementSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        title: announceData.title,
        eventId: parseInt(announceData.targetEventId),
        body: announceData.body
      };
      await announcementService.create(payload);
      setAnnounceData(prev => ({ ...prev, title: '', body: '' }));
      setIsAnnounceModalOpen(false);
      fetchDashboardData();
    } catch (err) {
      alert("Transmission failure when dispatching system notification.");
    }
  };

  const formatDateString = (rawDate) => {
    if (!rawDate) return '';
    return new Date(rawDate).toLocaleDateString('en-GB');
  };

  // Global Frontend Filters Mapping
  const filteredEvents = events.filter(e => e.title?.toLowerCase().includes(searchQuery.toLowerCase()) || e.location?.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredRegistrations = registrations.filter(r => r.name?.toLowerCase().includes(searchQuery.toLowerCase()) || r.event?.title?.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredAttendance = attendance.filter(a => a.name?.toLowerCase().includes(searchQuery.toLowerCase()) || a.event?.title?.toLowerCase().includes(searchQuery.toLowerCase()));

  // UI Helper maps types to themes
  const getTypeTheme = (type) => {
    const maps = { CONFERENCE: 'bg-blue-light', WORKSHOP: 'bg-purple-light', SEMINAR: 'bg-orange-light' };
    return maps[type] || 'bg-blue-light';
  };

  const getStatusTheme = (status) => {
    return status === 'PUBLISHED' ? 'bg-green-light' : 'bg-orange-light';
  };

  return (
    <div className="db-layout">
      {/* --- SIDEBAR PANEL LEFT --- */}
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
                onClick={() => setActiveTab(item.name)}
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

      {/* --- MAIN DISPLAY WORKSPACE --- */}
      <main className="db-main">
        <header className="db-header">
          <div className="header-title">
            <span>EVENTSYNC</span>
            <h2>{activeTab === 'Dashboard' ? 'Organizer Dashboard' : `Manage ${activeTab}`}</h2>
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
              <div className="avatar">O</div>
              <div className="user-info">
                <div className="name">Olivia Organizer</div>
                <div className="role">Host Admin</div>
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
              🔄 Re-evaluating core server variables...
            </div>
          )}

          {/* VIEW ONE: OVERVIEW ANALYTICS */}
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
                <h3>Upcoming operational pipelines</h3>
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
                  {filteredEvents.length === 0 && <p style={{ padding: '16px', color: '#64748b' }}>No corresponding event metrics detected.</p>}
                </div>
              </section>
            </>
          )}

          {/* VIEW TWO: CRUD EVENTS */}
          {activeTab === 'Events' && (
            <section className="events-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3>Event Catalog</h3>
                <button onClick={openCreateModal} style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
                  + Add Live Schema
                </button>
              </div>
              <div style={{ overflowX: 'auto', backgroundColor: '#fff', borderRadius: '12px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'left' }}>
                      <th style={{ padding: '14px 16px' }}>Event Name</th>
                      <th style={{ padding: '14px 16px' }}>Schedule</th>
                      <th style={{ padding: '14px 16px' }}>Type</th>
                      <th style={{ padding: '14px 16px' }}>Capacity</th>
                      <th style={{ padding: '14px 16px' }}>Status</th>
                      <th style={{ padding: '14px 16px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEvents.map(event => (
                      <tr key={event.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '16px', fontWeight: '700' }}>{event.title}</td>
                        <td style={{ padding: '16px', color: '#475569' }}>{formatDateString(event.date)} <span style={{ fontSize: '12px', color: '#94a3b8' }}>({event.location})</span></td>
                        <td style={{ padding: '16px' }}><span className={`tag ${getTypeTheme(event.type)}`}>{event.type}</span></td>
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

          {/* VIEW THREE: REGISTRATIONS AUDITING */}
          {activeTab === 'Registrations' && (
            <section className="events-panel">
              <h3 style={{ marginBottom: '14px' }}>Ticket Registration Workspace</h3>
              <div style={{ overflowX: 'auto', backgroundColor: '#fff', borderRadius: '12px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'left' }}>
                      <th style={{ padding: '14px 16px' }}>ID Reference</th>
                      <th style={{ padding: '14px 16px' }}>Attendee</th>
                      <th style={{ padding: '14px 16px' }}>Target Scope</th>
                      <th style={{ padding: '14px 16px' }}>Pass Category</th>
                      <th style={{ padding: '14px 16px' }}>Booked Date</th>
                      <th style={{ padding: '14px 16px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRegistrations.map((reg) => (
                      <tr key={reg.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '16px', fontFamily: 'monospace', color: '#64748b', fontWeight: '600' }}>{reg.id}</td>
                        <td style={{ padding: '16px' }}>
                          <div style={{ fontWeight: '700' }}>{reg.name}</div>
                          <div style={{ fontSize: '12px', color: '#94a3b8' }}>{reg.email}</div>
                        </td>
                        <td style={{ padding: '16px', color: '#334155', fontWeight: '500' }}>{reg.event?.title || 'N/A'}</td>
                        <td style={{ padding: '16px' }}>
                          <span style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', background: reg.tier === 'VIP' ? '#fef3c7' : '#f1f5f9', color: reg.tier === 'VIP' ? '#d97706' : '#475569' }}>{reg.tier}</span>
                        </td>
                        <td style={{ padding: '16px', color: '#64748b' }}>{formatDateString(reg.registrationDate)}</td>
                        <td style={{ padding: '16px' }}>
                          <span className={`tag ${reg.status === 'CONFIRMED' ? 'bg-green-light' : 'bg-orange-light'}`}>{reg.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* VIEW FOUR: ATTENDANCE GATE CONTROL */}
          {activeTab === 'Attendance' && (
            <section className="events-panel">
              <h3 style={{ marginBottom: '14px' }}>Live Admission Roster Verification</h3>
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
                    {filteredAttendance.map((att) => (
                      <tr key={att.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '16px', fontWeight: '700' }}>{att.name}</td>
                        <td style={{ padding: '16px', color: '#475569' }}>{att.event?.title || 'N/A'}</td>
                        <td style={{ padding: '16px', fontFamily: 'monospace', color: '#64748b' }}>{att.ticketCode}</td>
                        <td style={{ padding: '16px' }}>
                          <span style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', background: att.checkedIn ? '#dcfce7' : '#fee2e2', color: att.checkedIn ? '#15803d' : '#b91c1c' }}>
                            {att.checkedIn ? 'VERIFIED' : 'ABSENT'}
                          </span>
                        </td>
                        <td style={{ padding: '16px', color: '#64748b', fontWeight: '500' }}>{att.time}</td>
                        <td style={{ padding: '16px', textAlign: 'right' }}>
                          <button 
                            onClick={() => toggleCheckIn(att.id)}
                            style={{
                              border: 'none', padding: '6px 14px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer',
                              background: att.checkedIn ? '#fee2e2' : '#dcfce7', color: att.checkedIn ? '#b91c1c' : '#15803d'
                            }}
                          >
                            {att.checkedIn ? 'Revoke Admission' : 'Grant Entry'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* VIEW FIVE: BROADCAST ANNOUNCEMENTS */}
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

      {/* --- LIVE BROADCAST FORM MODAL --- */}
      {isAnnounceModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#fff', width: '480px', borderRadius: '16px', padding: '28px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>Compose System Broadcast Notification</h3>
            <form onSubmit={handleAnnouncementSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Notification Subject Header</label>
                <input type="text" required value={announceData.title} onChange={e => setAnnounceData({...announceData, title: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Target Pipeline Scope</label>
                <select value={announceData.targetEventId} onChange={e => setAnnounceData({...announceData, targetEventId: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#fff' }}>
                  {events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Broadcast Announcement Copy Content</label>
                <textarea required rows="4" value={announceData.body} onChange={e => setAnnounceData({...announceData, body: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none', resize: 'none', fontFamily: 'sans-serif' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button type="button" onClick={() => setIsAnnounceModalOpen(false)} style={{ background: '#f1f5f9', color: '#475569', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>Deploy Transmission</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- FORM MODAL LAYER (Create / Edit View) --- */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#fff', width: '520px', borderRadius: '16px', padding: '28px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: '700', color: '#0f172a' }}>{editingEvent ? 'Modify Event Settings' : 'Deploy New Event Schema'}</h3>
            <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Event Title</label>
                <input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Date</label>
                  <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Max Capacity</label>
                  <input type="number" required min="1" value={formData.capacity} onChange={e => setFormData({...formData, capacity: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Location / Venue Room</label>
                <input type="text" required value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Event Structure</label>
                  <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#fff' }}>
                    <option value="CONFERENCE">CONFERENCE</option>
                    <option value="WORKSHOP">WORKSHOP</option>
                    <option value="SEMINAR">SEMINAR</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Deployment Status</label>
                  <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#fff' }}>
                    <option value="PUBLISHED">PUBLISHED</option>
                    <option value="DRAFT">DRAFT</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Banner Image URL</label>
                <input type="text" value={formData.img} onChange={e => setFormData({...formData, img: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ background: '#f1f5f9', color: '#475569', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>Save Configuration</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}