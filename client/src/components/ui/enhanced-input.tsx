import * as React from "react";
import { cn } from "@/lib/utils";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { formatPhoneNumber, formatName, formatZipCode, validateEmail } from "@/lib/form-utils";

export interface EnhancedInputProps extends React.ComponentProps<"input"> {
  label?: string;
  error?: string;
  isValid?: boolean;
  isValidating?: boolean;
  showValidation?: boolean;
  autoFormat?: 'phone' | 'name' | 'zip' | 'email';
  required?: boolean;
  helpText?: string;
  suggestion?: string;
  onSuggestionAccept?: (suggestion: string) => void;
}

const EnhancedInput = React.forwardRef<HTMLInputElement, EnhancedInputProps>(
  ({ 
    className, 
    type, 
    label,
    error,
    isValid = false,
    isValidating = false,
    showValidation = false,
    autoFormat,
    required = false,
    helpText,
    suggestion,
    onSuggestionAccept,
    onChange,
    onBlur,
    ...props 
  }, ref) => {
    const [focused, setFocused] = React.useState(false);
    const [touched, setTouched] = React.useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let formattedValue = e.target.value;
      
      // Auto-format based on type
      switch (autoFormat) {
        case 'phone':
          formattedValue = formatPhoneNumber(e.target.value);
          break;
        case 'name':
          formattedValue = formatName(e.target.value);
          break;
        case 'zip':
          formattedValue = formatZipCode(e.target.value);
          break;
        case 'email':
          // Email doesn't need formatting, but we track it for validation
          break;
      }
      
      // Create synthetic event with formatted value
      const syntheticEvent = {
        ...e,
        target: { ...e.target, value: formattedValue }
      };
      
      onChange?.(syntheticEvent);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setFocused(false);
      setTouched(true);
      onBlur?.(e);
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setFocused(true);
    };

    const showError = touched && error && !focused;
    const showSuccess = touched && isValid && !error && props.value && showValidation;

    return (
      <div className="space-y-2">
        {label && (
          <label className="text-sm font-medium text-school-blue-900 dark:text-white flex items-center gap-1">
            {label}
            {required && <span className="text-red-500" aria-label="required">*</span>}
          </label>
        )}
        
        <div className="relative">
          <input
            type={type}
            className={cn(
              // Base styles
              "flex h-11 w-full rounded-lg border bg-white px-4 py-3 text-school-body text-school-blue-900 ring-offset-background transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-school-blue-900 placeholder:text-school-blue-400 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-school-blue-50 md:text-school-body",
              // Interactive states
              "hover:border-school-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-school-blue-500 focus-visible:ring-offset-2 focus-visible:border-school-blue-500",
              // Validation states
              showError && "border-red-500 ring-red-500 focus-visible:ring-red-500",
              showSuccess && "border-green-500 ring-green-500 focus-visible:ring-green-500",
              !showError && !showSuccess && "border-school-blue-200",
              // Dark mode
              "dark:bg-school-blue-800 dark:text-white dark:border-school-blue-600 dark:placeholder:text-school-blue-300 dark:hover:border-school-blue-500 dark:focus-visible:ring-school-blue-400",
              // Mobile optimization
              "touch-manipulation min-h-[48px] sm:min-h-[44px]",
              // Padding adjustment for validation icons
              (showValidation && (isValidating || showError || showSuccess)) && "pr-12",
              className
            )}
            ref={ref}
            onChange={handleChange}
            onBlur={handleBlur}
            onFocus={handleFocus}
            aria-invalid={!!error}
            aria-describedby={error ? `${props.id}-error` : helpText ? `${props.id}-help` : undefined}
            {...props}
          />
          
          {/* Validation indicator */}
          {showValidation && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              {isValidating && (
                <Loader2 className="h-4 w-4 animate-spin text-school-blue-500" />
              )}
              {!isValidating && showSuccess && (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
              {!isValidating && showError && (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
            </div>
          )}
        </div>
        
        {/* Error message */}
        {showError && (
          <p 
            id={`${props.id}-error`} 
            className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1"
            role="alert"
          >
            <AlertCircle className="h-3 w-3 flex-shrink-0" />
            {error}
          </p>
        )}
        
        {/* Help text */}
        {!showError && helpText && (
          <p 
            id={`${props.id}-help`}
            className="text-sm text-school-blue-600 dark:text-school-blue-300"
          >
            {helpText}
          </p>
        )}
        
        {/* Suggestion */}
        {suggestion && !showError && onSuggestionAccept && (
          <div className="text-sm">
            <button
              type="button"
              onClick={() => onSuggestionAccept(suggestion.split('@')[1])}
              className="text-school-blue-600 hover:text-school-blue-800 underline"
            >
              {suggestion}
            </button>
          </div>
        )}
      </div>
    );
  }
);

EnhancedInput.displayName = "EnhancedInput";

export { EnhancedInput };