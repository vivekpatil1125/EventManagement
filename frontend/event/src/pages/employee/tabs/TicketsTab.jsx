import React from 'react';

export default function TicketsTab({ filteredRegistered, qrCodes, handleDownloadPDF, handleCheckIn, actionLoading, formatDateString, getTypeTheme }) {
  return (
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
            
            // Map the property correctly from the backend API response
            const isCheckedIn = t.isCheckedIn ?? t.checkedIn;

            return (
              <div key={t.ticketCode || t.id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', background: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <span className={`tag ${getTypeTheme(t.type)}`}>{t.type}</span>
                    <span style={{ fontSize: '11px', fontFamily: 'monospace', background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', fontWeight: 600, color: '#475569' }}>{t.ticketCode}</span>
                  </div>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', fontWeight: 700 }}>{t.title}</h4>
                  <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#64748b' }}>{formatDateString(t.date)} | {t.location || 'Remote'}</p>
                  
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center', background: '#f8fafc', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
                    {localQrSrc && <img src={localQrSrc} alt="Ticket QR" style={{ width: '80px', height: '80px', borderRadius: '4px' }} />}
                    <div style={{ fontSize: '12px', color: '#475569' }}>
                      <p style={{ margin: '0 0 4px 0', fontWeight: 700 }}>{t.attendeeName}</p>
                      <p style={{ margin: '0 0 4px 0', color: '#64748b' }}>{t.attendeeEmail}</p>
                      <p style={{ margin: 0, color: isCheckedIn ? '#16a34a' : '#ca8a04', fontWeight: 600 }}>
                        {isCheckedIn ? '✓ Checked In' : '• Pending Check-In'}
                      </p>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => handleDownloadPDF(t)}
                    style={{ flex: 1, padding: '10px', background: '#1e3a8a', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                  >
                    Download Pass PDF
                  </button>
                  {/* Hide button completely when checked in */}
                  {!isCheckedIn && (
                    <button 
                      onClick={() => handleCheckIn(t.id)}
                      disabled={actionLoading}
                      style={{ padding: '10px 16px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                    >
                      Check In
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}