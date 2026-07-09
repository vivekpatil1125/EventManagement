using EventManagement.DTOs;
using EventManagement.Interfaces;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace EventManagement.Controllers
{
    [ApiController]
    [Route("api/[controller]")] // This makes the URL: api/auth
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;

        public AuthController(IAuthService authService)
        {
            _authService = authService;
        }

        [HttpPost("register")] // URL: api/auth/register
        public async Task<IActionResult> Register([FromBody] RegisterDto dto)
        {
            var result = await _authService.RegisterAsync(dto);
            if (result == null)
            {
                return BadRequest(new { message = "Email is already registered." });
            }
            return Ok(result);
        }

        [HttpPost("login")] // URL: api/auth/login
        public async Task<IActionResult> Login([FromBody] LoginDto dto)
        {
            var result = await _authService.LoginAsync(dto);
            if (result == null)
            {
                return Unauthorized(new { message = "Invalid email or password." });
            }
            return Ok(result);
        }
    }
}