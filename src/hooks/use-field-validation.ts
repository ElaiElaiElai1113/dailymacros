import { useState, useCallback } from "react";
import { validateField, VALIDATION_RULES, type ValidationRule } from "@/utils/validation";

export interface UseFieldValidationProps {
  initialValue?: string;
  rules: ValidationRule[];
  validateOnBlur?: boolean;
  validateOnChange?: boolean;
}

export interface UseFieldValidationReturn {
  value: string;
  error?: string;
  isValid: boolean;
  isTouched: boolean;
  setValue: (value: string) => void;
  setTouched: () => void;
  setError: (error?: string) => void;
  reset: () => void;
  onBlur: () => void;
}

export function useFieldValidation({
  initialValue = "",
  rules,
  validateOnBlur = true,
  validateOnChange = false,
}: UseFieldValidationProps): UseFieldValidationReturn {
  const [value, setValueState] = useState(initialValue);
  const [isTouched, setIsTouched] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const validate = useCallback(
    (val: string) => {
      const result = validateField(val, rules);
      setError(result.error);
      return result.isValid;
    },
    [rules]
  );

  const setValue = useCallback(
    (newValue: string) => {
      setValueState(newValue);
      if (isTouched && validateOnChange) {
        validate(newValue);
      }
    },
    [isTouched, validateOnChange, validate]
  );

  const setTouched = useCallback(() => {
    setIsTouched(true);
    if (validateOnBlur) {
      validate(value);
    }
  }, [validateOnBlur, validate, value]);

  const onBlur = useCallback(() => {
    setTouched();
  }, [setTouched]);

  const setManualError = useCallback((err?: string) => {
    setError(err);
  }, []);

  const reset = useCallback(() => {
    setValueState(initialValue);
    setIsTouched(false);
    setError(undefined);
  }, [initialValue]);

  const isValid = !error;

  return {
    value,
    error,
    isValid,
    isTouched,
    setValue,
    setTouched,
    setError: setManualError,
    reset,
    onBlur,
  };
}

export { VALIDATION_RULES };
