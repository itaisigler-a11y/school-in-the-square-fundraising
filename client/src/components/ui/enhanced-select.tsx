import * as React from "react";
import { cn } from "@/lib/utils";
import { CheckCircle, AlertCircle, Loader2, ChevronDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";

export interface EnhancedSelectProps {
  label?: string;
  error?: string;
  isValid?: boolean;
  isValidating?: boolean;
  showValidation?: boolean;
  required?: boolean;
  helpText?: string;
  placeholder?: string;
  options: Array<{ value: string; label: string; description?: string }>;
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
}

const EnhancedSelect = React.forwardRef<HTMLButtonElement, EnhancedSelectProps>(
  ({ 
    label,
    error,
    isValid = false,
    isValidating = false,
    showValidation = false,
    required = false,
    helpText,
    placeholder = "Select an option...",
    options,
    value,
    onValueChange,
    disabled = false,
    className,
    id,
    ...props 
  }, ref) => {
    const [touched, setTouched] = React.useState(false);

    const handleValueChange = (newValue: string) => {
      setTouched(true);
      onValueChange?.(newValue);
    };

    const showError = touched && error;
    const showSuccess = touched && isValid && !error && value && showValidation;

    return (
      <div className="space-y-2">
        {label && (
          <label className="text-sm font-medium text-school-blue-900 dark:text-white flex items-center gap-1">
            {label}
            {required && <span className="text-red-500" aria-label="required">*</span>}
          </label>
        )}
        
        <div className="relative">
          <Select value={value} onValueChange={handleValueChange} disabled={disabled}>
            <SelectTrigger
              ref={ref}
              id={id}
              className={cn(
                // Base styles with mobile optimization
                "h-11 min-h-[48px] sm:min-h-[44px] w-full rounded-lg border bg-white px-4 py-3 text-school-body text-school-blue-900 transition-all duration-200 hover:border-school-blue-300 focus:outline-none focus:ring-2 focus:ring-school-blue-500 focus:ring-offset-2 focus:border-school-blue-500 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-school-blue-50",
                // Validation states
                showError && "border-red-500 ring-red-500 focus:ring-red-500",
                showSuccess && "border-green-500 ring-green-500 focus:ring-green-500",
                !showError && !showSuccess && "border-school-blue-200",
                // Dark mode
                "dark:bg-school-blue-800 dark:text-white dark:border-school-blue-600 dark:hover:border-school-blue-500 dark:focus:ring-school-blue-400",
                // Padding adjustment for validation icons
                (showValidation && (isValidating || showError || showSuccess)) && "pr-12",
                className
              )}
              aria-invalid={!!error}
              aria-describedby={error ? `${id}-error` : helpText ? `${id}-help` : undefined}
            >
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            
            <SelectContent className="bg-white dark:bg-school-blue-800 border-school-blue-200 dark:border-school-blue-600">
              {options.map((option) => (
                <SelectItem 
                  key={option.value} 
                  value={option.value}
                  className="text-school-blue-900 dark:text-white hover:bg-school-blue-50 dark:hover:bg-school-blue-700 focus:bg-school-blue-100 dark:focus:bg-school-blue-700"
                >
                  <div className="flex flex-col">
                    <span>{option.label}</span>
                    {option.description && (
                      <span className="text-xs text-school-blue-600 dark:text-school-blue-300">
                        {option.description}
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Validation indicator */}
          {showValidation && (
            <div className="absolute inset-y-0 right-8 flex items-center pr-1">
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
            id={`${id}-error`} 
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
            id={`${id}-help`}
            className="text-sm text-school-blue-600 dark:text-school-blue-300"
          >
            {helpText}
          </p>
        )}
      </div>
    );
  }
);

EnhancedSelect.displayName = "EnhancedSelect";

export { EnhancedSelect };