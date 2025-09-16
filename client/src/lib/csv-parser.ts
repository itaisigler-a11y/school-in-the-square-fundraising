import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export interface ParsedData {
  headers: string[];
  data: Record<string, any>[];
  errors: string[];
}

export function parseCSVFile(file: File): Promise<ParsedData> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, any>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: Papa.ParseResult<Record<string, any>>) => {
        const errors: string[] = [];
        
        // Check for parsing errors
        if (results.errors.length > 0) {
          results.errors.forEach((error: Papa.ParseError) => {
            errors.push(`Row ${error.row}: ${error.message}`);
          });
        }
        
        // Validate headers
        const headers = Object.keys(results.data[0] || {});
        if (headers.length === 0) {
          errors.push('No valid headers found in CSV file');
        }
        
        resolve({
          headers,
          data: results.data as Record<string, any>[],
          errors,
        });
      },
      error: (error: Error) => {
        reject(new Error(`CSV parsing error: ${error.message}`));
      },
    });
  });
}

export function parseExcelFile(file: File): Promise<ParsedData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Use the first sheet
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          reject(new Error('No sheets found in Excel file'));
          return;
        }
        
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        
        if (jsonData.length === 0) {
          reject(new Error('Excel file appears to be empty'));
          return;
        }
        
        // Extract headers from first row
        const headers = jsonData[0] as string[];
        const dataRows = jsonData.slice(1);
        
        // Convert to object format
        const parsedData = dataRows.map((row: unknown) => {
          const rowArray = row as any[]; // Type assertion since XLSX returns arrays
          const obj: Record<string, any> = {};
          headers.forEach((header, index) => {
            obj[header] = rowArray[index] || '';
          });
          return obj;
        }).filter(row => {
          // Filter out completely empty rows
          return Object.values(row).some(value => value !== '');
        });
        
        resolve({
          headers: headers.filter(h => h && h.trim()),
          data: parsedData,
          errors: [],
        });
      } catch (error) {
        reject(new Error(`Excel parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read Excel file'));
    };
    
    reader.readAsArrayBuffer(file);
  });
}

export function validateDonorData(data: Record<string, any>): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Required fields
  if (!data.firstName || !data.firstName.trim()) {
    errors.push('First name is required');
  }
  
  if (!data.lastName || !data.lastName.trim()) {
    errors.push('Last name is required');
  }
  
  // Email validation (if provided)
  if (data.email && data.email.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      errors.push('Invalid email format');
    }
  }
  
  // Phone validation (if provided)
  if (data.phone && data.phone.trim()) {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (!phoneRegex.test(data.phone.replace(/[\s\-\(\)]/g, ''))) {
      errors.push('Invalid phone number format');
    }
  }
  
  // Alumni year validation (if provided)
  if (data.alumniYear && data.alumniYear.trim()) {
    const year = parseInt(data.alumniYear);
    const currentYear = new Date().getFullYear();
    if (isNaN(year) || year < 1900 || year > currentYear + 10) {
      errors.push('Invalid alumni year');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function cleanDonorData(data: Record<string, any>): Record<string, any> {
  const cleaned: Record<string, any> = {};
  
  // Clean string fields
  ['firstName', 'lastName', 'email', 'phone', 'address', 'city', 'state', 'zipCode', 'studentName', 'gradeLevel'].forEach(field => {
    if (data[field]) {
      cleaned[field] = data[field].toString().trim();
    }
  });
  
  // Clean numeric fields
  ['alumniYear', 'graduationYear'].forEach(field => {
    if (data[field]) {
      const num = parseInt(data[field]);
      if (!isNaN(num)) {
        cleaned[field] = num;
      }
    }
  });
  
  // Set default values
  cleaned.country = cleaned.country || 'USA';
  cleaned.donorType = cleaned.donorType || 'community';
  cleaned.engagementLevel = 'new';
  cleaned.giftSizeTier = 'grassroots';
  cleaned.emailOptIn = true;
  cleaned.phoneOptIn = false;
  cleaned.mailOptIn = true;
  cleaned.preferredContactMethod = 'email';
  cleaned.isActive = true;
  
  return cleaned;
}
