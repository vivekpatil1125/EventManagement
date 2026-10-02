import React from 'react';

export default function NotificationsTab({ filteredNotifications, markNotificationAsRead }) {
  return (
    <section className="events-panel" style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0' }}>
      <h3 style={{ marginBottom: '16px', fontWeight: 700 }}>Organization Announcements & Notifications</h3>
      {filteredNotifications.length === 0 ? (
        <p style={{ color: '#64748b', fontSize: '14px', textAlign: 'center', padding: '40px 0' }}>No notifications found.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredNotifications.map(n => (
            <div key={n.id} onClick={() => markNotificationAsRead(n.id)} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', backgroundColor: n.unread ? '#f8fafc' : '#fff', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{n.title}</h4>
                  {n.unread && <span style={{ width: '8px', height: '8px', backgroundColor: '#2563eb', borderRadius: '50%' }} />}
                </div>
                <p style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: 1.4 }}>{n.body}</p>
              </div>
              <span style={{ fontSize: '11px', color: '#94a3b8', whiteSpace: 'nowrap' }}>{n.timestamp ? new Date(n.timestamp).toLocaleDateString() : ''}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}