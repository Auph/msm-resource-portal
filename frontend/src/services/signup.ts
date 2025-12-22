import { reactive, ref, Ref } from '@vue/composition-api';
import axios, { AxiosError } from 'axios';
import { Notify } from 'quasar';

import {
  InterfaceSignupErrors,
  InterfaceLoginError,
  InterfaceStateSignup
} from 'src/interfaces';

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
   * Sends email verification
   */
  const sendEmailVerification = (email: string) => {
    if (!validateEmail(email)) {
      return;
    }

    completed.value = false;
    loading.value = true;

    axios
      .post(String(process.env.apiUrl) + '/auth/send-email-confirmation', {
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

  /**
   * Shows error notification and sets error field
   */
  const showError = (field: keyof InterfaceSignupErrors, message: string): void => {
    // Always show notification first - ensure it's called synchronously
    Notify.create({
      type: 'negative',
      message: message,
      position: 'top',
      timeout: 5000,
      actions: [{ icon: 'close', color: 'white' }]
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
      await axios.post(String(process.env.apiUrl) + '/auth/local/register', {
        firstName: state.firstName,
        lastName: state.lastName,
        interests: state.interests as number[],
        username: state.email?.toLowerCase(),
        email: state.email?.toLowerCase(),
        password: state.password
      });
      
      completed.value = true;
      reset();
    } catch (error) {
      const axiosError = error as AxiosError;
      const statusCode = axiosError.response?.status;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const errorData = axiosError.response?.data;
      
      // For 400 errors, always show duplicate email message immediately
      if (statusCode === 400) {
        // Show error immediately for 400 status
        showError('email', DUPLICATE_EMAIL_MESSAGE);
        
        // Try to process Strapi errors if data exists (but we've already shown the error)
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const hasData = errorData && typeof errorData === 'object' && Object.keys(errorData as Record<string, unknown>).length > 0;
        
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (hasData && errorData && typeof errorData === 'object' && 'data' in errorData && Array.isArray((errorData as { data: unknown }).data) && (errorData as { data: unknown[] }).data.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const signupErrors: InterfaceLoginError = errorData as InterfaceLoginError;
          // Process errors to potentially update the message, but error is already shown
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
    state
  };
};

export { useSignup };
