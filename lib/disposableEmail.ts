// Throwaway inbox providers. Verification already proves an address is
// reachable, but these are reachable and worthless, so they get turned away
// at the door rather than after a round trip.
const DISPOSABLE_DOMAINS = new Set([
  "10minutemail.com",
  "guerrillamail.com",
  "guerrillamail.info",
  "sharklasers.com",
  "mailinator.com",
  "yopmail.com",
  "temp-mail.org",
  "tempmail.com",
  "throwawaymail.com",
  "getnada.com",
  "dispostable.com",
  "trashmail.com",
  "fakeinbox.com",
  "maildrop.cc",
  "mintemail.com",
  "mohmal.com",
  "spamgourmet.com",
  "tempinbox.com",
  "emailondeck.com",
  "burnermail.io",
  "mailnesia.com",
  "tempr.email",
  "moakt.com",
  "luxusmail.org",
  "inboxkitten.com",
]);

// Addresses that only ever show up in placeholder data.
const RESERVED_DOMAINS = new Set(["example.com", "example.org", "example.net", "test.com", "localhost"]);

export function emailProblem(email: string): string | null {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return "Enter a valid email address.";
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return "That looks like a throwaway inbox. Use an address you can actually receive mail at.";
  }
  if (RESERVED_DOMAINS.has(domain)) {
    return "That address is not a real inbox. Use one you can receive mail at.";
  }
  return null;
}
