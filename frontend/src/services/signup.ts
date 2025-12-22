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
    if (field === 'email') {
      errors.email = message;
    } else if (field === 'password') {
      errors.password = message;
    } else {
      errors.others = message;
    }
    
    Notify.create({
      type: 'negative',
      message,
      position: 'top'
    });
  };

  /**
   * Extracts error message from various error response formats
   */
  const extractErrorMessage = (errorData: unknown): string | null => {
    if (!errorData || typeof errorData !== 'object') {
      return null;
    }

    // Try Strapi error format: { message: string }
    if ('message' in errorData && typeof (errorData as { message: unknown }).message === 'string') {
      return (errorData as { message: string }).message;
    }

    // Try nested error format: { error: { message: string } }
    if ('error' in errorData && 
        typeof (errorData as { error: unknown }).error === 'object' &&
        (errorData as { error: { message?: unknown } }).error !== null) {
      const errorObj = (errorData as { error: { message?: unknown } }).error;
      if (errorObj && 'message' in errorObj && typeof errorObj.message === 'string') {
        return errorObj.message;
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
        const messageLower = message.message.toLowerCase();
        
        // Check for duplicate email/username errors
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
        } else {
          // Generic error handling
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
  const signup = (): void => {
    if (!signupValidation()) {
      return;
    }

    resetErrors();
    loading.value = true;

    axios
      .post(String(process.env.apiUrl) + '/auth/local/register', {
        firstName: state.firstName,
        lastName: state.lastName,
        interests: state.interests as number[],
        username: state.email?.toLowerCase(),
        email: state.email?.toLowerCase(),
        password: state.password
      })
      .then(() => {
        completed.value = true;
        reset();
      })
      .catch((error: AxiosError) => {
        console.error('Registration error:', error.response);
        resetErrors();
        
        const statusCode = error.response?.status;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const errorData = error.response?.data;
        
        // Check if errorData is an empty object or has no useful data
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const hasData = errorData && typeof errorData === 'object' && Object.keys(errorData as Record<string, unknown>).length > 0;
        
        // Check for Strapi error format with data array
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (hasData && errorData.data && Array.isArray(errorData.data) && errorData.data.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const signupErrors: InterfaceLoginError = errorData as InterfaceLoginError;
          processStrapiErrors(signupErrors);
        } else if (hasData) {
          // Handle other error formats with actual data
          const errorMessage = extractErrorMessage(errorData);
          
          if (errorMessage) {
            if (isDuplicateEmailError(errorMessage)) {
              showError('email', DUPLICATE_EMAIL_MESSAGE);
            } else {
              showError('others', errorMessage);
            }
          } else {
            showError('others', GENERIC_ERROR_MESSAGE);
          }
        } else {
          // No error data or empty data object - check status code
          // 400 Bad Request often indicates validation errors like duplicate email
          if (statusCode === 400) {
            showError('email', 'This email is already registered or invalid. Please use a different email or try logging in.');
          } else {
            showError('others', GENERIC_ERROR_MESSAGE);
          }
        }
      })
      .finally(() => {
        loading.value = false;
      });
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
