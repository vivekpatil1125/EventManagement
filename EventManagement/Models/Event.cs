using System;
using System.ComponentModel.DataAnnotations;

namespace EventSync.Models
{
    public class Event
    {
        public int Id { get; set; }

        [Required]
        [StringLength(100)]
        public string Title { get; set; } = string.Empty;

        public string? Description { get; set; } = string.Empty;
        [Required]
        public DateTime Date { get; set; }

        [Required]
        public string Location { get; set; } = string.Empty;

        [Required]
        [StringLength(50)]
        public string Department { get; set; } = "IT"; // 👈 IT, SAP, HR, Finance, Operations, Marketing

        public int Capacity { get; set; }
        public int Registered { get; set; }

        [StringLength(30)]
        public string Type { get; set; } = "CONFERENCE";

        [StringLength(20)]
        public string Status { get; set; } = "PUBLISHED";

        public string Img { get; set; } = string.Empty;
    }
}