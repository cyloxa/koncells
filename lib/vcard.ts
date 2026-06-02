interface VCardCustomer {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  location: string | null;
}

/**
 * Generate a vCard 3.0 string for a single contact.
 * Compatible with Google Contacts and Apple Contacts.
 */
function toVCard(c: VCardCustomer, index: number): string {
  const parts: string[] = [];
  parts.push("BEGIN:VCARD");
  parts.push("VERSION:3.0");

  // Name (FN and N)
  const nameParts = (c.name ?? "Unknown").trim().split(/\s+/);
  const firstName = nameParts[0] ?? "";
  const lastName = nameParts.slice(1).join(" ") ?? "";
  parts.push(`FN:${c.name ?? "Unknown"}`);
  parts.push(`N:${lastName};${firstName};;;`);

  // Email
  parts.push(`EMAIL;type=INTERNET;type=HOME:${c.email}`);

  // Phone
  if (c.phone) {
    const cleaned = c.phone.replace(/[^0-9+\s()-]/g, "").trim();
    parts.push(`TEL;type=CELL;type=VOICE:${cleaned}`);
  }

  // Location (ADR)
  if (c.location) {
    parts.push(`ADR;type=HOME:;;${c.location};;;;`);
  }

  parts.push(`UID:${c.id}`);
  parts.push(`REV:${new Date().toISOString()}`);
  parts.push("END:VCARD");

  return parts.join("\r\n");
}

/**
 * Export an array of customers as a .vcf file.
 * Triggers a browser download.
 */
export function exportAsVCard(customers: VCardCustomer[]): void {
  const vcardData = customers.map((c, i) => toVCard(c, i)).join("\r\n");

  const blob = new Blob([vcardData], { type: "text/vcard;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  const filename =
    customers.length === 1
      ? `${customers[0].name ?? "customer"}.vcf`
      : `customers_${customers.length}_contacts.vcf`;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
