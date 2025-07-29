
/**
 * Security validation utilities for content moderation
 * Server-side validation should be the primary defense
 */

export const validateInput = (input: string, maxLength: number = 5000): boolean => {
  if (input.length > maxLength) {
    return false;
  }
  
  // Check for basic XSS patterns
  const suspiciousPatterns = [
    /<script[^>]*>/i,
    /javascript:/i,
    /onclick/i,
    /onerror/i,
    /onload/i,
    /<iframe[^>]*>/i,
    /<object[^>]*>/i,
    /<embed[^>]*>/i
  ];
  
  return !suspiciousPatterns.some(pattern => pattern.test(input));
};

export const sanitizeInput = (input: string): string => {
  // Basic HTML entity encoding
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

export const validatePhone = (phone: string): boolean => {
  // Allow only numbers, spaces, hyphens, parentheses, and plus sign
  const phoneRegex = /^[\d\s\-\(\)\+]+$/;
  return phoneRegex.test(phone) && phone.length >= 8 && phone.length <= 20;
};

export const validateUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
};
