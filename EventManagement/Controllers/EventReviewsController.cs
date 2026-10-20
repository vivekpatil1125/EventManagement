using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using EventManagement.Data;
using EventManagement.Models;
using EventSync.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EventManagement.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/reviews")]
    public class EventReviewsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public EventReviewsController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetReviews()
        {
            var userEmail = User.FindFirstValue(ClaimTypes.Email)
                ?? User.FindFirstValue(ClaimTypes.Name)
                ?? User.FindFirstValue("email")
                ?? User.Identity?.Name;

            if (string.IsNullOrWhiteSpace(userEmail))
            {
                return Forbid();
            }

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == userEmail);
            if (user == null || (user.Role != UserRole.Organizer && user.Role != UserRole.Admin))
            {
                return Forbid();
            }

            var reviews = _context.EventReviews
                .AsNoTracking()
                .AsQueryable();

            if (user.Role == UserRole.Organizer)
            {
                reviews = reviews.Where(r => _context.Events.Any(e =>
                    e.Id == r.EventId &&
                    (e.Department == user.Department ||
                     e.Department == EventDepartments.AllDepartments)));
            }

            var results = await reviews
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new
                {
                    r.Id,
                    r.EmployeeName,
                    r.EmployeeEmail,
                    r.EventId,
                    r.EventName,
                    r.Rating,
                    r.Comment,
                    r.CreatedAt
                })
                .ToListAsync();

            return Ok(results);
        }

        [HttpGet("checked-in-events")]
        public async Task<IActionResult> GetCheckedInEvents()
        {
            var employee = await GetCurrentEmployeeAsync();
            if (employee == null)
            {
                return Forbid();
            }

            var registrationEvents = await _context.Registrations
                .Where(r => r.Email == employee.Email && r.IsCheckedIn)
                .Select(r => new CheckedInEvent
                {
                    EventId = r.EventId,
                    EventName = r.Event!.Title,
                    EventDate = r.Event.Date,
                    Location = r.Event.Location,
                    CheckedInAt = r.CheckedInAt
                })
                .ToListAsync();

            var attendanceEvents = await _context.Attendances
                .Where(a => a.Name == employee.Email && a.CheckedIn)
                .Select(a => new CheckedInEvent
                {
                    EventId = a.EventId,
                    EventName = a.Event.Title,
                    EventDate = a.Event.Date,
                    Location = a.Event.Location,
                    CheckedInAt = null
                })
                .ToListAsync();

            var checkedInEvents = registrationEvents
                .Concat(attendanceEvents)
                .GroupBy(e => e.EventId)
                .Select(group => group.FirstOrDefault(e => e.CheckedInAt.HasValue) ?? group.First())
                .OrderByDescending(e => e.EventDate)
                .ToList();

            var eventIds = checkedInEvents.Select(e => e.EventId).ToList();
            var reviews = await _context.EventReviews
                .Where(r => r.EmployeeEmail == employee.Email && eventIds.Contains(r.EventId))
                .ToDictionaryAsync(r => r.EventId);

            return Ok(checkedInEvents.Select(e => new
            {
                e.EventId,
                e.EventName,
                e.EventDate,
                e.Location,
                e.CheckedInAt,
                Review = reviews.TryGetValue(e.EventId, out var review)
                    ? new
                    {
                        review.Id,
                        review.Rating,
                        review.Comment,
                        review.CreatedAt
                    }
                    : null
            }));
        }

        [HttpPost]
        public async Task<IActionResult> CreateReview([FromBody] CreateEventReviewRequest request)
        {
            var employee = await GetCurrentEmployeeAsync();
            if (employee == null)
            {
                return Forbid();
            }

            var hasCheckedIn = await _context.Registrations.AnyAsync(r =>
                    r.EventId == request.EventId &&
                    r.Email == employee.Email &&
                    r.IsCheckedIn)
                || await _context.Attendances.AnyAsync(a =>
                    a.EventId == request.EventId &&
                    a.Name == employee.Email &&
                    a.CheckedIn);

            if (!hasCheckedIn)
            {
                return Conflict(new { message = "You can review only events you have checked in to." });
            }

            var eventDetails = await _context.Events
                .Where(e => e.Id == request.EventId)
                .Select(e => new { e.Id, e.Title })
                .FirstOrDefaultAsync();

            if (eventDetails == null)
            {
                return NotFound(new { message = "Event not found." });
            }

            if (await _context.EventReviews.AnyAsync(r =>
                    r.EventId == request.EventId &&
                    r.EmployeeEmail == employee.Email))
            {
                return Conflict(new { message = "You have already reviewed this event." });
            }

            var review = new EventReview
            {
                EmployeeName = employee.FullName,
                EmployeeEmail = employee.Email,
                EventId = eventDetails.Id,
                EventName = eventDetails.Title,
                Rating = request.Rating,
                Comment = string.IsNullOrWhiteSpace(request.Comment) ? null : request.Comment.Trim(),
                CreatedAt = DateTime.UtcNow
            };

            _context.EventReviews.Add(review);
            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                var duplicateReviewExists = await _context.EventReviews.AnyAsync(r =>
                    r.EventId == request.EventId &&
                    r.EmployeeEmail == employee.Email);

                if (duplicateReviewExists)
                {
                    return Conflict(new { message = "You have already reviewed this event." });
                }

                throw;
            }

            return CreatedAtAction(nameof(GetCheckedInEvents), new { }, new
            {
                review.Id,
                review.EmployeeName,
                review.EmployeeEmail,
                review.EventId,
                review.EventName,
                review.Rating,
                review.Comment,
                review.CreatedAt
            });
        }

        private async Task<User?> GetCurrentEmployeeAsync()
        {
            var userEmail = User.FindFirstValue(ClaimTypes.Email)
                ?? User.FindFirstValue(ClaimTypes.Name)
                ?? User.FindFirstValue("email")
                ?? User.Identity?.Name;

            if (string.IsNullOrWhiteSpace(userEmail))
            {
                return null;
            }

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == userEmail);
            return user?.Role == UserRole.Employee ? user : null;
        }

        private sealed class CheckedInEvent
        {
            public int EventId { get; init; }
            public string EventName { get; init; } = string.Empty;
            public DateTime EventDate { get; init; }
            public string Location { get; init; } = string.Empty;
            public DateTime? CheckedInAt { get; init; }
        }
    }

    public class CreateEventReviewRequest
    {
        [Range(1, 5)]
        public int Rating { get; set; }

        [Range(1, int.MaxValue)]
        public int EventId { get; set; }

        [StringLength(1000)]
        public string? Comment { get; set; }
    }
}
