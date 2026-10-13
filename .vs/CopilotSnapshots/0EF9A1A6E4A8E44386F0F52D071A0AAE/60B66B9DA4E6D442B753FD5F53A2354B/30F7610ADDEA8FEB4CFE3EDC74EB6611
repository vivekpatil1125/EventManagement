using EventManagement.Data;
using EventManagement.Models;
using EventSync.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace EventManagement.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AttendanceController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public AttendanceController(ApplicationDbContext context)
        {
            _context = context;
        }

        private Task<string> GetNextAttendanceIdAsync()
        {
            return Task.FromResult(Guid.NewGuid().ToString());
        }

        // GET: api/attendance
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Attendance>>> GetAttendance()
        {
            var userEmail = User.FindFirstValue(ClaimTypes.Email)
                           ?? User.FindFirstValue(ClaimTypes.Name)
                           ?? User.Identity?.Name;

            var currentUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == userEmail);

            // 1. ORGANIZER: Sees attendance records ONLY for events in their Department
            if (currentUser != null && currentUser.Role == UserRole.Organizer)
            {
                var departmentAttendance = await _context.Attendances
                    .Include(a => a.Event)
                    .Where(a => a.Event != null && a.Event.Department == currentUser.Department)
                    .ToListAsync();

                return Ok(departmentAttendance);
            }

            // 2. EMPLOYEE: Sees ONLY their own check-in/attendance logs
            if (currentUser != null && currentUser.Role == UserRole.Employee)
            {
                var employeeAttendance = await _context.Attendances
                    .Include(a => a.Event)
                    .Where(a => a.Name == currentUser.Email ||
                                a.Name == currentUser.FullName ||
                                a.TicketCode == currentUser.Email)
                    .ToListAsync();

                return Ok(employeeAttendance);
            }

            // 3. ADMIN: Sees all system attendance records
            var allAttendances = await _context.Attendances
                .Include(a => a.Event)
                .ToListAsync();

            return Ok(allAttendances);
        }

        // POST: api/attendance/check-in/{eventId}
        [HttpPost("check-in/{eventId}")]
        public async Task<IActionResult> CheckIn(string eventId)
        {
            var userEmail = User.FindFirstValue(ClaimTypes.Email)
                           ?? User.FindFirstValue(ClaimTypes.Name)
                           ?? User.Identity?.Name ?? "Employee";

            int numericEventId = 0;
            bool isNumeric = int.TryParse(eventId, out numericEventId);

            var registration = await _context.Registrations
                .Include(r => r.Event)
                .FirstOrDefaultAsync(r =>
                    (r.Id == eventId || (isNumeric && r.EventId == numericEventId)) &&
                    r.Email == userEmail);

            var targetEvent = registration?.Event ?? await _context.Events
                .FirstOrDefaultAsync(e => (isNumeric && e.Id == numericEventId) || e.Id.ToString() == eventId);

            if (targetEvent == null)
            {
                return NotFound(new { message = "Event not found." });
            }

            var registrationId = registration?.Id;

            var existingAttendance = await _context.Attendances
                .FirstOrDefaultAsync(a => a.EventId == targetEvent.Id && (a.Name == userEmail || a.TicketCode == eventId || a.TicketCode == userEmail || a.TicketCode == registrationId));

            if (existingAttendance != null && existingAttendance.CheckedIn)
            {
                if (registration != null && !registration.IsCheckedIn)
                {
                    registration.IsCheckedIn = true;
                    registration.CheckedInAt = DateTime.TryParse(existingAttendance.Time, out var checkedInAt)
                        ? checkedInAt
                        : DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                }

                return Ok(new
                {
                    message = "Already checked in for this event.",
                    checkedInAt = registration?.CheckedInAt ?? DateTime.UtcNow
                });
            }

            if (existingAttendance != null)
            {
                existingAttendance.CheckedIn = true;
                existingAttendance.Time = DateTime.UtcNow.ToString("O");
                existingAttendance.Name = userEmail;
                existingAttendance.TicketCode = registrationId ?? eventId;
            }
            else
            {
                var attendance = new Attendance
                {
                    Id = await GetNextAttendanceIdAsync(),
                    EventId = targetEvent.Id,
                    Name = userEmail,
                    TicketCode = registrationId ?? eventId,
                    CheckedIn = true,
                    Time = DateTime.UtcNow.ToString("O")
                };
                _context.Attendances.Add(attendance);
            }

            if (registration != null)
            {
                registration.IsCheckedIn = true;
                registration.CheckedInAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Successfully checked in for the event!",
                checkedInAt = registration?.CheckedInAt ?? DateTime.UtcNow
            });
        }

        // PUT: api/attendance/{id}/toggle
        [HttpPut("{id}/toggle")]
        public async Task<IActionResult> ToggleCheckIn(string id)
        {
            var record = await _context.Attendances.FindAsync(id);
            if (record == null)
            {
                return NotFound(new { message = "Attendance record not found." });
            }

            record.CheckedIn = !record.CheckedIn;
            record.Time = DateTime.UtcNow.ToString("O");

            await _context.SaveChangesAsync();
            return Ok(record);
        }

        // POST: api/attendance
        [HttpPost]
        public async Task<ActionResult<Attendance>> PostAttendance(Attendance attendance)
        {
            attendance.Id = string.IsNullOrWhiteSpace(attendance.Id) ? await GetNextAttendanceIdAsync() : attendance.Id;

            _context.Attendances.Add(attendance);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetAttendance), new { id = attendance.Id }, attendance);
        }

        // DELETE: api/attendance/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteAttendance(string id)
        {
            var record = await _context.Attendances.FindAsync(id);
            if (record == null)
            {
                return NotFound(new { message = "Record not found." });
            }

            _context.Attendances.Remove(record);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}