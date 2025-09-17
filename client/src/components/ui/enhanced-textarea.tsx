import * as React from "react";
import { cn } from "@/lib/utils";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";

export interface EnhancedTextareaProps extends React.ComponentProps<"textarea"> {
  label?: string;
  error?: string;
  isValid?: boolean;
  isValidating?: boolean;
  showValidation?: boolean;
  required?: boolean;
  helpText?: string;
  maxLength?: number;
  showCharCount?: boolean;
}

const EnhancedTextarea = React.forwardRef<HTMLTextAreaElement, EnhancedTextareaProps>(
  ({ 
    className, 
    label,
    error,
    isValid = false,
    isValidating = false,
    showValidation = false,
    required = false,
    helpText,
    maxLength,
    showCharCount = false,
    onChange,
    onBlur,
    ...props 
  }, ref) => {
    const [focused, setFocused] = React.useState(false);
    const [touched, setTouched] = React.useState(false);
    const [charCount, setCharCount] = React.useState(0);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setCharCount(e.target.value.length);
      onChange?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      setFocused(false);
      setTouched(true);
      onBlur?.(e);
    };

    const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      setFocused(true);
    };

    React.useEffect(() => {
      if (props.value) {
        setCharCount(String(props.value).length);
      }
    }, [props.value]);

    const showError = touched && error && !focused;
    const showSuccess = touched && isValid && !error && props.value && showValidation;
    const isNearLimit = maxLength && charCount > maxLength * 0.8;
    const isOverLimit = maxLength && charCount > maxLength;

    return (
      <div className="space-y-2">
        {label && (
          <label className="text-sm font-medium text-school-blue-900 dark:text-white flex items-center gap-1">
            {label}
            {required && <span className="text-red-500" aria-label="required">*</span>}
          </label>
        )}
        
        <div className="relative">
          <textarea
            className={cn(
              // Base styles
              "flex min-h-[120px] w-full rounded-lg border bg-white px-4 py-3 text-school-body text-school-blue-900 ring-offset-background transition-all duration-200 placeholder:text-school-blue-400 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-school-blue-50 md:text-school-body resize-none",
              // Interactive states
              "hover:border-school-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-school-blue-500 focus-visible:ring-offset-2 focus-visible:border-school-blue-500",
              // Validation states
              showError && "border-red-500 ring-red-500 focus-visible:ring-red-500",
              showSuccess && "border-green-500 ring-green-500 focus-visible:ring-green-500",
              isOverLimit && "border-red-500",
              !showError && !showSuccess && !isOverLimit && "border-school-blue-200",
              // Dark mode
              "dark:bg-school-blue-800 dark:text-white dark:border-school-blue-600 dark:placeholder:text-school-blue-300 dark:hover:border-school-blue-500 dark:focus-visible:ring-school-blue-400",
              // Mobile optimization
              "touch-manipulation",
              className
            )}
            ref={ref}
            onChange={handleChange}
            onBlur={handleBlur}
            onFocus={handleFocus}
            maxLength={maxLength}
            aria-invalid={!!error || isOverLimit ? "true" : "false"}
            aria-describedby={error ? `${props.id}-error` : helpText ? `${props.id}-help` : undefined}
            {...props}
          />
          
          {/* Validation indicator */}
          {showValidation && (
            <div className="absolute top-3 right-3">
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
        
        {/* Character count */}
        {(showCharCount || maxLength) && (
          <div className="flex justify-between items-center text-sm">
            <div /> {/* Spacer */}
            <div className={cn(
              "text-school-blue-600 dark:text-school-blue-300",
              isNearLimit && !isOverLimit && "text-yellow-600 dark:text-yellow-400",
              isOverLimit && "text-red-600 dark:text-red-400 font-medium"
            )}>
              {charCount}{maxLength && `/${maxLength}`}
            </div>
          </div>
        )}
        
        {/* Error message */}
        {(showError || isOverLimit) && (
          <p 
            id={`${props.id}-error`} 
            className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1"
            role="alert"
          >
            <AlertCircle className="h-3 w-3 flex-shrink-0" />
            {error || (isOverLimit && `Character limit exceeded by ${charCount - maxLength!} characters`)}
          </p>
        )}
        
        {/* Help text */}
        {!showError && !isOverLimit && helpText && (
          <p 
            id={`${props.id}-help`}
            className="text-sm text-school-blue-600 dark:text-school-blue-300"
          >
            {helpText}
          </p>
        )}
      </div>
    );
  }
);

EnhancedTextarea.displayName = "EnhancedTextarea";

export { EnhancedTextarea };