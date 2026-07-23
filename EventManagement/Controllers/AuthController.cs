using EventManagement.Data;
using EventManagement.DTOs;
using EventManagement.Models;
using Microsoft.AspNetCore.Identity; // Required for PasswordHasher
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EventManagement.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly PasswordHasher<User> _passwordHasher = new PasswordHasher<User>();

        public AuthController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto loginDto)
        {
            // 1. Find user by email
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == loginDto.Email);
            if (user == null)
            {
                return Unauthorized(new { message = "Invalid email or password." });
            }

            // 2. Verify password (handles encrypted hashes like AQAAAAIAAYa...)
            var verificationResult = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, loginDto.Password);

            // Fallback check: allows plain-text passwords just in case any test user was added manually without hashing
            bool isPasswordValid = (verificationResult == PasswordVerificationResult.Success) || (user.PasswordHash == loginDto.Password);

            if (!isPasswordValid)
            {
                return Unauthorized(new { message = "Invalid email or password." });
            }

            // 3. Map the frontend tab name to the correct database Role integer
            UserRole expectedRole = loginDto.Role.ToLower() switch
            {
                "admin" => UserRole.Admin,
                "organizer" => UserRole.Organizer,
                _ => UserRole.Employee
            };

            // 4. Check if user's database role matches the portal tab
            if (user.Role != expectedRole)
            {
                return Unauthorized(new { message = $"Access denied. This account is not authorized as an {loginDto.Role}." });
            }

            // 5. Return success response
            return Ok(new
            {
                token = "DUMMY_JWT_TOKEN_ABC123",
                fullName = user.FullName,
                email = user.Email,
                role = user.Role.ToString()
            });
        }
    }
}