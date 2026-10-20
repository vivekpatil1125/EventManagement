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
using System.Security.Cryptography;
using System.Net;

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
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email.Trim());
            if (user == null)
            {
                // Silently return to prevent email enumeration attacks
                return;
            }

            var apiKey = _configuration["SendGrid:ApiKey"];
            var fromEmail = _configuration["SendGrid:FromEmail"];
            if (string.IsNullOrWhiteSpace(apiKey) || string.IsNullOrWhiteSpace(fromEmail))
            {
                throw new InvalidOperationException("SendGrid:ApiKey and SendGrid:FromEmail must be configured.");
            }

            var fromName = _configuration["SendGrid:FromName"] ?? "EventSync Security";
            var frontendUrl = (_configuration["FrontendUrl"] ?? "http://localhost:5173").TrimEnd('/');
            var resetToken = CreatePasswordResetToken(user);
            var resetLink = $"{frontendUrl}/reset-password?token={Uri.EscapeDataString(resetToken)}";
            var safeResetLink = WebUtility.HtmlEncode(resetLink);

            var client = new SendGridClient(apiKey);
            var message = MailHelper.CreateSingleEmail(
                new EmailAddress(fromEmail, fromName),
                new EmailAddress(user.Email),
                "Reset Your Password",
                $"Use this link to reset your EventSync password: {resetLink}",
                $"<h3>Password Reset Request</h3><p>Use the link below to set a new password. This link expires in 30 minutes.</p><p><a href=\"{safeResetLink}\">Reset your password</a></p>");

            var response = await client.SendEmailAsync(message);
            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Body.ReadAsStringAsync();
                throw new InvalidOperationException($"SendGrid rejected the email ({response.StatusCode}): {errorBody}");
            }
        }

        public async Task<bool> ResetPasswordAsync(ResetPasswordDto dto)
        {
            ClaimsPrincipal principal;
            try
            {
                var issuer = $"{_configuration["Jwt:Issuer"] ?? "YourIssuer"}:PasswordReset";
                var audience = $"{_configuration["Jwt:Audience"] ?? "YourAudience"}:PasswordReset";
                var signingKey = _configuration["Jwt:Key"] ?? "YourSuperSecretKeyWithAtLeast16BytesLength";
                principal = new JwtSecurityTokenHandler().ValidateToken(dto.Token, new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = issuer,
                    ValidateAudience = true,
                    ValidAudience = audience,
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.Zero,
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(signingKey))
                }, out _);
            }
            catch (SecurityTokenException)
            {
                return false;
            }
            catch (ArgumentException)
            {
                return false;
            }

            if (principal.FindFirst("purpose")?.Value != "password_reset" ||
                !int.TryParse(principal.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
            {
                return false;
            }

            var user = await _context.Users.FindAsync(userId);
            var tokenFingerprint = principal.FindFirst("password_hash")?.Value;
            if (user == null || tokenFingerprint != GetPasswordHashFingerprint(user.PasswordHash))
            {
                return false;
            }

            user.PasswordHash = _passwordHasher.HashPassword(user, dto.NewPassword);
            await _context.SaveChangesAsync();
            return true;
        }

        private string CreatePasswordResetToken(User user)
        {
            var issuer = $"{_configuration["Jwt:Issuer"] ?? "YourIssuer"}:PasswordReset";
            var audience = $"{_configuration["Jwt:Audience"] ?? "YourAudience"}:PasswordReset";
            var signingKey = _configuration["Jwt:Key"] ?? "YourSuperSecretKeyWithAtLeast16BytesLength";
            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim("purpose", "password_reset"),
                new Claim("password_hash", GetPasswordHashFingerprint(user.PasswordHash))
            };
            var credentials = new SigningCredentials(
                new SymmetricSecurityKey(Encoding.UTF8.GetBytes(signingKey)),
                SecurityAlgorithms.HmacSha256);
            var token = new JwtSecurityToken(
                issuer,
                audience,
                claims,
                expires: DateTime.UtcNow.AddMinutes(30),
                signingCredentials: credentials);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        private static string GetPasswordHashFingerprint(string passwordHash)
        {
            return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(passwordHash)));
        }
    }
}