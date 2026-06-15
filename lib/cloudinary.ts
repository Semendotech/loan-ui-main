import config from "./config";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];

export function validateImageFile(file: File) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Only PNG, JPG, WEBP, or GIF images are allowed");
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("Image must be smaller than 5MB");
  }
}

export async function uploadCustomerImage(file: File): Promise<string> {
  if (!config.cloudinary.cloudName || !config.cloudinary.uploadPreset) {
    throw new Error("Cloudinary is not configured");
  }

  validateImageFile(file);

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", config.cloudinary.uploadPreset);
  formData.append("folder", "customers");

  const endpoint = `https://api.cloudinary.com/v1_1/${config.cloudinary.cloudName}/image/upload`;
  const response = await fetch(endpoint, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const message =
      error?.error?.message || error?.message || "Failed to upload image";
    throw new Error(message);
  }

  const data = await response.json();
  if (!data?.secure_url) {
    throw new Error("Cloudinary upload did not return a URL");
  }
  return data.secure_url as string;
}


