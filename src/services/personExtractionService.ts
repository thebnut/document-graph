/**
 * Person Extraction Service
 * Extracts person names from document analysis results and filters by family name
 */

import { DocumentAnalysis } from './documentAnalysisService';

export interface ExtractedPerson {
  fullName: string;           // "Brett Thebault"
  firstName: string;          // "Brett"
  lastName: string;           // "Thebault"
  middleName?: string;        // "Michael" (if present)
  confidence: number;         // 0-100
  source: string;             // "passport holder" | "insurance policy holder" | "document owner"
  documentFileName?: string;  // Reference to source document
}

export interface NormalizedName {
  first: string;
  middle?: string;
  last: string;
}

export class PersonExtractionService {
  private static instance: PersonExtractionService | null = null;

  private constructor() {}

  static getInstance(): PersonExtractionService {
    if (!PersonExtractionService.instance) {
      PersonExtractionService.instance = new PersonExtractionService();
    }
    return PersonExtractionService.instance;
  }

  /**
   * Extract people from document analysis, filtered by family name
   */
  extractPeople(
    analysis: DocumentAnalysis,
    familyName: string,
    fileName?: string
  ): ExtractedPerson[] {
    const people: ExtractedPerson[] = [];

    // Strategy 1: Check explicit personNames array (from enhanced AI prompt)
    if (analysis.personNames && Array.isArray(analysis.personNames)) {
      for (const name of analysis.personNames) {
        if (this.matchesFamilyName(name, familyName)) {
          const normalized = this.normalizeName(name);
          if (normalized) {
            people.push({
              fullName: name.trim(),
              firstName: normalized.first,
              lastName: normalized.last,
              middleName: normalized.middle,
              confidence: analysis.confidence,
              source: 'AI extraction (personNames)',
              documentFileName: fileName,
            });
          }
        }
      }
    }

    // Strategy 2: Fallback - Extract from extractedData
    if (people.length === 0 && analysis.extractedData) {
      const extractedFromData = this.extractFromStructuredData(
        analysis.extractedData,
        familyName,
        analysis.confidence,
        fileName
      );
      people.push(...extractedFromData);
    }

    // Strategy 3: Fallback - Parse summary
    if (people.length === 0 && analysis.summary) {
      const extractedFromSummary = this.extractFromSummary(
        analysis.summary,
        familyName,
        analysis.confidence,
        fileName
      );
      people.push(...extractedFromSummary);
    }

    return people;
  }

  /**
   * Normalize name to structured format
   * Handles:
   * - "First Last"
   * - "First Middle Last"
   * - "Last, First"
   * - "Last, First Middle"
   * - "FIRST LAST" (uppercase)
   */
  normalizeName(name: string): NormalizedName | null {
    if (!name || typeof name !== 'string') return null;

    // Clean up the name
    let cleaned = name.trim();

    // Remove extra whitespace
    cleaned = cleaned.replace(/\s+/g, ' ');

    // Handle "LAST, FIRST" or "Last, First" format
    if (cleaned.includes(',')) {
      const parts = cleaned.split(',').map((p) => p.trim());
      if (parts.length === 2) {
        const [last, firstPart] = parts;
        const firstNames = firstPart.split(' ');

        if (firstNames.length === 1) {
          return {
            first: this.capitalize(firstNames[0]),
            last: this.capitalize(last),
          };
        } else {
          return {
            first: this.capitalize(firstNames[0]),
            middle: firstNames.slice(1).map(this.capitalize).join(' '),
            last: this.capitalize(last),
          };
        }
      }
    }

    // Handle "First Middle Last" or "First Last" format
    const parts = cleaned.split(' ');

    if (parts.length === 1) {
      // Single name - treat as first name
      return {
        first: this.capitalize(parts[0]),
        last: '',
      };
    } else if (parts.length === 2) {
      return {
        first: this.capitalize(parts[0]),
        last: this.capitalize(parts[1]),
      };
    } else {
      // 3+ parts: First Middle1 Middle2... Last
      return {
        first: this.capitalize(parts[0]),
        middle: parts.slice(1, -1).map(this.capitalize).join(' '),
        last: this.capitalize(parts[parts.length - 1]),
      };
    }
  }

  /**
   * Check if a name matches the given family name
   * Handles case-insensitive matching and diacritics
   */
  private matchesFamilyName(fullName: string, familyName: string): boolean {
    if (!fullName || !familyName) return false;

    const normalizedFullName = this.removeDiacritics(fullName.toLowerCase());
    const normalizedFamilyName = this.removeDiacritics(familyName.toLowerCase());

    // Check if family name appears in the full name
    return normalizedFullName.includes(normalizedFamilyName);
  }

  /**
   * Extract people from structured extractedData
   */
  private extractFromStructuredData(
    data: Record<string, any>,
    familyName: string,
    confidence: number,
    fileName?: string
  ): ExtractedPerson[] {
    const people: ExtractedPerson[] = [];

    // Common field names that might contain person names
    const nameFields = [
      'holder',
      'patient',
      'policyholder',
      'insured',
      'owner',
      'name',
      'fullName',
      'personName',
      'individualName',
    ];

    for (const field of nameFields) {
      const value = this.findFieldInObject(data, field);

      if (value) {
        let name: string | null = null;

        // Handle different value types
        if (typeof value === 'string') {
          name = value;
        } else if (typeof value === 'object' && value !== null) {
          // Handle nested objects like { name: "Brett Thebault", ... }
          if ('name' in value && typeof value.name === 'string') {
            name = value.name;
          } else if ('fullName' in value && typeof value.fullName === 'string') {
            name = value.fullName;
          }
        }

        if (name && this.matchesFamilyName(name, familyName)) {
          const normalized = this.normalizeName(name);
          if (normalized && normalized.last) {
            people.push({
              fullName: name.trim(),
              firstName: normalized.first,
              lastName: normalized.last,
              middleName: normalized.middle,
              confidence: Math.max(50, confidence - 10), // Lower confidence for extracted data
              source: `document field: ${field}`,
              documentFileName: fileName,
            });
          }
        }
      }
    }

    return people;
  }

  /**
   * Extract person from summary string
   * E.g., "The passport for Brett Thebault" → "Brett Thebault"
   */
  private extractFromSummary(
    summary: string,
    familyName: string,
    confidence: number,
    fileName?: string
  ): ExtractedPerson[] {
    const people: ExtractedPerson[] = [];

    // Pattern: "The [document type] for [Name]"
    const patterns = [
      /for\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/,      // "for Brett Thebault"
      /belonging to\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/, // "belonging to Brett Thebault"
      /of\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/,       // "of Brett Thebault"
    ];

    for (const pattern of patterns) {
      const match = summary.match(pattern);
      if (match && match[1]) {
        const name = match[1].trim();
        if (this.matchesFamilyName(name, familyName)) {
          const normalized = this.normalizeName(name);
          if (normalized && normalized.last) {
            people.push({
              fullName: name,
              firstName: normalized.first,
              lastName: normalized.last,
              middleName: normalized.middle,
              confidence: Math.max(40, confidence - 20), // Lower confidence for summary extraction
              source: 'document summary',
              documentFileName: fileName,
            });
            break; // Only take the first match
          }
        }
      }
    }

    return people;
  }

  /**
   * Find a field in an object (case-insensitive, recursive)
   */
  private findFieldInObject(obj: any, fieldName: string): any {
    if (!obj || typeof obj !== 'object') return null;

    const lowerFieldName = fieldName.toLowerCase();

    // Direct match
    for (const key of Object.keys(obj)) {
      if (key.toLowerCase() === lowerFieldName) {
        return obj[key];
      }
    }

    // Recursive search (limited depth)
    for (const key of Object.keys(obj)) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        const found = this.findFieldInObject(obj[key], fieldName);
        if (found) return found;
      }
    }

    return null;
  }

  /**
   * Capitalize first letter of each word
   */
  private capitalize(str: string): string {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  /**
   * Remove diacritical marks from string
   * E.g., "Thébault" → "Thebault"
   */
  private removeDiacritics(str: string): string {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }
}

// Export singleton instance
export const personExtractionService = PersonExtractionService.getInstance();
