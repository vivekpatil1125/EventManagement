using EventManagement.Data;
using EventManagement.Models;
using EventSync.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

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

        // GET: api/attendance
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Attendance>>> GetAttendance()
        {
            return await _context.Attendances.Include(a => a.Event).ToListAsync();
        }

        // PUT: api/attendance/ATT-XX/toggle
        [HttpPut("{id}/toggle")]
        public async Task<IActionResult> ToggleCheckIn(string id)
        {
            var record = await _context.Attendances.FindAsync(id);
            if (record == null)
            {
                return NotFound(new { message = "Attendance record not found." });
            }

            // Toggle state
            record.CheckedIn = !record.CheckedIn;
            record.Time = record.CheckedIn ? DateTime.Now.ToString("HH:mm") : "--:--";

            await _context.SaveChangesAsync();
            return Ok(record);
        }

        // POST: api/attendance
        [HttpPost]
        public async Task<ActionResult<Attendance>> PostAttendance(Attendance attendance)
        {
            _context.Attendances.Add(attendance);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetAttendance), new { id = attendance.Id }, attendance);
        }

        // DELETE: api/attendance/ATT-XX
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