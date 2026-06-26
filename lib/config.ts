/**
 * Configuration file for environment variables
 * This centralizes all environment variable access and provides defaults
 */

// API URL configuration
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 
  (process.env.NODE_ENV === 'production' 
    ? 'https://loan-backend-main.onrender.com' // Production URL
    : 'http://localhost:8001'); // Development URL

// Application environment
export const NODE_ENV = process.env.NODE_ENV || 'development';

// Determine if we're in production
export const IS_PRODUCTION = NODE_ENV === 'production';

// Application configuration object
const config = {
  // API configuration
  api: {
    baseUrl: API_URL,
    timeout: 10000, // 10 seconds
  },

  cloudinary: {
    cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "",
    uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "",
  },
  
  // Feature flags
  features: {
    enableAnalytics: IS_PRODUCTION,
    debugMode: !IS_PRODUCTION,
  },
  
  // Auth configuration
  auth: {
    cookieName: 'session_token',
    cookieMaxAge: 60 * 60 * 24 * 7, // 7 days
  }
};

export default config;