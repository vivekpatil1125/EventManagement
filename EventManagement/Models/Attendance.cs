using EventManagement.Models;
using EventSync.Models;
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EventManagement.Models
{
    [Table("Attendances")]
    public class Attendance
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.None)]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        public string? Name { get; set; }
        public int EventId { get; set; }
        public string? TicketCode { get; set; }
        public bool CheckedIn { get; set; }
        public string? Time { get; set; }

        [ForeignKey("EventId")]
        public Event Event { get; set; } = null!;
    }
}