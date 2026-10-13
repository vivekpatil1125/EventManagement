import { useMemo, useState } from 'react';
import { downloadEventReport } from '../../utils/exportEventReport';

export default function ReportExportPanel({ events, registrations, attendance, department }) {
  const [reportType, setReportType] = useState('attendees');
  const [eventId, setEventId] = useState('all');
  const [exportError, setExportError] = useState('');

  const reportCount = useMemo(() => {
    const eventIds = eventId === 'all'
      ? new Set(events.map((event) => Number(event.id ?? event.Id)))
      : new Set([Number(eventId)]);
    return registrations.filter((registration) => {
      const relatedEvent = registration.event || registration.Event || {};
      const registrationEventId = Number(registration.eventId ?? registration.EventId ?? relatedEvent.id ?? relatedEvent.Id);
      return eventIds.has(registrationEventId);
    }).length;
  }, [eventId, events, registrations]);

  const handleDownload = (format) => {
    setExportError('');
    try {
      downloadEventReport({ format, reportType, eventId, events, registrations, attendance, department });
    } catch (error) {
      console.error('Unable to create event report:', error);
      setExportError('The report could not be created. Please try again.');
    }
  };

  return (
    <section className="report-export-panel" aria-label="Download event reports">
      <div className="report-export-heading">
        <div>
          <h4>Download reports</h4>
          <p>Export attendee or registration details for your department.</p>
        </div>
        <span className="report-export-count">{reportCount} {reportCount === 1 ? 'record' : 'records'}</span>
      </div>

      <div className="report-export-controls">
        <label>
          <span>Report type</span>
          <select value={reportType} onChange={(event) => setReportType(event.target.value)}>
            <option value="attendees">Attendee list</option>
            <option value="registrations">Registration log</option>
          </select>
        </label>
        <label>
          <span>Event</span>
          <select value={eventId} onChange={(event) => setEventId(event.target.value)}>
            <option value="all">All department events</option>
            {events.map((event, index) => {
              const id = event.id ?? event.Id;
              return <option key={id ?? index} value={id}>{event.title || event.Title || event.name || event.Name || 'Event'}</option>;
            })}
          </select>
        </label>
        <div className="report-export-actions">
          <button type="button" onClick={() => handleDownload('excel')} disabled={reportCount === 0}>
            <span aria-hidden="true">↓</span> Excel (CSV)
          </button>
          <button type="button" onClick={() => handleDownload('pdf')} disabled={reportCount === 0}>
            <span aria-hidden="true">↓</span> PDF
          </button>
        </div>
      </div>
      <p className="report-export-note">Payment amounts are not stored in the system, so financial totals cannot be included in these reports.</p>
      {exportError && <p className="report-export-error" role="alert">{exportError}</p>}
    </section>
  );
}
