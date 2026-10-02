using EventManagement.Data;
using EventManagement.Models;
using EventSync.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace EventManagement.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class EventsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public EventsController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/events
        [HttpGet]
        public async Task<IActionResult> GetEvents([FromQuery] string? department = null)
        {
            try
            {
                var query = _context.Events.AsNoTracking().AsQueryable();

                if (!string.IsNullOrWhiteSpace(department))
                {
                    var dept = department.Trim().ToLower();
                    query = query.Where(e => (e.Department ?? "").ToLower() == dept);
                }

                var result = await query.Select(e => new
                {
                    id = e.Id,
                    title = e.Title ?? "Untitled Event",
                    description = e.Description ?? "", // Added so frontend can display it
                    date = e.Date,
                    location = e.Location ?? "Remote",
                    capacity = e.Capacity,
                    registered = e.Registered,
                    type = e.Type ?? "CONFERENCE",
                    status = e.Status ?? "PUBLISHED",
                    img = e.Img ?? "",
                    department = e.Department ?? "General"
                }).ToListAsync();

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message, detail = ex.InnerException?.Message });
            }
        }

        // GET: api/events/5
        [HttpGet("{id}")]
        public async Task<IActionResult> GetEvent(int id)
        {
            var e = await _context.Events.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);

            if (e == null)
            {
                return NotFound(new { message = $"Event with ID {id} not found." });
            }

            return Ok(new
            {
                id = e.Id,
                title = e.Title ?? "Untitled Event",
                description = e.Description ?? "", // Added so edit modal can populate it
                date = e.Date,
                location = e.Location ?? "Remote",
                capacity = e.Capacity,
                registered = e.Registered,
                type = e.Type ?? "CONFERENCE",
                status = e.Status ?? "PUBLISHED",
                img = e.Img ?? "",
                department = e.Department ?? "General"
            });
        }

        // POST: api/events
        [HttpPost]
        public async Task<IActionResult> PostEvent([FromBody] Event @event)
        {
            try
            {
                @event.Title = @event.Title ?? "New Event";
                @event.Description = @event.Description ?? ""; // Default empty string to avoid DB null violations
                @event.Location = @event.Location ?? "Remote";
                @event.Type = @event.Type ?? "CONFERENCE";
                @event.Status = @event.Status ?? "PUBLISHED";
                @event.Img = @event.Img ?? "";
                @event.Department = @event.Department ?? "General";

                _context.Events.Add(@event);
                await _context.SaveChangesAsync();

                return CreatedAtAction(nameof(GetEvent), new { id = @event.Id }, @event);
            }
            catch (Exception ex)
            {
                var err = ex.InnerException?.Message ?? ex.Message;
                return StatusCode(500, new { message = "Failed to create event", detail = err });
            }
        }

        // PUT: api/events/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutEvent(int id, [FromBody] Event incoming)
        {
            if (incoming.Id == 0)
            {
                incoming.Id = id;
            }
            else if (id != incoming.Id)
            {
                return BadRequest(new { message = "ID mismatch between route parameter and payload body." });
            }

            try
            {
                var existingEvent = await _context.Events.FindAsync(id);
                if (existingEvent == null)
                {
                    return NotFound(new { message = $"Event with ID {id} not found." });
                }

                // Directly update tracked properties safely
                existingEvent.Title = incoming.Title ?? existingEvent.Title;
                existingEvent.Description = incoming.Description ?? existingEvent.Description ?? ""; // Saves description updates

                if (incoming.Date != default)
                {
                    existingEvent.Date = incoming.Date;
                }

                existingEvent.Location = incoming.Location ?? existingEvent.Location;
                existingEvent.Capacity = incoming.Capacity > 0 ? incoming.Capacity : existingEvent.Capacity;
                existingEvent.Type = incoming.Type ?? existingEvent.Type;
                existingEvent.Status = incoming.Status ?? existingEvent.Status;
                existingEvent.Img = incoming.Img ?? existingEvent.Img ?? "";

                if (!string.IsNullOrWhiteSpace(incoming.Department))
                {
                    existingEvent.Department = incoming.Department;
                }

                await _context.SaveChangesAsync();
                return NoContent();
            }
            catch (Exception ex)
            {
                var err = ex.InnerException?.Message ?? ex.Message;
                Console.WriteLine($"[PUT /events/{id} Error]: {err}");
                return StatusCode(500, new { message = "Failed to update event", detail = err });
            }
        }

        // DELETE: api/events/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteEvent(int id)
        {
            var @event = await _context.Events.FindAsync(id);
            if (@event == null)
            {
                return NotFound(new { message = $"Event with ID {id} not found." });
            }

            _context.Events.Remove(@event);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}