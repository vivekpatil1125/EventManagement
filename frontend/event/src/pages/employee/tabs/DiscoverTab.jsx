import React from 'react';

export default function DiscoverTab({ filteredDiscover, handleOpenRegistrationModal, formatDateString, getTypeTheme }) {
  return (
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
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>{formatDateString(e.date)} | {e.location || 'TBD'}</p>
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
  );
}