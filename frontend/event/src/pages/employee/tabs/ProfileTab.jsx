import React from 'react';

export default function ProfileTab({ currentUser }) {
  return (
    <section className="events-panel" style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0', maxWidth: '600px' }}>
      <h3 style={{ marginBottom: '20px', fontWeight: 700 }}>Employee Profile Settings</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '6px' }}>FULL NAME</label>
          <input type="text" value={currentUser.name} readOnly style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#f8fafc', color: '#0f172a', fontWeight: 600 }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '6px' }}>EMAIL ADDRESS</label>
          <input type="text" value={currentUser.email} readOnly style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#f8fafc', color: '#0f172a', fontWeight: 600 }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '6px' }}>SYSTEM ROLE</label>
          <input type="text" value={currentUser.role} readOnly style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#f8fafc', color: '#0f172a', fontWeight: 600 }} />
        </div>
      </div>
    </section>
  );
}