import { z } from "zod";

// Enhanced validation utilities for real-time form feedback
export interface ValidationState {
  isValid: boolean;
  error?: string;
  isValidating?: boolean;
}

// Phone number formatting utility
export function formatPhoneNumber(value: string): string {
  // Remove all non-numeric characters
  const numbers = value.replace(/\D/g, '');
  
  // Handle different lengths
  if (numbers.length === 0) return '';
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 6) return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`;
  return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`;
}

// Email validation with domain suggestions
export function validateEmail(email: string): { isValid: boolean; suggestion?: string; error?: string } {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!email) return { isValid: true }; // Optional field
  if (!emailRegex.test(email)) {
    return { isValid: false, error: "Please enter a valid email address" };
  }
  
  // Common domain suggestions
  const commonDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com'];
  const domain = email.split('@')[1];
  const suggestion = commonDomains.find(d => 
    d !== domain && levenshteinDistance(domain, d) === 1
  );
  
  return { 
    isValid: true, 
    suggestion: suggestion ? `Did you mean ${email.split('@')[0]}@${suggestion}?` : undefined 
  };
}

// Name capitalization utility
export function formatName(name: string): string {
  if (!name) return '';
  
  return name
    .toLowerCase()
    .split(' ')
    .map(word => {
      // Handle special cases like O'Brien, McDonald
      if (word.includes("'")) {
        return word.split("'").map(part => 
          part.charAt(0).toUpperCase() + part.slice(1)
        ).join("'");
      }
      if (word.startsWith('mc') && word.length > 2) {
        return 'Mc' + word.charAt(2).toUpperCase() + word.slice(3);
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

// ZIP code formatting
export function formatZipCode(value: string): string {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 5) return numbers;
  return `${numbers.slice(0, 5)}-${numbers.slice(5, 9)}`;
}

// Real-time validation hook - simplified without shape access
export function useRealtimeValidation<T>(
  schema: z.ZodSchema<T>,
  value: any,
  fieldName: string,
  debounceMs = 300
): ValidationState {
  const [validationState, setValidationState] = React.useState<ValidationState>({
    isValid: true,
  });

  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!value && value !== 0) {
        setValidationState({ isValid: true });
        return;
      }

      setValidationState({ isValid: true, isValidating: true });

      try {
        // Validate the entire object instead of individual field
        const testObj = { [fieldName]: value } as T;
        schema.parse(testObj);
        setValidationState({ isValid: true, isValidating: false });
      } catch (error) {
        if (error instanceof z.ZodError) {
          const fieldError = error.errors.find(err => 
            err.path.length > 0 && err.path[0] === fieldName
          );
          if (fieldError) {
            setValidationState({
              isValid: false,
              error: fieldError.message || 'Invalid value',
              isValidating: false,
            });
          } else {
            setValidationState({ isValid: true, isValidating: false });
          }
        }
      }
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [value, schema, fieldName, debounceMs]);

  return validationState;
}

// Draft saving utilities
export class DraftManager {
  private static PREFIX = 'form_draft_';

  static saveDraft(formId: string, data: any): void {
    try {
      const draftKey = `${this.PREFIX}${formId}`;
      const draftData = {
        data,
        timestamp: Date.now(),
        version: '1.0'
      };
      localStorage.setItem(draftKey, JSON.stringify(draftData));
    } catch (error) {
      console.warn('Failed to save draft:', error);
    }
  }

  static loadDraft(formId: string): any | null {
    try {
      const draftKey = `${this.PREFIX}${formId}`;
      const draftStr = localStorage.getItem(draftKey);
      if (!draftStr) return null;

      const draft = JSON.parse(draftStr);
      
      // Check if draft is not older than 24 hours
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      if (Date.now() - draft.timestamp > maxAge) {
        this.clearDraft(formId);
        return null;
      }

      return draft.data;
    } catch (error) {
      console.warn('Failed to load draft:', error);
      return null;
    }
  }

  static clearDraft(formId: string): void {
    try {
      const draftKey = `${this.PREFIX}${formId}`;
      localStorage.removeItem(draftKey);
    } catch (error) {
      console.warn('Failed to clear draft:', error);
    }
  }

  static hasDraft(formId: string): boolean {
    return this.loadDraft(formId) !== null;
  }
}

// Progress tracking for multi-step forms
export function calculateFormProgress(values: Record<string, any>, requiredFields: string[]): number {
  if (requiredFields.length === 0) return 0;
  
  const completedFields = requiredFields.filter(field => {
    const value = values[field];
    return value !== undefined && value !== null && value !== '';
  });
  
  return Math.round((completedFields.length / requiredFields.length) * 100);
}

// Accessibility helpers
export function announceToScreenReader(message: string): void {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', 'polite');
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

// Simple Levenshtein distance for typo detection
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

import * as React from 'react';