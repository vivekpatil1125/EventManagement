using System;
using System.ComponentModel.DataAnnotations;

namespace EventManagement.Models
{
    public class User
    {
        [Key]

        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string FullName { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        [MaxLength(150)]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string PasswordHash { get; set; } = string.Empty;

        [Required]
        public UserRole Role { get; set; } = UserRole.Employee;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}