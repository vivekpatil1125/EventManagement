using System.Security.Claims;
using EventManagement.Data;
using EventManagement.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EventManagement.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/users")]
    public class UsersController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public UsersController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetUsers()
        {
            var userEmail = User.FindFirstValue(ClaimTypes.Email)
                ?? User.FindFirstValue(ClaimTypes.Name)
                ?? User.FindFirstValue("email")
                ?? User.Identity?.Name;

            if (string.IsNullOrWhiteSpace(userEmail))
            {
                return Forbid();
            }

            var currentUser = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Email == userEmail);

            if (currentUser?.Role != UserRole.Admin)
            {
                return Forbid();
            }

            var users = await _context.Users
                .AsNoTracking()
                .OrderBy(u => u.FullName)
                .Select(u => new
                {
                    u.Id,
                    name = u.FullName,
                    email = u.Email,
                    department = u.Department,
                    role = u.Role
                })
                .ToListAsync();

            return Ok(users);
        }
    }
}
