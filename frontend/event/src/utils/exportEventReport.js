import { jsPDF } from 'jspdf';

const getValue = (item, ...keys) => keys.reduce((value, key) => value ?? item?.[key], undefined);

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString();
};

export function buildEventReportRows({ eventId, events, registrations, attendance }) {
  const selectedEventId = eventId === 'all' ? null : Number(eventId);
  const reportEvents = events.filter((event) =>
    selectedEventId === null || Number(getValue(event, 'id', 'Id')) === selectedEventId
  );
  const eventsById = new Map(reportEvents.map((event) => [
    Number(getValue(event, 'id', 'Id')),
    event
  ]));

  return registrations
    .filter((registration) => {
      const registrationEventId = Number(
        getValue(registration, 'eventId', 'EventId') ??
        getValue(getValue(registration, 'event', 'Event'), 'id', 'Id')
      );
      return eventsById.has(registrationEventId);
    })
    .map((registration) => {
      const registrationEventId = Number(
        getValue(registration, 'eventId', 'EventId') ??
        getValue(getValue(registration, 'event', 'Event'), 'id', 'Id')
      );
      const event = eventsById.get(registrationEventId);
      const registrationId = getValue(registration, 'id', 'Id') || '';
      const attendeeName = getValue(registration, 'name', 'Name', 'fullName', 'FullName') || 'Attendee';
      const attendeeEmail = getValue(registration, 'email', 'Email') || '';
      const attendeeAttendance = attendance.find((record) => {
        const attendanceEventId = Number(
          getValue(record, 'eventId', 'EventId') ??
          getValue(getValue(record, 'event', 'Event'), 'id', 'Id')
        );
        if (attendanceEventId !== registrationEventId) return false;

        const ticketCode = getValue(record, 'ticketCode', 'TicketCode');
        const name = getValue(record, 'name', 'Name');
        return ticketCode === registrationId || name === attendeeEmail || name === attendeeName;
      });
      const checkedIn = Boolean(
        getValue(registration, 'isCheckedIn', 'IsCheckedIn', 'checkedIn', 'CheckedIn') ||
        getValue(attendeeAttendance, 'checkedIn', 'CheckedIn')
      );

      return {
        registrationId,
        attendeeName,
        attendeeEmail,
        eventName: getValue(event, 'title', 'Title', 'name', 'Name') || 'Event',
        department: getValue(event, 'department', 'Department') || '',
        ticketTier: getValue(registration, 'tier', 'Tier') || 'Standard',
        registrationDate: formatDate(getValue(registration, 'registrationDate', 'RegistrationDate')),
        registrationStatus: getValue(registration, 'status', 'Status') || '',
        checkInStatus: checkedIn ? 'Checked in' : 'Not checked in',
        checkInTime: formatDate(
          getValue(registration, 'checkedInAt', 'CheckedInAt') ||
          getValue(attendeeAttendance, 'time', 'Time')
        )
      };
    })
    .sort((left, right) => left.attendeeName.localeCompare(right.attendeeName));
}

const attendeeColumns = [
  { key: 'attendeeName', label: 'Attendee' },
  { key: 'attendeeEmail', label: 'Email' },
  { key: 'eventName', label: 'Event' },
  { key: 'department', label: 'Department' },
  { key: 'ticketTier', label: 'Pass' },
  { key: 'checkInStatus', label: 'Attendance' }
];

const registrationColumns = [
  { key: 'registrationId', label: 'Registration ID' },
  { key: 'attendeeName', label: 'Attendee' },
  { key: 'attendeeEmail', label: 'Email' },
  { key: 'eventName', label: 'Event' },
  { key: 'department', label: 'Department' },
  { key: 'ticketTier', label: 'Pass' },
  { key: 'registrationDate', label: 'Registered' },
  { key: 'registrationStatus', label: 'Registration status' },
  { key: 'checkInStatus', label: 'Attendance' },
  { key: 'checkInTime', label: 'Check-in time' }
];

const safeSpreadsheetValue = (value) => {
  const text = String(value ?? '');
  return /^[=+\-@]/.test(text.trimStart()) ? `'${text}` : text;
};

export function downloadEventReport({ format, reportType, eventId, events, registrations, attendance, department }) {
  const rows = buildEventReportRows({ reportType, eventId, events, registrations, attendance });
  const columns = reportType === 'attendees' ? attendeeColumns : registrationColumns;
  const selectedEvent = eventId === 'all'
    ? null
    : events.find((event) => Number(getValue(event, 'id', 'Id')) === Number(eventId));
  const eventName = selectedEvent
    ? getValue(selectedEvent, 'title', 'Title', 'name', 'Name') || 'event'
    : 'all-events';
  const safeName = `${eventName}-${reportType}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || reportType;
  const title = reportType === 'attendees' ? 'Event Attendee List' : 'Event Registration Log';

  if (format === 'excel') {
    const escapeCsv = (value) => `"${safeSpreadsheetValue(value).replace(/"/g, '""')}"`;
    const csv = [
      columns.map((column) => escapeCsv(column.label)).join(','),
      ...rows.map((row) => columns.map((column) => escapeCsv(row[column.key])).join(','))
    ].join('\r\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${safeName}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    return;
  }

  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const margin = 10;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const contentWidth = pageWidth - margin * 2;
  const widths = reportType === 'attendees'
    ? [42, 57, 50, 39, 30, 59]
    : [32, 35, 43, 39, 32, 21, 39, 36, 29, 21];
  const scale = contentWidth / widths.reduce((sum, width) => sum + width, 0);
  const columnWidths = widths.map((width) => width * scale);
  const subtitle = `${department || 'Department'} · ${selectedEvent ? eventName : 'All events'} · ${rows.length} records`;
  let y = 17;

  const drawPageHeading = () => {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.setTextColor(15, 23, 42);
    pdf.text(title, margin, y);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    pdf.text(subtitle, margin, y + 6);
    pdf.text('Payment amounts are not stored in the system and are not included in this report.', margin, y + 11);
    y += 17;
  };

  const drawTableHeader = () => {
    let x = margin;
    const height = 9;
    pdf.setFillColor(241, 245, 249);
    pdf.rect(margin, y, contentWidth, height, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    pdf.setTextColor(51, 65, 85);
    columns.forEach((column, index) => {
      pdf.text(column.label, x + 2, y + 5.8);
      x += columnWidths[index];
    });
    y += height;
  };

  drawPageHeading();
  drawTableHeader();

  if (rows.length === 0) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(100, 116, 139);
    pdf.text('No registrations found for this report.', margin + 2, y + 8);
  }

  rows.forEach((row, rowIndex) => {
    const cellLines = columns.map((column, index) =>
      pdf.splitTextToSize(String(row[column.key] || '—'), columnWidths[index] - 4)
    );
    const rowHeight = Math.max(8, ...cellLines.map((lines) => lines.length * 3.3 + 4));
    if (y + rowHeight > pageHeight - 10) {
      pdf.addPage();
      y = 17;
      drawPageHeading();
      drawTableHeader();
    }

    if (rowIndex % 2 === 1) {
      pdf.setFillColor(250, 251, 252);
      pdf.rect(margin, y, contentWidth, rowHeight, 'F');
    }
    pdf.setDrawColor(226, 232, 240);
    pdf.line(margin, y + rowHeight, margin + contentWidth, y + rowHeight);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(51, 65, 85);
    let x = margin;
    cellLines.forEach((lines, index) => {
      pdf.text(lines, x + 2, y + 4, { lineHeightFactor: 1.15 });
      x += columnWidths[index];
    });
    y += rowHeight;
  });

  pdf.save(`${safeName}.pdf`);
}
