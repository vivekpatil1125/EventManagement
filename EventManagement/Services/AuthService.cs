using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.Identity;
using EventManagement.Data;
using EventManagement.DTOs;
using EventManagement.Interfaces;
using EventManagement.Models;
using Microsoft.IdentityModel.Tokens;

namespace EventManagement.Services
{
    public class AuthService : IAuthService
    {
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly PasswordHasher<User> _passwordHasher;

        public AuthService(ApplicationDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
            _passwordHasher = new PasswordHasher<User>();
        }

        public async Task<AuthResponseDto?> RegisterAsync(RegisterDto dto)
        {
            // 1. Check if email is already taken
            if (await _context.Users.AnyAsync(u => u.Email == dto.Email))
            {
                return null;
            }

            // 2. Create the user object
            var user = new User
            {
                FullName = dto.FullName,
                Email = dto.Email,
                Role = UserRole.Employee // Default role assigned upon registration
            };

            // 3. Hash the password safely using .NET's built-in cryptographic hasher
            user.PasswordHash = _passwordHasher.HashPassword(user, dto.Password);

            // 4. Save to SQL Server
            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            // 5. Generate and return token string
            var token = GenerateJwtToken(user);
            return new AuthResponseDto { Token = token, Email = user.Email, Role = user.Role.ToString() };
        }

        public async Task<AuthResponseDto?> LoginAsync(LoginDto dto)
        {
            // 1. Find user by email
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
            if (user == null) return null;

            // 2. Verify password hash matches
            var verificationResult = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, dto.Password);
            if (verificationResult == PasswordVerificationResult.Failed)
            {
                return null;
            }

            // 3. Generate fresh JWT token
            var token = GenerateJwtToken(user);
            return new AuthResponseDto { Token = token, Email = user.Email, Role = user.Role.ToString() };
        }

        private string GenerateJwtToken(User user)
        {
            var tokenHandler = new JwtSecurityTokenHandler();

            // Fallback key if appsettings doesn't have one yet
            var secretKey = _configuration["Jwt:Key"] ?? "SuperSecretLocalDevelopmentKeyThatIsLongEnoughToSatisfySha256BitsRequirement!";
            var key = Encoding.ASCII.GetBytes(secretKey);

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                    new Claim(ClaimTypes.Email, user.Email),
                    new Claim(ClaimTypes.Role, user.Role.ToString())
                }),
                Expires = DateTime.UtcNow.AddDays(7),
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }
    }
}