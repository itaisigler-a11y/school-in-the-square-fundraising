import { insertDonorSchema } from "@shared/schema";
import { z } from "zod";

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  cleanedData: Record<string, any>;
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

export interface DryRunSummary {
  totalRows: number;
  validRows: number;
  errorRows: number;
  warningRows: number;
  duplicateRows: number;
  newRecords: number;
  updateRecords: number;
}

export interface DryRunRowResult {
  rowIndex: number;
  originalData: Record<string, any>;
  mappedData: Record<string, any>;
  errors: string[];
  warnings: string[];
  duplicates: Array<{
    donor: any;
    matchScore: number;
    matchReasons: string[];
    confidence: 'high' | 'medium' | 'low';
  }>;
  action: 'create' | 'update' | 'skip' | 'manual_review';
}

export class ImportDataValidator {
  private donorSchema: z.ZodSchema;

  constructor() {
    this.donorSchema = insertDonorSchema;
  }

  /**
   * Validate a single donor record
   */
  validateDonorRecord(data: Record<string, any>): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let cleanedData = this.cleanDonorData(data);

    // Schema validation
    try {
      cleanedData = this.donorSchema.parse(cleanedData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach(err => {
          errors.push({
            field: err.path.join('.'),
            message: err.message,
            severity: 'error',
            code: err.code
          });
        });
      }
    }

    // Custom business rules validation
    this.validateBusinessRules(cleanedData, errors, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      cleanedData
    };
  }

  /**
   * Clean and transform donor data
   */
  private cleanDonorData(data: Record<string, any>): Record<string, any> {
    const cleaned: Record<string, any> = {};

    // Clean string fields
    const stringFields = ['firstName', 'lastName', 'email', 'phone', 'address', 'city', 'state', 'zipCode', 'studentName', 'gradeLevel', 'notes'];
    stringFields.forEach(field => {
      if (data[field]) {
        cleaned[field] = this.cleanString(data[field]);
      }
    });

    // Clean email
    if (cleaned.email) {
      cleaned.email = cleaned.email.toLowerCase().trim();
    }

    // Clean phone
    if (cleaned.phone) {
      cleaned.phone = this.cleanPhone(cleaned.phone);
    }

    // Clean numeric fields
    ['alumniYear', 'graduationYear'].forEach(field => {
      if (data[field]) {
        const num = this.parseInteger(data[field]);
        if (num !== null) {
          cleaned[field] = num;
        }
      }
    });

    // Clean boolean fields
    ['emailOptIn', 'phoneOptIn', 'mailOptIn'].forEach(field => {
      if (data[field] !== undefined) {
        cleaned[field] = this.parseBoolean(data[field]);
      }
    });

    // Set defaults
    cleaned.country = cleaned.country || 'USA';
    cleaned.donorType = cleaned.donorType || 'community';
    cleaned.engagementLevel = 'new';
    cleaned.giftSizeTier = 'grassroots';
    cleaned.preferredContactMethod = cleaned.preferredContactMethod || 'email';
    cleaned.isActive = true;

    // Set communication preferences defaults
    if (cleaned.emailOptIn === undefined) cleaned.emailOptIn = true;
    if (cleaned.phoneOptIn === undefined) cleaned.phoneOptIn = false;
    if (cleaned.mailOptIn === undefined) cleaned.mailOptIn = true;

    return cleaned;
  }

  /**
   * Apply custom business rules validation
   */
  private validateBusinessRules(data: Record<string, any>, errors: ValidationError[], warnings: ValidationWarning[]) {
    // Required fields check
    if (!data.firstName || !data.firstName.trim()) {
      errors.push({
        field: 'firstName',
        message: 'First name is required',
        severity: 'error',
        code: 'required'
      });
    }

    if (!data.lastName || !data.lastName.trim()) {
      errors.push({
        field: 'lastName',
        message: 'Last name is required',
        severity: 'error',
        code: 'required'
      });
    }

    // Email validation
    if (data.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        errors.push({
          field: 'email',
          message: 'Invalid email format',
          severity: 'error',
          code: 'invalid_format'
        });
      }
    } else {
      warnings.push({
        field: 'email',
        message: 'Email address not provided',
        suggestion: 'Consider collecting email addresses for better communication'
      });
    }

    // Phone validation
    if (data.phone) {
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      if (!phoneRegex.test(data.phone.replace(/[\s\-\(\)]/g, ''))) {
        errors.push({
          field: 'phone',
          message: 'Invalid phone number format',
          severity: 'error',
          code: 'invalid_format'
        });
      }
    }

    // Alumni year validation
    if (data.alumniYear) {
      const currentYear = new Date().getFullYear();
      if (data.alumniYear < 1900 || data.alumniYear > currentYear + 10) {
        errors.push({
          field: 'alumniYear',
          message: `Alumni year must be between 1900 and ${currentYear + 10}`,
          severity: 'error',
          code: 'invalid_range'
        });
      }
    }

    // ZIP code validation
    if (data.zipCode) {
      const zipRegex = /^\d{5}(-\d{4})?$/;
      if (!zipRegex.test(data.zipCode)) {
        warnings.push({
          field: 'zipCode',
          message: 'ZIP code format may be invalid',
          suggestion: 'Use 5-digit or 9-digit ZIP code format (e.g., 12345 or 12345-6789)'
        });
      }
    }

    // Donor type validation
    const validDonorTypes = ['parent', 'alumni', 'community', 'staff', 'board', 'foundation', 'business'];
    if (data.donorType && !validDonorTypes.includes(data.donorType)) {
      warnings.push({
        field: 'donorType',
        message: `Unknown donor type: ${data.donorType}`,
        suggestion: `Valid types: ${validDonorTypes.join(', ')}`
      });
      data.donorType = 'community'; // Default fallback
    }

    // Logical validations
    if (data.donorType === 'alumni' && !data.alumniYear) {
      warnings.push({
        field: 'alumniYear',
        message: 'Alumni donors should have an alumni year specified',
        suggestion: 'Add graduation year for better donor classification'
      });
    }

    if (data.donorType === 'parent' && !data.studentName) {
      warnings.push({
        field: 'studentName',
        message: 'Parent donors should have student name specified',
        suggestion: 'Add student name to link parent to current student'
      });
    }
  }

  // Helper methods
  private cleanString(value: any): string {
    return value ? value.toString().trim() : '';
  }

  private cleanPhone(phone: string): string {
    // Remove all non-digits, then format consistently
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    } else if (digits.length === 11 && digits[0] === '1') {
      return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    }
    return digits; // Return cleaned digits if format unknown
  }

  private parseInteger(value: any): number | null {
    const num = parseInt(value);
    return isNaN(num) ? null : num;
  }

  private parseBoolean(value: any): boolean {
    if (typeof value === 'boolean') return value;
    const str = value.toString().toLowerCase().trim();
    return ['true', 'yes', '1', 'y', 'on', 'checked'].includes(str);
  }
}

export const importValidator = new ImportDataValidator();