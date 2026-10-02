using System;

namespace EventSync.Models // or your correct namespace
{
    public class Registration
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public int EventId { get; set; }
        public Event? Event { get; set; }
        public string Tier { get; set; } = "Standard";

        // Ensure this property exists
        public DateTime RegistrationDate { get; set; }

        public string Status { get; set; } = "Confirmed";
        public bool IsCheckedIn { get; set; }
        public DateTime? CheckedInAt { get; set; }
    }
}