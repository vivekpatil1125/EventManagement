using EventManagement.Data;
using EventManagement.Models;
using EventSync.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace EventManagement.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/[controller]")]
    public class AnnouncementsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public AnnouncementsController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/announcements
        [HttpGet]
        public async Task<IActionResult> GetAnnouncements()
        {
            var announcements = await _context.Announcements
                .AsNoTracking()
                .OrderByDescending(a => a.Timestamp)
                .ToListAsync();

            return Ok(announcements);
        }

        // POST: api/announcements
        [HttpPost]
        public async Task<IActionResult> PostAnnouncement([FromBody] Announcement announcement)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var userEmail = User.FindFirstValue(ClaimTypes.Email)
                ?? User.FindFirstValue(ClaimTypes.Name)
                ?? User.FindFirstValue("email")
                ?? User.Identity?.Name;
            var currentUser = string.IsNullOrWhiteSpace(userEmail)
                ? null
                : await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Email == userEmail);

            if (currentUser == null ||
                (currentUser.Role != UserRole.Admin && currentUser.Role != UserRole.Organizer))
            {
                return Forbid();
            }

            var targetEvent = await _context.Events
                .AsNoTracking()
                .FirstOrDefaultAsync(e => e.Id == announcement.EventId);
            if (targetEvent == null)
            {
                return NotFound(new { message = "Select a valid event for this announcement." });
            }

            if (currentUser.Role == UserRole.Organizer &&
                !string.Equals(currentUser.Department, targetEvent.Department, StringComparison.OrdinalIgnoreCase))
            {
                return Forbid();
            }

            announcement.Timestamp = DateTime.UtcNow;
            _context.Announcements.Add(announcement);
            await _context.SaveChangesAsync();

            return Ok(announcement);
        }

        // DELETE: api/announcements/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteAnnouncement(int id)
        {
            var userEmail = User.FindFirstValue(ClaimTypes.Email)
                ?? User.FindFirstValue(ClaimTypes.Name)
                ?? User.FindFirstValue("email")
                ?? User.Identity?.Name;
            var currentUser = string.IsNullOrWhiteSpace(userEmail)
                ? null
                : await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Email == userEmail);

            if (currentUser?.Role != UserRole.Admin)
            {
                return Forbid();
            }

            var announcement = await _context.Announcements.FindAsync(id);
            if (announcement == null)
            {
                return NotFound(new { message = "Announcement not found." });
            }

            _context.Announcements.Remove(announcement);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}