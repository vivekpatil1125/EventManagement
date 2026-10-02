import { jsPDF } from "jspdf";

export const generateCertificate = ({
  attendeeName,
  eventTitle,
  eventDate,
  department = "Enterprise",
  certificateId = `CERT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
}) => {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4"
  });

  const pageWidth = 297;
  const pageHeight = 210;

  // Background Fill
  doc.setFillColor(252, 253, 255);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  // Outer Border
  doc.setLineWidth(3);
  doc.setDrawColor(30, 58, 138);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

  // Inner Border
  doc.setLineWidth(0.8);
  doc.setDrawColor(217, 119, 6);
  doc.rect(14, 14, pageWidth - 28, pageHeight - 28);

  // Branding
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(100, 116, 139);
  doc.text("EVENTSYNC ENTERPRISE LEARNING & DEVELOPMENT", pageWidth / 2, 32, { align: "center" });

  // Main Title
  doc.setFontSize(30);
  doc.setTextColor(30, 58, 138);
  doc.text("CERTIFICATE OF COMPLETION", pageWidth / 2, 48, { align: "center" });

  // Subtitle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(71, 85, 105);
  doc.text("This official credential certifies that", pageWidth / 2, 64, { align: "center" });

  // Attendee Name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.setTextColor(15, 23, 42);
  doc.text(attendeeName, pageWidth / 2, 82, { align: "center" });

  doc.setLineWidth(0.5);
  doc.setDrawColor(203, 213, 225);
  doc.line(70, 86, pageWidth - 70, 86);

  // Description
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `has successfully attended, participated in, and fulfilled all requirements for the ${department} module session:`,
    pageWidth / 2,
    98,
    { align: "center" }
  );

  // Event Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(37, 99, 235);
  doc.text(`"${eventTitle}"`, pageWidth / 2, 112, { align: "center" });

  // Date
  const formattedDate = eventDate ? new Date(eventDate).toLocaleDateString("en-GB") : new Date().toLocaleDateString("en-GB");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(100, 116, 139);
  doc.text(`Awarded on: ${formattedDate}  •  Department: ${department}`, pageWidth / 2, 126, { align: "center" });

  doc.setLineWidth(0.5);
  doc.setDrawColor(226, 232, 240);
  doc.line(30, 142, pageWidth - 30, 142);

  // Signatures
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text("Event Coordinator", 55, 168, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text("EventSync Operations", 55, 174, { align: "center" });
  doc.line(30, 162, 80, 162);

  // Gold Seal
  doc.setFillColor(254, 243, 199);
  doc.circle(pageWidth / 2, 162, 14, "F");
  doc.setDrawColor(217, 119, 6);
  doc.setLineWidth(1);
  doc.circle(pageWidth / 2, 162, 14, "D");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(180, 83, 9);
  doc.text("VERIFIED", pageWidth / 2, 161, { align: "center" });
  doc.text("CREDENTIAL", pageWidth / 2, 165, { align: "center" });

  // Director Signature
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text("Department Director", pageWidth - 55, 168, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`${department} Division`, pageWidth - 55, 174, { align: "center" });
  doc.line(pageWidth - 80, 162, pageWidth - 30, 162);

  // Credential Token
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text(`Credential ID: ${certificateId}  •  System Authenticated Certificate`, pageWidth / 2, 192, { align: "center" });

  doc.save(`${attendeeName.replace(/\s+/g, "_")}_Completion_Certificate.pdf`);
};