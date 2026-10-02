import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';

export default function CertificatesTab() {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCert, setSelectedCert] = useState(null);
  const certRef = useRef(null);

  useEffect(() => {
    fetchRegistrations();
  }, []);

  const fetchRegistrations = async () => {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'https://localhost:7165';
      const response = await fetch(`${apiBaseUrl}/api/registrations`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = await response.json();
      const earned = data.filter(r => r.isCheckedIn === true || r.IsCheckedIn === true);
      setCertificates(earned);
    } catch (err) {
      console.error('Failed to fetch certificates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!certRef.current) return;
    try {
      const canvas = await html2canvas(certRef.current, { scale: 2, useCORS: true });
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `Certificate-${selectedCert?.event?.title || 'Event'}.png`;
      link.click();
    } catch (err) {
      console.error('Error generating certificate image:', err);
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading certificates...</div>;
  }

  return (
    <section className="events-panel" style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0' }}>
      <h3 style={{ marginBottom: '16px', fontWeight: 700, color: '#1e293b' }}>Earned Participation Certificates</h3>
      
      {certificates.length === 0 ? (
        <p style={{ color: '#64748b', fontSize: '14px', textAlign: 'center', padding: '40px 0' }}>
          No certificates issued yet. Certificates become available once your attendance is checked in for completed events.
        </p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {certificates.map((cert) => (
            <div key={cert.id} style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#f8fafc' }}>
              <div>
                <span style={{ fontSize: '11px', background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>Verified</span>
                <h4 style={{ margin: '12px 0 8px 0', color: '#0f172a', fontSize: '16px' }}>{cert.event?.title || 'Corporate Event'}</h4>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 4px 0' }}>Issued to: <strong>{cert.name}</strong></p>
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>Date: {new Date(cert.checkedInAt || cert.registrationDate).toLocaleDateString()}</p>
              </div>
              <button 
                onClick={() => setSelectedCert(cert)}
                style={{ marginTop: '16px', backgroundColor: '#0f172a', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 500, fontSize: '13px' }}
              >
                View & Download Certificate
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Certificate Modal / Previewer */}
      {selectedCert && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px', maxWidth: '850px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            
            {/* Hidden/Rendered Certificate Design Template */}
            <div 
              ref={certRef}
              style={{ 
                width: '800px', 
                height: '560px', 
                padding: '40px', 
                background: 'linear-gradient(135deg, #fdfbf7 0%, #f4f1ea 100%)', 
                border: '10px solid #1e293b', 
                position: 'relative', 
                boxSizing: 'border-box',
                fontFamily: 'serif',
                textAlign: 'center',
                margin: '0 auto'
              }}
            >
              {/* Inner Border Decor */}
              <div style={{ border: '2px solid #d4af37', height: '100%', padding: '30px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box' }}>
                
                {/* Header */}
                <div>
                  <h5 style={{ margin: 0, letterSpacing: '3px', textTransform: 'uppercase', color: '#475569', fontSize: '14px', fontWeight: 600 }}>EventSync Academy & Certification</h5>
                  <h1 style={{ margin: '15px 0 5px 0', fontSize: '36px', color: '#0f172a', fontWeight: 'bold', fontFamily: 'Georgia, serif' }}>Certificate of Completion</h1>
                  <p style={{ margin: 0, fontStyle: 'italic', color: '#64748b', fontSize: '14px' }}>This is proudly presented to</p>
                </div>

                {/* Recipient */}
                <div>
                  <h2 style={{ borderBottom: '2px solid #94a3b8', display: 'inline-block', minWidth: '400px', margin: '10px 0', fontSize: '30px', color: '#1e293b', paddingBottom: '5px' }}>
                    {selectedCert.name}
                  </h2>
                  <p style={{ margin: '10px 0 0 0', color: '#475569', fontSize: '15px', lineHeight: '1.5' }}>
                    for successfully participating and completing the verified event requirements for<br/>
                    <strong style={{ fontSize: '20px', color: '#0f172a' }}>{selectedCert.event?.title || 'Professional Event'}</strong>
                  </p>
                </div>

                {/* Footer Signatures */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', padding: '0 40px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>{new Date(selectedCert.checkedInAt).toLocaleDateString()}</p>
                    <div style={{ width: '150px', height: '1px', background: '#94a3b8', margin: '5px auto' }}></div>
                    <p style={{ margin: 0, fontSize: '12px', fontWeight: 'bold', color: '#334155' }}>Date Issued</p>
                  </div>
                  
                  <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#d4af37', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                    Verified
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <p style={{ margin: 0, fontStyle: 'italic', fontFamily: 'Brush Script MT, cursive', fontSize: '22px', color: '#1e293b' }}>EventSync Auth</p>
                    <div style={{ width: '150px', height: '1px', background: '#94a3b8', margin: '5px auto' }}></div>
                    <p style={{ margin: 0, fontSize: '12px', fontWeight: 'bold', color: '#334155' }}>Authorized Signature</p>
                  </div>
                </div>

              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
              <button 
                onClick={() => setSelectedCert(null)}
                style={{ backgroundColor: '#e2e8f0', color: '#334155', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
              >
                Close
              </button>
              <button 
                onClick={handleDownload}
                style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
              >
                Download Certificate (PNG)
              </button>
            </div>

          </div>
        </div>
      )}
    </section>
  );
}

//npm install html2canvas