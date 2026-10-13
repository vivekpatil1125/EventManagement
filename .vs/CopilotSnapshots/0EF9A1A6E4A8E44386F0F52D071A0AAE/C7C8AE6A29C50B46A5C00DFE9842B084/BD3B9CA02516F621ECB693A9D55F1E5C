using EventManagement.Data;
using EventManagement.Models;
using EventSync.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Security.Claims;
using System.Threading.Tasks;

using RegistrationEntity = EventSync.Models.Registration;

namespace EventManagement.Controllers
{
    [Authorize]
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
        public async Task<IActionResult> GetRegistrations()
        {
            var userEmail = User.FindFirstValue(ClaimTypes.Email)
                           ?? User.FindFirstValue(ClaimTypes.Name)
                           ?? User.FindFirstValue("email")
                           ?? User.Identity?.Name;

            var currentUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == userEmail);

            if (currentUser != null && currentUser.Role == UserRole.Organizer)
            {
                var departmentRegistrations = await _context.Registrations
                    .Include(r => r.Event)
                    .Where(r => r.Event != null && r.Event.Department == currentUser.Department)
                    .ToListAsync();

                return Ok(departmentRegistrations);
            }

            if (currentUser != null && currentUser.Role == UserRole.Employee)
            {
                var userRegistrations = await _context.Registrations
                    .Include(r => r.Event)
                    .Where(r => r.Email == currentUser.Email)
                    .ToListAsync();

                return Ok(userRegistrations);
            }

            // Fallback safety: if user isn't found in database entity but we have a token email, filter by it anyway!
            if (!string.IsNullOrEmpty(userEmail))
            {
                var fallbackRegistrations = await _context.Registrations
                    .Include(r => r.Event)
                    .Where(r => r.Email == userEmail)
                    .ToListAsync();

                return Ok(fallbackRegistrations);
            }

            return Unauthorized(new { message = "Unable to identify user from token claims." });
        }

        // POST: api/registrations
        [HttpPost]
        public async Task<IActionResult> CreateRegistration([FromBody] EventRegisterDto dto)
        {
            if (dto == null)
            {
                return BadRequest(new { message = "Registration data is required." });
            }

            var targetEvent = await _context.Events.FindAsync(dto.EventId);
            if (targetEvent == null)
            {
                return NotFound(new { message = $"Event with ID {dto.EventId} not found." });
            }

            var attendeeEmail = !string.IsNullOrEmpty(dto.Email)
                ? dto.Email
                : (User.FindFirstValue(ClaimTypes.Email) ?? User.Identity?.Name ?? "employee@eventsync.com");

            var attendeeName = !string.IsNullOrEmpty(dto.Name)
                ? dto.Name
                : (User.FindFirstValue(ClaimTypes.Name) ?? "Attendee");

            var newRegistration = new RegistrationEntity
            {
                Id = Guid.NewGuid().ToString(),
                Name = attendeeName,
                Email = attendeeEmail,
                EventId = dto.EventId,
                Tier = string.IsNullOrEmpty(dto.Tier) ? "Standard" : dto.Tier,
                RegistrationDate = DateTime.UtcNow,
                Status = "Confirmed",
                IsCheckedIn = false
            };

            _context.Registrations.Add(newRegistration);
            targetEvent.Registered += 1;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Registration successful!",
                registrationId = newRegistration.Id
            });
        }

        // POST: api/registrations/{id}/check-in
        [HttpPost("{id}/check-in")]
        public async Task<IActionResult> CheckIn(string id)
        {
            try
            {
                var registration = await _context.Registrations
                    .Include(r => r.Event)
                    .FirstOrDefaultAsync(r => r.Id == id);

                if (registration == null)
                {
                    return NotFound(new { message = "Registration record not found." });
                }

                if (registration.IsCheckedIn)
                {
                    return BadRequest(new { message = "You are already checked in for this event." });
                }

                registration.IsCheckedIn = true;
                registration.CheckedInAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    message = "Check-in successful!",
                    isCheckedIn = true,
                    checkedInAt = registration.CheckedInAt
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Internal server error during check-in.", details = ex.Message });
            }
        }
    }

    public class EventRegisterDto
    {
        public int EventId { get; set; }
        public string? Name { get; set; }
        public string? Email { get; set; }
        public string? Tier { get; set; }
    }
}