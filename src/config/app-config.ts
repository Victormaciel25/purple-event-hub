/**
 * Application-wide configuration constants
 * 
 * This file centralizes all public endpoints and configuration values.
 * For sensitive values like API keys, use Supabase Edge Function Secrets instead.
 */

// Application domain configuration
export const APP_CONFIG = {
  PRODUCTION_DOMAIN: "https://www.ipartybrasil.com",
  DEVELOPMENT_DOMAIN: "http://localhost:3000"
};

// Supabase project details
export const SUPABASE_CONFIG = {
  URL: "https://kfqorqjwbkxzrqhuvnyh.supabase.co",
  PUBLIC_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmcW9ycWp3Ymt4enJxaHV2bnloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5Mzc2NTYsImV4cCI6MjA2MTUxMzY1Nn0.bfqH3CFPuE14hgQCiB8OBhr7YDfaK2sJqqnVaZexjjU"
};

// Helper function to get the correct domain
export const getCurrentDomain = () => {
  if (typeof window !== 'undefined') {
    return window.location.hostname === 'localhost' 
      ? APP_CONFIG.DEVELOPMENT_DOMAIN 
      : APP_CONFIG.PRODUCTION_DOMAIN;
  }
  return APP_CONFIG.PRODUCTION_DOMAIN;
};

// Edge function endpoints
export const EDGE_FUNCTIONS = {
  GET_USER_BY_EMAIL: `${SUPABASE_CONFIG.URL}/functions/v1/get_user_by_email`,
  DELETE_SPACE_WITH_PHOTOS: `${SUPABASE_CONFIG.URL}/functions/v1/delete_space_with_photos`,
  GET_USER_CHATS: `${SUPABASE_CONFIG.URL}/functions/v1/get_user_chats`,
  GET_CHAT_BY_USERS_AND_SPACE: `${SUPABASE_CONFIG.URL}/functions/v1/get_chat_by_users_and_space`,
  GET_MERCADO_PAGO_PUBLIC_KEY: `${SUPABASE_CONFIG.URL}/functions/v1/get-mercado-pago-public-key`,
  GEOCODE_ADDRESS: `${SUPABASE_CONFIG.URL}/functions/v1/geocode-address`,
  PLACES_AUTOCOMPLETE: `${SUPABASE_CONFIG.URL}/functions/v1/geocode-address`, // Reutilizamos a mesma função
  PLACE_DETAILS: `${SUPABASE_CONFIG.URL}/functions/v1/geocode-address`, // Reutilizamos a mesma função
};

// Google Maps API Key
export const GOOGLE_MAPS_API_KEY = "AIzaSyA5P5mbDieTYIeczsRTS1TSxR005fDnScc";

// Storage buckets
export const STORAGE = {
  SPACES_BUCKET: 'spaces'
};

// Application wide constants
export const APP_CONSTANTS = {
  DEFAULT_SPACE_IMAGE: "https://source.unsplash.com/random/600x400?event",
  FALLBACK_PROFILE_IMAGE: "https://i.pravatar.cc/300",
  PLACEHOLDER_IMAGE: "https://images.unsplash.com/photo-1566681855366-282a74153321?q=80&w=600&auto=format&fit=crop"
};

// Space categories
export const SPACE_CATEGORIES = {
  ALL: 'all',
  WEDDINGS: 'weddings',
  CORPORATE: 'corporate',
  BIRTHDAYS: 'birthdays',
  GRADUATIONS: 'graduations'
};

// Mercado Pago configuration
export const MERCADO_PAGO_CONFIG = {
  // Note: Public key is now retrieved from Edge Function
};
