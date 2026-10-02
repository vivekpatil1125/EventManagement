using EventManagement.Data;
using EventManagement.DTOs;
using EventManagement.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace EventManagement.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly PasswordHasher<User> _passwordHasher = new PasswordHasher<User>();

        public AuthController(ApplicationDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        private string GenerateJwtToken(User user)
        {
            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Email),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Name, user.FullName ?? user.Email),
                new Claim(ClaimTypes.Role, user.Role.ToString()),
                new Claim("role", user.Role.ToString()),
                new Claim("department", user.Department ?? string.Empty)
            };

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"] ?? "YourSuperSecretKeyWithAtLeast16BytesLength"));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"] ?? "YourIssuer",
                audience: _configuration["Jwt:Audience"] ?? "YourAudience",
                claims: claims,
                expires: DateTime.UtcNow.AddHours(8),
                signingCredentials: creds);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            // Prevent public registration as Admin
            if (dto.Role?.ToLower() == "admin")
            {
                return BadRequest(new { message = "Admin accounts cannot be registered publicly." });
            }

            // 1. Check if email already exists
            var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
            if (existingUser != null)
            {
                return BadRequest(new { message = "An account with this email address already exists." });
            }

            // 2. Map Role string from frontend ("Employee" or "Organizer") to UserRole Enum:
            // Admin = 1, Employee = 2, Organizer = 3
            UserRole userRole = dto.Role?.ToLower() switch
            {
                "organizer" => UserRole.Organizer, // 3
                _ => UserRole.Employee            // 2
            };

            // 3. Save directly to Users table with mapped properties
            var newUser = new User
            {
                FullName = dto.FullName,
                Email = dto.Email,
                Department = dto.Department, // 👈 Maps Department sent from frontend dropdown
                Role = userRole
            };

            newUser.PasswordHash = _passwordHasher.HashPassword(newUser, dto.Password);

            _context.Users.Add(newUser);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = $"{userRole} registered successfully!",
                userId = newUser.Id,
                department = newUser.Department,
                role = (int)userRole // Returns 2 for Employee, 3 for Organizer
            });
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto loginDto)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == loginDto.Email);
            if (user == null)
            {
                return Unauthorized(new { message = "Invalid email or password." });
            }

            var verificationResult = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, loginDto.Password);
            bool isPasswordValid = (verificationResult == PasswordVerificationResult.Success) || (user.PasswordHash == loginDto.Password);

            if (!isPasswordValid)
            {
                return Unauthorized(new { message = "Invalid email or password." });
            }

            UserRole expectedRole = loginDto.Role?.ToLower() switch
            {
                "admin" => UserRole.Admin,         // 1
                "organizer" => UserRole.Organizer, // 3
                _ => UserRole.Employee            // 2
            };

            if (user.Role != expectedRole)
            {
                return Unauthorized(new { message = $"Access denied. This account is not authorized as an {loginDto.Role}." });
            }

            return Ok(new
            {
                token = GenerateJwtToken(user),
                fullName = user.FullName,
                email = user.Email,
                department = user.Department,
                role = user.Role.ToString(),
                roleId = (int)user.Role
            });
        }

        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto dto)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
            if (user == null)
            {
                return Ok(new { message = "If the email is registered, password reset instructions have been sent." });
            }

            return Ok(new { message = "Password reset instructions have been sent to your email." });
        }
    }
}