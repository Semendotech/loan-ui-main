const PHONE_PATTERN = /^254\d{9,10}$/;

export const ID_NUMBER_ERROR = "Invalid ID number. Must be 8 digits.";
export const PHONE_FORMAT_ERROR = "Invalid phone number format.";

export function validateIdNumber(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return "ID number is required.";
  }
  if (!/^\d{8}$/.test(trimmed)) {
    return ID_NUMBER_ERROR;
  }
  return null;
}

export function normalizePhone(phone: string): string {
  if (!phone?.trim()) {
    throw new Error(PHONE_FORMAT_ERROR);
  }

  let cleaned = phone.trim().replace(/[\s\-()]/g, "");

  if (cleaned.startsWith("+")) {
    cleaned = cleaned.slice(1);
  }

  if (cleaned.startsWith("00254")) {
    cleaned = "254" + cleaned.slice(5);
  }

  if (cleaned.startsWith("0") && cleaned.length === 10) {
    cleaned = "254" + cleaned.slice(1);
  }

  if (!PHONE_PATTERN.test(cleaned)) {
    throw new Error(PHONE_FORMAT_ERROR);
  }

  return cleaned;
}

export function validatePhone(value: string): string | null {
  if (!value.trim()) {
    return "Phone number is required.";
  }
  try {
    normalizePhone(value);
    return null;
  } catch {
    return PHONE_FORMAT_ERROR;
  }
}

export function validateCustomerName(value: string): string | null {
  if (!value.trim()) {
    return "Full name is required.";
  }
  return null;
}

export function validateCustomerLocation(value: string): string | null {
  if (!value.trim()) {
    return "Location is required.";
  }
  return null;
}

export type CustomerFormFields = {
  name: string;
  id_number: string;
  phone: string;
  location?: string;
};

export function validateCustomerForm(
  form: CustomerFormFields
): Partial<Record<keyof CustomerFormFields, string>> {
  const errors: Partial<Record<keyof CustomerFormFields, string>> = {};

  const nameError = validateCustomerName(form.name);
  if (nameError) errors.name = nameError;

  const idError = validateIdNumber(form.id_number);
  if (idError) errors.id_number = idError;

  const phoneError = validatePhone(form.phone);
  if (phoneError) errors.phone = phoneError;

  const locationError = validateCustomerLocation(form.location || "");
  if (locationError) errors.location = locationError;

  return errors;
}
