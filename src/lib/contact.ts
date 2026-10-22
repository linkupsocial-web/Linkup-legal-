export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() ?? "";
export const CONTACT_EMAIL_HREF = CONTACT_EMAIL ? `mailto:${CONTACT_EMAIL}` : "";

export const CALL_NUMBER = process.env.NEXT_PUBLIC_CALL_NUMBER?.trim() ?? "";
export const CALL_NUMBER_LINK = CALL_NUMBER.replace(/\D/g, "");
export const CALL_NUMBER_HREF = CALL_NUMBER_LINK ? `tel:+${CALL_NUMBER_LINK}` : "";

export const WHATSAPP_NUMBER = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "").replace(/\D/g, "");
