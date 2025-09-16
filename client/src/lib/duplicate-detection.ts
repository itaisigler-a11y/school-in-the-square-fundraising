import { Donor } from '@shared/schema';

export interface DuplicateMatch {
  donor: Donor;
  matchScore: number;
  matchReasons: string[];
  matchStrategy: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface DuplicateDetectionOptions {
  strategies: DuplicateStrategy[];
  thresholds: {
    high: number;    // 0.9+
    medium: number;  // 0.7-0.89
    low: number;     // 0.5-0.69
  };
  requireExactEmail?: boolean;
  requireExactPhone?: boolean;
}

export type DuplicateStrategy = 
  | 'exact_email'
  | 'exact_phone'
  | 'name_address'
  | 'name_phone'
  | 'fuzzy_name'
  | 'student_name'
  | 'school_connection';

export interface DonorRecord {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  studentName?: string;
  alumniYear?: number;
  donorType?: string;
}

export class DuplicateDetectionEngine {
  private options: DuplicateDetectionOptions;

  constructor(options: Partial<DuplicateDetectionOptions> = {}) {
    this.options = {
      strategies: ['exact_email', 'exact_phone', 'name_address', 'name_phone', 'fuzzy_name'],
      thresholds: {
        high: 0.9,
        medium: 0.7,
        low: 0.5
      },
      ...options
    };
  }

  /**
   * Find potential duplicate donors for a given record
   */
  findDuplicates(candidate: DonorRecord, existingDonors: Donor[]): DuplicateMatch[] {
    const matches: DuplicateMatch[] = [];

    for (const donor of existingDonors) {
      const match = this.calculateMatch(candidate, donor);
      if (match.matchScore >= this.options.thresholds.low) {
        matches.push(match);
      }
    }

    // Sort by match score (highest first)
    return matches.sort((a, b) => b.matchScore - a.matchScore);
  }

  /**
   * Calculate match score between candidate and existing donor
   */
  private calculateMatch(candidate: DonorRecord, donor: Donor): DuplicateMatch {
    let totalScore = 0;
    let totalWeight = 0;
    const matchReasons: string[] = [];
    const strategiesUsed: string[] = [];

    for (const strategy of this.options.strategies) {
      const result = this.applyStrategy(strategy, candidate, donor);
      if (result.score > 0) {
        totalScore += result.score * result.weight;
        totalWeight += result.weight;
        matchReasons.push(...result.reasons);
        strategiesUsed.push(strategy);
      }
    }

    const finalScore = totalWeight > 0 ? totalScore / totalWeight : 0;
    const confidence = this.getConfidenceLevel(finalScore);

    return {
      donor,
      matchScore: finalScore,
      matchReasons,
      matchStrategy: strategiesUsed.join(', '),
      confidence
    };
  }

  /**
   * Apply specific matching strategy
   */
  private applyStrategy(strategy: DuplicateStrategy, candidate: DonorRecord, donor: Donor): {
    score: number;
    weight: number;
    reasons: string[];
  } {
    switch (strategy) {
      case 'exact_email':
        return this.exactEmailMatch(candidate, donor);
      case 'exact_phone':
        return this.exactPhoneMatch(candidate, donor);
      case 'name_address':
        return this.nameAddressMatch(candidate, donor);
      case 'name_phone':
        return this.namePhoneMatch(candidate, donor);
      case 'fuzzy_name':
        return this.fuzzyNameMatch(candidate, donor);
      case 'student_name':
        return this.studentNameMatch(candidate, donor);
      case 'school_connection':
        return this.schoolConnectionMatch(candidate, donor);
      default:
        return { score: 0, weight: 0, reasons: [] };
    }
  }

  private exactEmailMatch(candidate: DonorRecord, donor: Donor) {
    if (!candidate.email || !donor.email) {
      return { score: 0, weight: 0, reasons: [] };
    }

    const match = this.normalizeEmail(candidate.email) === this.normalizeEmail(donor.email);
    return {
      score: match ? 1.0 : 0,
      weight: 3, // High weight for exact email match
      reasons: match ? ['Exact email match'] : []
    };
  }

  private exactPhoneMatch(candidate: DonorRecord, donor: Donor) {
    if (!candidate.phone || !donor.phone) {
      return { score: 0, weight: 0, reasons: [] };
    }

    const match = this.normalizePhone(candidate.phone) === this.normalizePhone(donor.phone);
    return {
      score: match ? 1.0 : 0,
      weight: 2.5, // High weight for exact phone match
      reasons: match ? ['Exact phone match'] : []
    };
  }

  private nameAddressMatch(candidate: DonorRecord, donor: Donor) {
    const nameScore = this.calculateNameSimilarity(candidate, donor);
    const addressScore = this.calculateAddressSimilarity(candidate, donor);

    if (nameScore < 0.8 || addressScore < 0.7) {
      return { score: 0, weight: 0, reasons: [] };
    }

    const combinedScore = (nameScore * 0.6) + (addressScore * 0.4);
    const reasons = [];
    
    if (nameScore > 0.9) reasons.push('Very similar name');
    if (addressScore > 0.9) reasons.push('Very similar address');

    return {
      score: combinedScore,
      weight: 2,
      reasons
    };
  }

  private namePhoneMatch(candidate: DonorRecord, donor: Donor) {
    if (!candidate.phone || !donor.phone) {
      return { score: 0, weight: 0, reasons: [] };
    }

    const nameScore = this.calculateNameSimilarity(candidate, donor);
    const phoneScore = this.normalizePhone(candidate.phone) === this.normalizePhone(donor.phone) ? 1.0 : 0;

    if (nameScore < 0.7 || phoneScore < 1.0) {
      return { score: 0, weight: 0, reasons: [] };
    }

    const combinedScore = (nameScore * 0.5) + (phoneScore * 0.5);
    return {
      score: combinedScore,
      weight: 2.2,
      reasons: ['Similar name with exact phone match']
    };
  }

  private fuzzyNameMatch(candidate: DonorRecord, donor: Donor) {
    const similarity = this.calculateNameSimilarity(candidate, donor);
    
    if (similarity < 0.8) {
      return { score: 0, weight: 0, reasons: [] };
    }

    const reasons = [];
    if (similarity > 0.95) reasons.push('Very similar full name');
    else if (similarity > 0.9) reasons.push('Similar full name');
    
    return {
      score: similarity,
      weight: 1.5,
      reasons
    };
  }

  private studentNameMatch(candidate: DonorRecord, donor: Donor) {
    if (!candidate.studentName || !donor.studentName) {
      return { score: 0, weight: 0, reasons: [] };
    }

    const similarity = this.calculateStringSimilarity(
      candidate.studentName.toLowerCase(),
      donor.studentName.toLowerCase()
    );

    if (similarity < 0.9) {
      return { score: 0, weight: 0, reasons: [] };
    }

    return {
      score: similarity,
      weight: 2,
      reasons: ['Same student name']
    };
  }

  private schoolConnectionMatch(candidate: DonorRecord, donor: Donor) {
    let score = 0;
    let matches = 0;
    const reasons: string[] = [];

    // Alumni year match
    if (candidate.alumniYear && donor.alumniYear && candidate.alumniYear === donor.alumniYear) {
      score += 0.8;
      matches++;
      reasons.push(`Same alumni year (${candidate.alumniYear})`);
    }

    // Donor type match
    if (candidate.donorType && donor.donorType && candidate.donorType === donor.donorType) {
      score += 0.6;
      matches++;
      reasons.push(`Same donor type (${candidate.donorType})`);
    }

    if (matches === 0) {
      return { score: 0, weight: 0, reasons: [] };
    }

    return {
      score: score / matches,
      weight: 1.5,
      reasons
    };
  }

  /**
   * Calculate name similarity using multiple factors
   */
  private calculateNameSimilarity(candidate: DonorRecord, donor: Donor): number {
    const firstNameSim = this.calculateStringSimilarity(
      candidate.firstName?.toLowerCase() || '',
      donor.firstName?.toLowerCase() || ''
    );
    
    const lastNameSim = this.calculateStringSimilarity(
      candidate.lastName?.toLowerCase() || '',
      donor.lastName?.toLowerCase() || ''
    );

    // Give more weight to last name as it's typically more unique
    return (firstNameSim * 0.4) + (lastNameSim * 0.6);
  }

  /**
   * Calculate address similarity
   */
  private calculateAddressSimilarity(candidate: DonorRecord, donor: Donor): number {
    let score = 0;
    let components = 0;

    // Address similarity
    if (candidate.address && donor.address) {
      score += this.calculateStringSimilarity(
        candidate.address.toLowerCase(),
        donor.address.toLowerCase()
      ) * 0.4;
      components += 0.4;
    }

    // City match
    if (candidate.city && donor.city) {
      score += (candidate.city.toLowerCase() === donor.city.toLowerCase() ? 1 : 0) * 0.3;
      components += 0.3;
    }

    // ZIP match  
    if (candidate.zipCode && donor.zipCode) {
      score += (candidate.zipCode === donor.zipCode ? 1 : 0) * 0.3;
      components += 0.3;
    }

    return components > 0 ? score / components : 0;
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1.0;
    if (!str1 || !str2) return 0;

    const maxLength = Math.max(str1.length, str2.length);
    if (maxLength === 0) return 1.0;

    const distance = this.levenshteinDistance(str1, str2);
    return 1 - (distance / maxLength);
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + indicator  // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Normalize email address for comparison
   */
  private normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }

  /**
   * Normalize phone number for comparison
   */
  private normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '');
  }

  /**
   * Get confidence level based on match score
   */
  private getConfidenceLevel(score: number): 'high' | 'medium' | 'low' {
    if (score >= this.options.thresholds.high) return 'high';
    if (score >= this.options.thresholds.medium) return 'medium';
    return 'low';
  }
}

// Export default instance with standard configuration
export const duplicateDetector = new DuplicateDetectionEngine();

// Utility functions for use in components
export function formatMatchReasons(reasons: string[]): string {
  if (reasons.length === 0) return 'No specific matches found';
  if (reasons.length === 1) return reasons[0];
  if (reasons.length === 2) return reasons.join(' and ');
  return reasons.slice(0, -1).join(', ') + ', and ' + reasons[reasons.length - 1];
}

export function getConfidenceColor(confidence: 'high' | 'medium' | 'low'): string {
  switch (confidence) {
    case 'high': return 'text-red-600 bg-red-50';
    case 'medium': return 'text-yellow-600 bg-yellow-50';
    case 'low': return 'text-blue-600 bg-blue-50';
  }
}

export function getConfidenceDescription(confidence: 'high' | 'medium' | 'low'): string {
  switch (confidence) {
    case 'high': return 'Very likely duplicate - manual review recommended';
    case 'medium': return 'Possible duplicate - review suggested';
    case 'low': return 'Weak match - may not be duplicate';
  }
}