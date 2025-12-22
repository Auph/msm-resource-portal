/**
 * Error Handling Utilities
 * 
 * Provides consistent error handling across the application
 */

import { AxiosError } from 'axios';
import { Notify } from 'quasar';
import { InterfaceLoginError } from '../interfaces';

export interface ErrorDisplayOptions {
  showNotification?: boolean;
  notificationType?: 'negative' | 'warning' | 'info';
  field?: string;
}

/**
 * Extracts error message from various error response formats
 */
export const extractErrorMessage = (error: unknown): string => {
  if (!error) {
    return 'An unexpected error occurred';
  }

  // Handle Axios errors
  if (error instanceof Error && 'response' in error) {
    const axiosError = error as AxiosError;
    const errorData = axiosError.response?.data;

    if (errorData) {
      // Try Strapi error format with data array
      if (
        typeof errorData === 'object' &&
        'data' in errorData &&
        Array.isArray((errorData as { data: unknown }).data)
      ) {
        const strapiError = errorData as InterfaceLoginError;
        if (strapiError.data && strapiError.data.length > 0) {
          const firstMessage = strapiError.data[0]?.messages?.[0];
          if (firstMessage?.message) {
            return firstMessage.message;
          }
        }
      }

      // Try simple message format
      if (typeof errorData === 'object' && 'message' in errorData) {
        const message = (errorData as { message: unknown }).message;
        if (typeof message === 'string') {
          return message;
        }
      }

      // Try nested error format
      if (typeof errorData === 'object' && 'error' in errorData) {
        const nestedError = (errorData as { error: { message?: unknown } }).error;
        if (nestedError?.message && typeof nestedError.message === 'string') {
          return nestedError.message;
        }
      }
    }

    // Fallback to status text or error message
    return (
      axiosError.response?.statusText ||
      axiosError.message ||
      'An error occurred while processing your request'
    );
  }

  // Handle regular Error objects
  if (error instanceof Error) {
    return error.message;
  }

  // Fallback
  return 'An unexpected error occurred';
};

/**
 * Checks if error indicates duplicate email/username
 */
export const isDuplicateEmailError = (error: unknown): boolean => {
  const message = extractErrorMessage(error).toLowerCase();
  return (
    (message.includes('email') || message.includes('username')) &&
    (message.includes('already') ||
      message.includes('taken') ||
      message.includes('exists'))
  );
};

/**
 * Processes Strapi error format and extracts all messages
 */
export const processStrapiErrors = (
  errorData: unknown
): Array<{ id?: string; message: string }> => {
  const messages: Array<{ id?: string; message: string }> = [];

  if (
    errorData &&
    typeof errorData === 'object' &&
    'data' in errorData &&
    Array.isArray((errorData as { data: unknown }).data)
  ) {
    const strapiError = errorData as InterfaceLoginError;
    if (strapiError.data) {
      for (const single of strapiError.data) {
        for (const message of single.messages) {
          messages.push({
            id: message.id,
            message: message.message
          });
        }
      }
    }
  }

  return messages;
};

/**
 * Displays error to user
 */
export const displayError = (
  error: unknown,
  options: ErrorDisplayOptions = {}
): string => {
  const {
    showNotification = true,
    notificationType = 'negative',
    field
  } = options;

  const errorMessage = extractErrorMessage(error);

  if (showNotification) {
    Notify.create({
      type: notificationType,
      message: errorMessage,
      position: 'top'
    });
  }

  return errorMessage;
};

/**
 * Handles API errors consistently
 */
export const handleApiError = (
  error: unknown,
  options: ErrorDisplayOptions = {}
): {
  message: string;
  isDuplicateEmail: boolean;
  field?: string;
} => {
  const message = extractErrorMessage(error);
  const isDuplicateEmail = isDuplicateEmailError(error);

  displayError(error, options);

  return {
    message,
    isDuplicateEmail,
    field: options.field
  };
};

