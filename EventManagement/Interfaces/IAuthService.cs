using System.Threading.Tasks;
using EventManagement.DTOs;

namespace EventManagement.Interfaces
{
    public interface IAuthService
    {
        Task<object> RegisterAsync(RegisterDto dto);
        Task<object> LoginAsync(LoginDto dto);
        Task ForgotPasswordAsync(ForgotPasswordDto dto);
    }
}