using System;
using System.ComponentModel.DataAnnotations;

namespace EventSync.Models
{
    public class Event
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(100)]
        public string Title { get; set; } = string.Empty;

        [Required]
        public DateTime Date { get; set; }

        [Required]
        [StringLength(150)]
        public string Location { get; set; } = string.Empty;

        [Required]
        public int Capacity { get; set; }

        public int Registered { get; set; } = 0;

        [Required]
        [StringLength(30)]
        public string Type { get; set; } = "CONFERENCE"; // CONFERENCE, WORKSHOP, SEMINAR

        [Required]
        [StringLength(20)]
        public string Status { get; set; } = "PUBLISHED"; // PUBLISHED, DRAFT

        public string Img { get; set; } = string.Empty;
    }
}