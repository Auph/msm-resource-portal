/**
 * Error Constants
 * 
 * Centralized error message IDs and user-facing messages
 */

/**
 * Strapi error message IDs
 */
export const ERROR_IDS = {
  // Authentication errors
  EMAIL_TAKEN: 'Auth.form.error.email.taken',
  USERNAME_TAKEN: 'Auth.form.error.username.taken',
  EMAIL_PROVIDE: 'Auth.form.error.email.provide',
  PASSWORD_PROVIDE: 'Auth.form.error.password.provide',
  PASSWORD_MATCHING: 'Auth.form.error.password.matching',
  INVALID: 'Auth.form.error.invalid',
  CONFIRMED: 'Auth.form.error.confirmed'
} as const;

/**
 * User-facing error messages
 */
export const ERROR_MESSAGES = {
  DUPLICATE_EMAIL: 'This email is already registered. Please use a different email or try logging in.',
  DUPLICATE_EMAIL_OR_INVALID: 'This email is already registered or invalid. Please use a different email or try logging in.',
  GENERIC_ERROR: 'An error occurred. Please try again.',
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  UNAUTHORIZED: 'Your session has expired. Please log in again.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  SERVER_ERROR: 'A server error occurred. Please try again later.',
  VALIDATION_ERROR: 'Please check your input and try again.'
} as const;

/**
 * HTTP status code messages
 */
export const HTTP_ERROR_MESSAGES: Record<number, string> = {
  400: ERROR_MESSAGES.VALIDATION_ERROR,
  401: ERROR_MESSAGES.UNAUTHORIZED,
  403: ERROR_MESSAGES.FORBIDDEN,
  404: ERROR_MESSAGES.NOT_FOUND,
  500: ERROR_MESSAGES.SERVER_ERROR,
  502: ERROR_MESSAGES.SERVER_ERROR,
  503: ERROR_MESSAGES.SERVER_ERROR
};

