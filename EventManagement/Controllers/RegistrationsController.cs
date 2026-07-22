using EventManagement.Data;
using EventManagement.Models;
using EventSync.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EventManagement.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class RegistrationsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public RegistrationsController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/registrations
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Registration>>> GetRegistrations()
        {
            return await _context.Registrations.Include(r => r.Event).ToListAsync();
        }

        // GET: api/registrations/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Registration>> GetRegistration(string id)
        {
            var registration = await _context.Registrations.Include(r => r.Event)
                                                           .FirstOrDefaultAsync(r => r.Id == id);

            if (registration == null)
            {
                return NotFound(new { message = $"Registration {id} not found." });
            }

            return registration;
        }

        // POST: api/registrations
        [HttpPost]
        public async Task<ActionResult<Registration>> PostRegistration(Registration registration)
        {
            var targetEvent = await _context.Events.FindAsync(registration.EventId);
            if (targetEvent == null)
            {
                return BadRequest(new { message = "Cannot register for a non-existent event." });
            }

            if (targetEvent.Registered >= targetEvent.Capacity)
            {
                return BadRequest(new { message = "Registration failed. This event is at maximum capacity." });
            }

            // 1. Increment event registration counter
            targetEvent.Registered += 1;

            // 2. Generate a clean random alphanumeric string for ID if not provided
            if (string.IsNullOrEmpty(registration.Id))
            {
                registration.Id = "REG-" + Guid.NewGuid().ToString().Substring(0, 6).ToUpper();
            }
            registration.RegistrationDate = DateTime.UtcNow;

            // 3. AUTOMATION: Create the corresponding Attendance entry for the gate sheet
            var attendanceRecord = new Attendance
            {
                Id = "ATT-" + Guid.NewGuid().ToString().Substring(0, 6).ToUpper(),
                EventId = registration.EventId,
                Name = registration.Name,
                TicketCode = "TKT-" + Guid.NewGuid().ToString().Substring(0, 8).ToUpper(),
                CheckedIn = false,
                Time = "--:--"
            };

            _context.Registrations.Add(registration);
            _context.Attendances.Add(attendanceRecord); // Save both in a single database transaction

            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetRegistration), new { id = registration.Id }, registration);
        }

        // DELETE: api/registrations/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteRegistration(string id)
        {
            var registration = await _context.Registrations.FindAsync(id);
            if (registration == null)
            {
                return NotFound(new { message = $"Registration {id} not found." });
            }

            var targetEvent = await _context.Events.FindAsync(registration.EventId);
            if (targetEvent != null && targetEvent.Registered > 0)
            {
                targetEvent.Registered -= 1;
            }

            // AUTOMATION: Clean up their attendance record if they cancel their registration
            var matchingAttendance = await _context.Attendances
                .FirstOrDefaultAsync(a => a.EventId == registration.EventId && a.Name == registration.Name);

            if (matchingAttendance != null)
            {
                _context.Attendances.Remove(matchingAttendance);
            }

            _context.Registrations.Remove(registration);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}