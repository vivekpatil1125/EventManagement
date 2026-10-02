using System;
using System.ComponentModel.DataAnnotations;

namespace EventManagement.Models
{
    public class User
    {
        public int Id { get; set; }

        [Required]
        [StringLength(100)]
        public string FullName { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        public string PasswordHash { get; set; } = string.Empty;

        [Required]
        [StringLength(50)]
        public string Department { get; set; } = "IT"; // Stores selected department (IT, SAP, HR, Finance, Operations, Marketing)

        public UserRole Role { get; set; } = UserRole.Employee;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}