using System.Security.Claims;
using EventManagement.Data;
using EventManagement.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

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

        [HttpGet("profile")]
        public async Task<IActionResult> GetProfile()
        {
            var userEmail = GetCurrentUserEmail();
            if (string.IsNullOrWhiteSpace(userEmail))
            {
                return Unauthorized(new { message = "Unable to identify user from token claims." });
            }

            var user = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Email == userEmail);

            if (user == null)
            {
                return NotFound(new { message = "User profile was not found." });
            }

            return Ok(new
            {
                id = user.Id,
                name = user.FullName,
                email = user.Email,
                department = user.Department,
                role = user.Role.ToString(),
                createdAt = user.CreatedAt
            });
        }

        [HttpPut("profile")]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateUserProfileDto dto)
        {
            if (!ModelState.IsValid)
            {
                return ValidationProblem(ModelState);
            }

            var userEmail = GetCurrentUserEmail();
            if (string.IsNullOrWhiteSpace(userEmail))
            {
                return Unauthorized(new { message = "Unable to identify user from token claims." });
            }

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == userEmail);
            if (user == null)
            {
                return NotFound(new { message = "User profile was not found." });
            }

            user.FullName = dto.Name.Trim();
            user.Department = dto.Department.Trim();
            await _context.SaveChangesAsync();

            return Ok(new
            {
                id = user.Id,
                name = user.FullName,
                email = user.Email,
                department = user.Department,
                role = user.Role.ToString(),
                createdAt = user.CreatedAt
            });
        }

        [HttpGet]
        public async Task<IActionResult> GetUsers()
        {
            var userEmail = GetCurrentUserEmail();

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

        private string? GetCurrentUserEmail()
        {
            return User.FindFirstValue(ClaimTypes.Email)
                ?? User.FindFirstValue(ClaimTypes.Name)
                ?? User.FindFirstValue("email")
                ?? User.Identity?.Name;
        }
    }

    public class UpdateUserProfileDto
    {
        [Required]
        [StringLength(100, MinimumLength = 2)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [StringLength(50)]
        public string Department { get; set; } = string.Empty;
    }
}
