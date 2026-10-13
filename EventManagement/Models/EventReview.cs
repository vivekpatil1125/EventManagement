using System.ComponentModel.DataAnnotations;

namespace EventManagement.Models
{
    public class EventReview
    {
        public int Id { get; set; }

        [Required]
        [StringLength(100)]
        public string EmployeeName { get; set; } = string.Empty;

        [Required]
        [StringLength(256)]
        public string EmployeeEmail { get; set; } = string.Empty;

        public int EventId { get; set; }

        [Required]
        [StringLength(100)]
        public string EventName { get; set; } = string.Empty;

        [Range(1, 5)]
        public int Rating { get; set; }

        [StringLength(1000)]
        public string? Comment { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
