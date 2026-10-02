import React from 'react';

export default function MyEventsTab({ filteredRegistered, formatDateString, getTypeTheme }) {
  return (
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
  );
}