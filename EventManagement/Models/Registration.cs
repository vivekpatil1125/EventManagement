using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EventSync.Models
{
    public class Registration
    {
        [Key]
        public string Id { get; set; } = $"REG-{Guid.NewGuid().ToString()[..4].ToUpper()}";

        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        public int EventId { get; set; }

        [ForeignKey("EventId")]
        public Event? Event { get; set; }

        [Required]
        [StringLength(30)]
        public string Tier { get; set; } = "General"; // VIP, General

        public DateTime RegistrationDate { get; set; } = DateTime.UtcNow;

        [Required]
        [StringLength(20)]
        public string Status { get; set; } = "CONFIRMED"; // CONFIRMED, PENDING
    }
}