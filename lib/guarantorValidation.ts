import {
  validateCustomerLocation,
  validateCustomerName,
  validateIdNumber,
  validatePhone,
  normalizePhone,
} from "./customerValidation";

export type GuarantorFormFields = {
  name: string;
  id_number: string;
  phone: string;
  location: string;
  relationship: string;
};

export function validateGuarantorField(name: string, value: string): string {
  switch (name) {
    case "name":
      return validateCustomerName(value) || "";
    case "id_number":
      return validateIdNumber(value) || "";
    case "phone":
      return validatePhone(value) || "";
    case "location":
      return validateCustomerLocation(value) || "";
    case "relationship":
      return value.trim() ? "" : "Relationship is required.";
    default:
      return "";
  }
}

export function validateGuarantorForm(
  form: GuarantorFormFields
): Partial<Record<keyof GuarantorFormFields, string>> {
  const errors: Partial<Record<keyof GuarantorFormFields, string>> = {};

  (Object.keys(form) as Array<keyof GuarantorFormFields>).forEach((field) => {
    const error = validateGuarantorField(field, form[field]);
    if (error) {
      errors[field] = error;
    }
  });

  return errors;
}

export function buildGuarantorPayload(form: GuarantorFormFields) {
  return {
    name: form.name.trim(),
    id_number: form.id_number.trim(),
    phone: normalizePhone(form.phone),
    location: form.location.trim(),
    relationship: form.relationship.trim(),
  };
}
