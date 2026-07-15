using System;
using System.Threading.Tasks;
using EventManagement.DTOs;
using EventManagement.Interfaces;
using Microsoft.Extensions.Configuration;
using SendGrid;
using SendGrid.Helpers.Mail;

namespace EventManagement.Services
{
    public class AuthService : IAuthService
    {
        private readonly IConfiguration _configuration;

        // Keep your database context injection here if you have one!
        public AuthService(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        // 1. Matches the Task<object> return type specified in the interface contract
        public async Task<object> RegisterAsync(RegisterDto dto)
        {
            // PLACE YOUR ORIGINAL REGISTRATION DATABASE LOGIC HERE
            await Task.Delay(1);
            return new { message = "Registration successful" };
        }

        // 2. Matches the Task<object> return type specified in the interface contract
        public async Task<object> LoginAsync(LoginDto dto)
        {
            // PLACE YOUR ORIGINAL LOGIN/JWT GENERATION LOGIC HERE
            await Task.Delay(1);
            return new { token = "example-jwt-token" };
        }

        // 3. Matches the Task return type specified in the interface contract
        public async Task ForgotPasswordAsync(ForgotPasswordDto dto)
        {
            try
            {
                string apiKey = _configuration["SendGrid:ApiKey"] ?? throw new Exception("SendGrid ApiKey missing.");
                string fromEmail = _configuration["SendGrid:FromEmail"] ?? throw new Exception("SendGrid FromEmail missing.");
                string fromName = _configuration["SendGrid:FromName"] ?? "Security";

                string resetToken = Guid.NewGuid().ToString();
                string frontendUrl = "http://localhost:5173";
                string resetLink = $"{frontendUrl}/reset-password?token={Uri.EscapeDataString(resetToken)}&email={Uri.EscapeDataString(dto.Email)}";

                // Standard HTTPS transmission via SendGrid SDK
                var client = new SendGridClient(apiKey);
                var from = new EmailAddress(fromEmail, fromName);
                var to = new EmailAddress(dto.Email);

                string subject = "Reset Your Password";
                string htmlContent = $"<h3>Password Reset Request</h3>" +
                                     $"<p>Click the link below to set a new password:</p>" +
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