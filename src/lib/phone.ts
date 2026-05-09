export const RU_PHONE_DIGITS = 10;

export function digitsOnly(input: string): string {
  return (input || "").replace(/\D+/g, "");
}

// UI helper: user enters digits, we normalize to RU 10-digit local number (without country code).
// Accepts: 10 digits (local), 11 digits starting with 7 or 8.
export function normalizeRuLocal10(input: string): string {
  const d = digitsOnly(input);
  if (!d) return "";
  if (d.length === 10) return d;
  if (d.length === 11 && (d.startsWith("7") || d.startsWith("8"))) return d.slice(1);
  // if user typed more, keep last 10 digits (common paste cases)
  if (d.length > 10) return d.slice(-10);
  return d;
}

export function formatRuPhonePlus7(local10: string): string {
  const d = digitsOnly(local10).slice(0, RU_PHONE_DIGITS);
  if (!d) return "+7";
  return `+7${d}`;
}

export function isValidRuLocal10(local10: string): boolean {
  const d = digitsOnly(local10);
  return d.length === RU_PHONE_DIGITS;
}

