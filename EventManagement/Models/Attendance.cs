using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EventSync.Models
{
    public class Attendance
    {
        [Key]
        public string Id { get; set; } = $"ATT-{Guid.NewGuid().ToString()[..2].ToUpper()}";

        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required]
        public int EventId { get; set; }

        [ForeignKey("EventId")]
        public Event? Event { get; set; }

        [Required]
        [StringLength(50)]
        public string TicketCode { get; set; } = string.Empty; // e.g., TX-VIP-001

        public bool CheckedIn { get; set; } = false;

        public string Time { get; set; } = "--:--";
    }
}