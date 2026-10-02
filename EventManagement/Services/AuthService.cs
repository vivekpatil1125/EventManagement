using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using EventManagement.Data;
using EventManagement.DTOs;
using EventManagement.Interfaces;
using EventManagement.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using SendGrid;
using SendGrid.Helpers.Mail;

namespace EventManagement.Services
{
    public class AuthService : IAuthService
    {
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly PasswordHasher<User> _passwordHasher = new PasswordHasher<User>();

        public AuthService(ApplicationDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        // 1. Full Database Registration with Role Mapping
        public async Task<object> RegisterAsync(RegisterDto dto)
        {
            var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
            if (existingUser != null)
            {
                throw new Exception("An account with this email address already exists.");
            }

            // Map string role to UserRole enum (Admin = 1, Employee = 2, Organizer = 3)
            UserRole userRole = dto.Role?.ToLower() switch
            {
                "admin" => UserRole.Admin,         // 1
                "organizer" => UserRole.Organizer, // 3
                _ => UserRole.Employee            // 2
            };

            var newUser = new User
            {
                FullName = dto.FullName,
                Email = dto.Email,
                Role = userRole
            };

            newUser.PasswordHash = _passwordHasher.HashPassword(newUser, dto.Password);

            _context.Users.Add(newUser);
            await _context.SaveChangesAsync();

            return new
            {
                message = $"{userRole} registered successfully!",
                userId = newUser.Id,
                role = (int)userRole
            };
        }

        // 2. Full Database Login with Role Cross-Portal Check
        public async Task<object> LoginAsync(LoginDto dto)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
            if (user == null)
            {
                throw new Exception("Invalid email or password.");
            }

            var verificationResult = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, dto.Password);
            bool isPasswordValid = (verificationResult == PasswordVerificationResult.Success) || (user.PasswordHash == dto.Password);

            if (!isPasswordValid)
            {
                throw new Exception("Invalid email or password.");
            }

            UserRole expectedRole = dto.Role?.ToLower() switch
            {
                "admin" => UserRole.Admin,         // 1
                "organizer" => UserRole.Organizer, // 3
                _ => UserRole.Employee            // 2
            };

            if (user.Role != expectedRole)
            {
                throw new Exception($"Access denied. This account is not authorized as an {dto.Role}.");
            }

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

            var jwt = new JwtSecurityTokenHandler().WriteToken(token);

            return new
            {
                token = jwt,
                fullName = user.FullName,
                email = user.Email,
                department = user.Department,
                role = user.Role.ToString(),
                roleId = (int)user.Role
            };
        }

        // 3. SendGrid Email Password Reset
        public async Task ForgotPasswordAsync(ForgotPasswordDto dto)
        {
            // Verify user exists in the database
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
            if (user == null)
            {
                // Silently return to prevent email enumeration attacks
                return;
            }

            try
            {
                string apiKey = _configuration["SendGrid:ApiKey"] ?? throw new Exception("SendGrid ApiKey missing.");
                string fromEmail = _configuration["SendGrid:FromEmail"] ?? throw new Exception("SendGrid FromEmail missing.");
                string fromName = _configuration["SendGrid:FromName"] ?? "EventSync Security";

                string resetToken = Guid.NewGuid().ToString();
                string frontendUrl = _configuration["FrontendUrl"] ?? "http://localhost:5173";
                string resetLink = $"{frontendUrl}/reset-password?token={Uri.EscapeDataString(resetToken)}&email={Uri.EscapeDataString(dto.Email)}";

                var client = new SendGridClient(apiKey);
                var from = new EmailAddress(fromEmail, fromName);
                var to = new EmailAddress(dto.Email);

                string subject = "Reset Your Password";
                string htmlContent = $"<h3>Password Reset Request</h3>" +
                                     $"<p>Click the link below to set a new password for your EventSync account:</p>" +
                                     $"<p><a href='{resetLink}' style='color:#7f56d9;font-weight:bold;text-decoration:none;'>Reset Password Now</a></p>";

                var msg = MailHelper.CreateSingleEmail(from, to, subject, null, htmlContent);
                var response = await client.SendEmailAsync(msg);

                if (!response.IsSuccessStatusCode)
                {
                    string errorBody = await response.Body.ReadAsStringAsync();
                    throw new Exception($"SendGrid API rejected request: {response.StatusCode} - {errorBody}");
                }
            }
            catch (Exception ex)
            {
                throw new Exception($"Email system error: {ex.Message}");
            }
        }
    }
}