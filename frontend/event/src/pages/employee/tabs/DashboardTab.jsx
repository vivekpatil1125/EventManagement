import React from 'react';

export default function DashboardTab({ currentUser, stats, upcomingEvents, setActiveTab, formatDateString, getTypeTheme }) {
  return (
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
            <p style={{ color: '#64748b', fontSize: '14px' }}>No upcoming events scheduled.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {upcomingEvents.slice(0, 3).map(e => (
              <div key={e.id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', backgroundColor: '#fff' }}>
                <span className={`tag ${getTypeTheme(e.type)}`}>{e.type || 'Event'}</span>
                <h4 style={{ margin: '10px 0 4px 0', fontSize: '1rem', fontWeight: 700 }}>{e.title}</h4>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>{formatDateString(e.date)} | {e.location || 'Remote'}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}