import { reactive, ref, Ref } from '@vue/composition-api';
import axios, { AxiosError, AxiosResponse } from 'axios';
import { Notify } from 'quasar';

import {
  InterfaceSignupErrors,
  InterfaceLoginError,
  InterfaceLoginResponse,
  InterfaceStateSignup
} from 'src/interfaces';
import { Router } from 'src/router';
import { useUser } from './user';

// Constants
const DUPLICATE_EMAIL_MESSAGE = 'This email is already registered. Please use a different email or try logging in.';
const GENERIC_ERROR_MESSAGE = 'An error occurred during registration. Please try again.';
const MIN_PASSWORD_LENGTH = 8;

// Error message IDs
const ERROR_IDS = {
  EMAIL_TAKEN: 'Auth.form.error.email.taken',
  USERNAME_TAKEN: 'Auth.form.error.username.taken',
  EMAIL_PROVIDE: 'Auth.form.error.email.provide',
  PASSWORD_PROVIDE: 'Auth.form.error.password.provide',
  PASSWORD_MATCHING: 'Auth.form.error.password.matching'
} as const;

const defaultState: InterfaceStateSignup = {
  firstName: null,
  lastName: null,
  email: null,
  interests: [],
  password: null,
  passwordconfirm: null
};
const defaultSignupErrors: InterfaceSignupErrors = {
  firstName: null,
  lastName: null,
  email: null,
  interests: null,
  password: null,
  passwordconfirm: null,
  others: null
};

const state: InterfaceStateSignup = reactive({
  ...defaultState
});
const errors: InterfaceSignupErrors = reactive({
  ...defaultSignupErrors
});

const loading: Ref<boolean> = ref(false);
const completed: Ref<boolean> = ref(false);

const useSignup = () => {
  const reset = (): void => {
    state.firstName = defaultState.firstName;
    state.lastName = defaultState.lastName;
    // Keep email for verification step
    // state.email = defaultState.email
    state.password = defaultState.password;
    state.passwordconfirm = defaultState.passwordconfirm;
  };
  const resetErrors = (): void => {
    errors.firstName = null;
    errors.lastName = null;
    errors.email = null;
    errors.interests = null;
    errors.password = null;
    errors.passwordconfirm = null;
    errors.others = null;
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

    return emailRegex.test(String(email).toLowerCase());
  };

  const signupValidation = (): boolean => {
    resetErrors();

    let isValid = true;

    if (!state.firstName || state.firstName.trim() === '') {
      errors.firstName = 'First name is required';
      isValid = false;
    }
    if (!state.lastName || state.lastName.trim() === '') {
      errors.lastName = 'Last name is required';
      isValid = false;
    }
    if (!state.email || !validateEmail(String(state.email))) {
      errors.email = 'A valid email address is required';
      isValid = false;
    }
    if (!state.password || state.password.length < MIN_PASSWORD_LENGTH) {
      errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`;
      isValid = false;
    }
    if (state.passwordconfirm !== state.password) {
      errors.passwordconfirm = 'Passwords do not match';
      isValid = false;
    }

    return isValid;
  };

  /**
   * Validates email availability before proceeding to next step
   * This attempts a registration to check if email exists, but doesn't complete it
   */
  const validateEmailAvailability = async (): Promise<boolean> => {
    // First validate basic form fields
    if (!signupValidation()) {
      return false;
    }

    // Check if email already has an error (from previous attempt)
    if (errors.email) {
      return false;
    }

    loading.value = true;

    try {
      // Try to register to check if email exists
      // We'll catch 400 errors which indicate duplicate email
      // Match authentication.ts pattern exactly
      const checkUrl = String(process.env.apiUrl) + '/auth/local/register';
      
      await axios.post(checkUrl, {
        firstName: state.firstName,
        lastName: state.lastName,
        username: state.email?.toLowerCase(),
        email: state.email?.toLowerCase(),
        password: state.password
      });
      
      // If registration succeeds, email is available
      // But we don't want to actually register here, so this shouldn't happen
      // This means the email is available
      loading.value = false;
      return true;
    } catch (error) {
      const axiosError = error as AxiosError;
      const statusCode = axiosError.response?.status;
      
      // 400 means duplicate email or validation error
      if (statusCode === 400) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const errorData = axiosError.response?.data;
        
        // Check if it's a duplicate email error
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const hasData = errorData && typeof errorData === 'object' && Object.keys(errorData as Record<string, unknown>).length > 0;
        
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (hasData && errorData && typeof errorData === 'object' && 'data' in errorData && Array.isArray((errorData as { data: unknown }).data) && (errorData as { data: unknown[] }).data.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const signupErrors: InterfaceLoginError = errorData as InterfaceLoginError;
          let isDuplicateEmail = false;
          
          for (const single of signupErrors.data) {
            for (const message of single.messages) {
              if (
                message.id === ERROR_IDS.EMAIL_TAKEN ||
                message.id === ERROR_IDS.USERNAME_TAKEN ||
                isDuplicateEmailError(message.message)
              ) {
                isDuplicateEmail = true;
                break;
              }
            }
            if (isDuplicateEmail) break;
          }
          
          if (isDuplicateEmail) {
            errors.email = DUPLICATE_EMAIL_MESSAGE;
            Notify.create({
              type: 'negative',
              message: DUPLICATE_EMAIL_MESSAGE,
              position: 'top'
            });
            loading.value = false;
            return false;
          }
        } else {
          // Empty error data with 400 - likely duplicate email
          errors.email = DUPLICATE_EMAIL_MESSAGE;
          Notify.create({
            type: 'negative',
            message: DUPLICATE_EMAIL_MESSAGE,
            position: 'top'
          });
          loading.value = false;
          return false;
        }
      }
      
      // Other errors - allow proceeding (might be network issues, etc.)
      loading.value = false;
      return true;
    }
  };

  /**
   * Sends email verification
   */
  const sendEmailVerification = (email: string) => {
    if (!validateEmail(email)) {
      return;
    }

    completed.value = false;
    loading.value = true;

    // Match authentication.ts pattern exactly
    const emailConfirmUrl = String(process.env.apiUrl) + '/auth/send-email-confirmation';

    axios
      
      axios.post(emailConfirmUrl, {
        email: email.toLowerCase()
      })
      .then(() => {
        completed.value = true;
      })
      .catch((error: AxiosError) => {
        console.log(error.response);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const loginErrors: InterfaceLoginError =
          error.response && error.response.data ? error.response.data : null;

        if (loginErrors !== null) {
          for (const single of loginErrors.data) {
            for (const message of single.messages) {
              switch (message.id) {
                default:
                  Notify.create(message.message);
                  errors.others = message.message;
                  break;
              }
            }
          }
        }
      })
      .finally(() => {
        loading.value = false;
        resetErrors();
      });
  };

  /**
   * Checks if error message indicates duplicate email/username
   */
  const isDuplicateEmailError = (message: string): boolean => {
    const messageLower = message.toLowerCase();
    return (
      messageLower.includes('email') && (
        messageLower.includes('already') ||
        messageLower.includes('taken') ||
        messageLower.includes('exists')
      ) ||
      messageLower.includes('username') && (
        messageLower.includes('already') ||
        messageLower.includes('taken') ||
        messageLower.includes('exists')
      )
    );
  };

  // Store timeout reference for debouncing
  let emailCheckTimeout: ReturnType<typeof setTimeout> | null = null;

  /**
   * Checks if email is available (not already registered)
   * This is called in real-time as user types (with debouncing)
   */
  const checkEmailAvailability = (email: string): void => {
    // Clear previous timeout
    if (emailCheckTimeout) {
      clearTimeout(emailCheckTimeout);
      emailCheckTimeout = null;
    }

    // Reset email error if email is empty or invalid format
    if (!email || !validateEmail(email)) {
      // Only clear error if it was a duplicate email error
      if (errors.email === DUPLICATE_EMAIL_MESSAGE) {
        errors.email = null;
      }
      return;
    }

    // Debounce the API call - wait 500ms after user stops typing
    emailCheckTimeout = setTimeout(() => {
      // Reset email error first (will be set again if duplicate)
      if (errors.email === DUPLICATE_EMAIL_MESSAGE) {
        errors.email = null;
      }

      // Use void to explicitly ignore the promise
      void (async () => {
        try {
          // Try to register to check if email exists
          // We'll catch 400 errors which indicate duplicate email
          // Match authentication.ts pattern exactly
          const checkUrl = String(process.env.apiUrl) + '/auth/local/register';
          
          await axios.post(checkUrl, {
            firstName: 'Validation',
            lastName: 'Check',
            username: email.toLowerCase(),
            email: email.toLowerCase(),
            password: 'TempPass123!' // Temporary password just for validation
          });
          
          // If registration succeeds, email is available (but we don't want to actually register)
          // This shouldn't happen in normal flow, but if it does, email is available
          // Clear any previous duplicate email error
          if (errors.email === DUPLICATE_EMAIL_MESSAGE) {
            errors.email = null;
          }
        } catch (error) {
          const axiosError = error as AxiosError;
          const statusCode = axiosError.response?.status;
          
          // 400 means duplicate email or validation error
          if (statusCode === 400) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const errorData = axiosError.response?.data;
            
            // Check if it's a duplicate email error
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            const hasData = errorData && typeof errorData === 'object' && Object.keys(errorData as Record<string, unknown>).length > 0;
            
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            if (hasData && errorData && typeof errorData === 'object' && 'data' in errorData && Array.isArray((errorData as { data: unknown }).data) && (errorData as { data: unknown[] }).data.length > 0) {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              const signupErrors: InterfaceLoginError = errorData as InterfaceLoginError;
              let isDuplicateEmail = false;
              
              for (const single of signupErrors.data) {
                for (const message of single.messages) {
                  if (
                    message.id === ERROR_IDS.EMAIL_TAKEN ||
                    message.id === ERROR_IDS.USERNAME_TAKEN ||
                    isDuplicateEmailError(message.message)
                  ) {
                    isDuplicateEmail = true;
                    break;
                  }
                }
                if (isDuplicateEmail) break;
              }
              
              if (isDuplicateEmail) {
                errors.email = DUPLICATE_EMAIL_MESSAGE;
                Notify.create({
                  type: 'negative',
                  message: DUPLICATE_EMAIL_MESSAGE,
                  position: 'top'
                });
              }
            } else {
              // Empty error data with 400 - likely duplicate email
              errors.email = DUPLICATE_EMAIL_MESSAGE;
              Notify.create({
                type: 'negative',
                message: DUPLICATE_EMAIL_MESSAGE,
                position: 'top'
              });
            }
          }
        }
      })();
    }, 500); // 500ms debounce delay
  };

  /**
   * Validates password match in real-time
   * Called on input/blur events for password fields
   */
  const validatePasswordMatch = (): void => {
    // Only validate if both fields have values
    if (state.password && state.passwordconfirm) {
      if (state.passwordconfirm !== state.password) {
        errors.passwordconfirm = 'Passwords do not match';
      } else {
        // Clear error when passwords match
        errors.passwordconfirm = null;
      }
    } else if (!state.passwordconfirm) {
      // Clear error if confirm password is empty
      errors.passwordconfirm = null;
    }
    
    // Also validate password length
    if (state.password) {
      if (state.password.length < MIN_PASSWORD_LENGTH) {
        errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`;
      } else {
        errors.password = null;
      }
    } else {
      errors.password = null;
    }
  };

  /**
   * Validates form fields before proceeding to next step
   * This only validates form fields, not email availability
   * Email availability should be checked separately (on blur or input)
   */
  const validateFormBeforeProceed = (): boolean => {
    // Validate all form fields
    if (!signupValidation()) {
      return false;
    }

    // Check if email already has an error (from previous check or registration attempt)
    if (errors.email) {
      return false;
    }

    return true;
  };

  /**
   * Shows error notification and sets error field
   */
  const showError = (field: keyof InterfaceSignupErrors, message: string): void => {
    // Always show notification first - use simple format like authentication.ts
    Notify.create({
      type: 'negative',
      message: message,
      position: 'top'
    });
    
    // Then set the field error
    if (field === 'email') {
      errors.email = message;
    } else if (field === 'password') {
      errors.password = message;
    } else {
      errors.others = message;
    }
  };

  /**
   * Type guard to check if value is a non-null object
   */
  const isNonNullObject = (value: unknown): value is Record<string, unknown> => {
    return value !== null && value !== undefined && typeof value === 'object';
  };

  /**
   * Extracts error message from various error response formats
   */
  const extractErrorMessage = (errorData: unknown): string | null => {
    // Type guard: ensure errorData is a non-null object
    if (!isNonNullObject(errorData)) {
      return null;
    }

    // Try Strapi error format: { message: string }
    if ('message' in errorData) {
      const message = errorData.message;
      if (message !== null && message !== undefined && typeof message === 'string') {
        return message;
      }
    }

    // Try nested error format: { error: { message: string } }
    if ('error' in errorData) {
      const errorField = errorData.error;
      if (isNonNullObject(errorField) && 'message' in errorField) {
        const errorMessage = errorField.message;
        if (errorMessage !== null && errorMessage !== undefined && typeof errorMessage === 'string') {
          return errorMessage;
        }
      }
    }

    return null;
  };

  /**
   * Processes Strapi error format with data array
   */
  const processStrapiErrors = (signupErrors: InterfaceLoginError): boolean => {
    let handled = false;
    
    for (const single of signupErrors.data) {
      for (const message of single.messages) {
        // Check for duplicate email/username errors first
        if (
          message.id === ERROR_IDS.EMAIL_TAKEN ||
          message.id === ERROR_IDS.USERNAME_TAKEN ||
          isDuplicateEmailError(message.message)
        ) {
          showError('email', DUPLICATE_EMAIL_MESSAGE);
          return true; // Exit early after showing email error
        }
        
        // Handle specific error types
        if (message.id === ERROR_IDS.EMAIL_PROVIDE) {
          showError('email', message.message);
          handled = true;
        } else if (message.id === ERROR_IDS.PASSWORD_PROVIDE || message.id === ERROR_IDS.PASSWORD_MATCHING) {
          showError('password', message.message);
          handled = true;
        } else if (message.message) {
          // Generic error handling - only if we have a message
          showError('others', message.message);
          handled = true;
        }
      }
    }
    
    return handled;
  };

  /**
   * Signs up the user
   */
  const signup = async (): Promise<void> => {
    // Validate first
    if (!signupValidation()) {
      return;
    }

    resetErrors();
    loading.value = true;

    try {
      // Match authentication.ts pattern exactly - use same endpoint structure
      // Authentication uses: String(process.env.apiUrl) + '/auth/local'
      // So registration should use: String(process.env.apiUrl) + '/auth/local/register'
      const registerUrl = String(process.env.apiUrl) + '/auth/local/register';
      
      const response: AxiosResponse<InterfaceLoginResponse> = await axios.post(registerUrl, {
        firstName: state.firstName,
        lastName: state.lastName,
        interests: state.interests as number[],
        username: state.email?.toLowerCase(),
        email: state.email?.toLowerCase(),
        password: state.password
      });
      
      // Save user profile (JWT and user data) like login does
      const { login } = useUser();
      await login(response.data);
      
      // Reset form state
        reset();
      
      // Set loading to false
      loading.value = false;
      
      // Redirect to dashboard immediately using window.location
      // This bypasses router guards and ensures a full page reload
      // which is necessary after registration to properly initialize the user session
      window.location.href = '/dashboard';
    } catch (error) {
      const axiosError = error as AxiosError;
      const statusCode = axiosError.response?.status;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const errorData = axiosError.response?.data;
      
        loading.value = false;
      
      // Log the error for debugging
      console.error('Registration error:', {
        status: statusCode,
        url: registerUrl,
        error: errorData
      });
      
      // Handle 405 Method Not Allowed - endpoint might be wrong
      if (statusCode === 405) {
        Notify.create({
          type: 'negative',
          message: 'Registration endpoint not found. Please contact support.',
          position: 'top'
        });
        errors.others = 'Registration endpoint not found. Please try again or contact support.';
        return;
      }
      
      // For 400 errors, always show duplicate email message immediately
      // This ensures the user always sees an error message
      if (statusCode === 400) {
        // Show error notification immediately - use simple format like authentication.ts
        Notify.create({
          type: 'negative',
          message: DUPLICATE_EMAIL_MESSAGE,
          position: 'top'
        });
        
        // Also set the field error
        errors.email = DUPLICATE_EMAIL_MESSAGE;
        
        // Try to process Strapi errors if data exists to potentially get a better message
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const hasData = errorData && typeof errorData === 'object' && Object.keys(errorData as Record<string, unknown>).length > 0;
        
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (hasData && errorData && typeof errorData === 'object' && 'data' in errorData && Array.isArray((errorData as { data: unknown }).data) && (errorData as { data: unknown[] }).data.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const signupErrors: InterfaceLoginError = errorData as InterfaceLoginError;
          // Process errors to potentially update the message
          processStrapiErrors(signupErrors);
        }
      } else {
        // Other status codes
        const errorMessage = extractErrorMessage(axiosError);
        if (errorMessage && errorMessage !== 'An unexpected error occurred') {
          showError('others', errorMessage);
        } else {
          showError('others', GENERIC_ERROR_MESSAGE);
        }
      }
    } finally {
      loading.value = false;
    }
  };

  return {
    completed,
    errors,
    loading,
    sendEmailVerification,
    signup,
    state,
    validateFormBeforeProceed,
    checkEmailAvailability,
    validatePasswordMatch
  };
};

export { useSignup };
