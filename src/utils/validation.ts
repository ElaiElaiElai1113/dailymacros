/**
 * Form validation utilities
 */

export type ValidationRule = {
  validate: (value: string) => boolean;
  message: string;
};

export type FieldValidation = {
  isValid: boolean;
  error?: string;
};

export const VALIDATION_RULES = {
  required: (message = "This field is required"): ValidationRule => ({
    validate: (v) => v.trim().length > 0,
    message,
  }),
  minLength: (min: number, message?: string): ValidationRule => ({
    validate: (v) => v.trim().length >= min,
    message: message || `Must be at least ${min} characters`,
  }),
  maxLength: (max: number, message?: string): ValidationRule => ({
    validate: (v) => v.trim().length <= max,
    message: message || `Must be no more than ${max} characters`,
  }),
  phone: (message = "Please enter a valid phone number"): ValidationRule => ({
    validate: (v) => {
      const digits = v.replace(/\D/g, "");
      return digits.length >= 10 && digits.length <= 13;
    },
    message,
  }),
  email: (message = "Please enter a valid email address"): ValidationRule => ({
    validate: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()),
    message,
  }),
  numeric: (message = "Please enter a valid number"): ValidationRule => ({
    validate: (v) => !isNaN(Number(v)) && v.trim() !== "",
    message,
  }),
  positiveNumber: (message = "Please enter a positive number"): ValidationRule => ({
    validate: (v) => !isNaN(Number(v)) && Number(v) > 0,
    message,
  }),
};

/**
 * Validate a field value against a list of rules
 */
export function validateField(
  value: string,
  rules: ValidationRule[]
): FieldValidation {
  for (const rule of rules) {
    if (!rule.validate(value)) {
      return { isValid: false, error: rule.message };
    }
  }
  return { isValid: true };
}

/**
 * Validate multiple fields
 */
export function validateForm<T extends Record<string, string>>(
  values: T,
  schema: Record<keyof T, ValidationRule[]>
): { isValid: boolean; errors: Partial<Record<keyof T, string>> } {
  const errors: Partial<Record<keyof T, string>> = {};
  let isValid = true;

  for (const [field, rules] of Object.entries(schema)) {
    const result = validateField(values[field as keyof T], rules);
    if (!result.isValid) {
      errors[field as keyof T] = result.error!;
      isValid = false;
    }
  }

  return { isValid, errors };
}

/**
 * Real-time validation hook return type
 */
export type UseFieldValidationReturn = {
  value: string;
  error?: string;
  isValid: boolean;
  isTouched: boolean;
  setValue: (v: string) => void;
  setTouched: () => void;
  setError: (e?: string) => void;
};

/**
 * Hook-like utility for field validation (for non-hook components)
 */
export function createFieldValidator(
  initialValue: string,
  rules: ValidationRule[],
  validateOnChange = false
): UseFieldValidationReturn {
  const state = {
    value: initialValue,
    isTouched: false,
    error: undefined as string | undefined,
    isValid: true,

    setValue(v: string) {
      this.value = v;
      if (this.isTouched || validateOnChange) {
        const result = validateField(v, rules);
        this.error = result.error;
        this.isValid = result.isValid;
      }
    },

    setTouched() {
      this.isTouched = true;
      const result = validateField(this.value, rules);
      this.error = result.error;
      this.isValid = result.isValid;
    },

    setError(e?: string) {
      this.error = e;
      this.isValid = !e;
    },
  };

  return state;
}
