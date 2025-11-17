/**
 * Utility Helper Functions
 */

import crypto from 'crypto';

/**
 * Generate a URL-friendly slug from a string
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Generate a unique slug with timestamp
 */
export function generateUniqueSlug(text: string): string {
  const slug = generateSlug(text);
  const timestamp = Date.now().toString(36);
  return `${slug}-${timestamp}`;
}

/**
 * Generate a random token
 */
export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Extract excerpt from content
 */
export function generateExcerpt(content: string, maxLength: number = 200): string {
  if (content.length <= maxLength) {
    return content;
  }

  return content.substring(0, maxLength).trim() + '...';
}

/**
 * Sanitize user input (basic)
 */
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, 1000); // Limit length
}

/**
 * Check if email is valid
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Check if password meets requirements
 */
export function isValidPassword(password: string): boolean {
  // At least 8 characters, contains letter and number
  return password.length >= 8 && /[a-zA-Z]/.test(password) && /[0-9]/.test(password);
}

/**
 * Format date to ISO string
 */
export function formatDate(date: Date): string {
  return date.toISOString();
}

/**
 * Calculate pagination offset
 */
export function getPaginationOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}

/**
 * Calculate total pages
 */
export function getTotalPages(total: number, limit: number): number {
  return Math.ceil(total / limit);
}

/**
 * Remove sensitive fields from user object
 */
export function sanitizeUser<T extends { password?: string }>(user: T): Omit<T, 'password'> {
  const { password, ...sanitized } = user;
  return sanitized;
}
