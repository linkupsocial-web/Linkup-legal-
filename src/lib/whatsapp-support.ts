export function getWhatsAppSupportHref(number: string, message: string): string | null {
  const normalizedNumber = number.replace(/\D/g, "");
  if (!normalizedNumber) return null;

  return `https://wa.me/${normalizedNumber}?text=${encodeURIComponent(message)}`;
}
