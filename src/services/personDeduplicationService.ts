/**
 * Person Deduplication Service
 * Handles fuzzy matching and deduplication of person names
 */

import { ExtractedPerson } from './personExtractionService';
import { StandaloneEntity } from '../data/standalone-model';

export interface PersonMatch {
  entity: StandaloneEntity;
  similarity: number;  // 0-1 (1 = exact match)
  confidence: number;  // 0-100
  matchType: 'exact' | 'first-last' | 'initial-last' | 'fuzzy';
}

export class PersonDeduplicationService {
  private static instance: PersonDeduplicationService | null = null;

  private constructor() {}

  static getInstance(): PersonDeduplicationService {
    if (!PersonDeduplicationService.instance) {
      PersonDeduplicationService.instance = new PersonDeduplicationService();
    }
    return PersonDeduplicationService.instance;
  }

  /**
   * Deduplicate a list of extracted people
   * Returns unique people with highest confidence for each
   */
  deduplicate(people: ExtractedPerson[]): ExtractedPerson[] {
    if (people.length === 0) return [];
    if (people.length === 1) return people;

    const groups: Map<string, ExtractedPerson[]> = new Map();

    // Group similar people together
    for (const person of people) {
      let foundGroup = false;

      for (const [key, group] of Array.from(groups.entries())) {
        const representative = group[0];
        const similarity = this.similarity(person.fullName, representative.fullName);

        if (similarity >= 0.8) {
          // Same person, add to group
          group.push(person);
          foundGroup = true;
          break;
        }
      }

      if (!foundGroup) {
        // Create new group
        groups.set(person.fullName, [person]);
      }
    }

    // For each group, select the best representative
    const unique: ExtractedPerson[] = [];

    for (const group of Array.from(groups.values())) {
      // Sort by confidence (descending) and fullName completeness
      group.sort((a: ExtractedPerson, b: ExtractedPerson) => {
        // Prefer higher confidence
        if (a.confidence !== b.confidence) {
          return b.confidence - a.confidence;
        }

        // Prefer more complete names (with middle names)
        const aHasMiddle = !!a.middleName;
        const bHasMiddle = !!b.middleName;

        if (aHasMiddle && !bHasMiddle) return -1;
        if (!aHasMiddle && bHasMiddle) return 1;

        // Prefer longer names (more information)
        return b.fullName.length - a.fullName.length;
      });

      unique.push(group[0]);
    }

    return unique;
  }

  /**
   * Find matching person entity in existing data
   * Returns null if no match found
   */
  findMatchingPerson(
    candidate: ExtractedPerson,
    existingPeople: StandaloneEntity[]
  ): PersonMatch | null {
    let bestMatch: PersonMatch | null = null;

    for (const entity of existingPeople) {
      if (entity.type !== 'person') continue;

      const match = this.matchPerson(candidate, entity);

      if (match && (!bestMatch || match.similarity > bestMatch.similarity)) {
        bestMatch = match;
      }
    }

    // Only return matches with similarity >= 0.8 (80%)
    if (bestMatch && bestMatch.similarity >= 0.8) {
      return bestMatch;
    }

    return null;
  }

  /**
   * Calculate similarity between two names
   * Returns 0-1 (1 = exact match)
   */
  similarity(name1: string, name2: string): number {
    if (!name1 || !name2) return 0;

    // Normalize names
    const n1 = this.normalizeForComparison(name1);
    const n2 = this.normalizeForComparison(name2);

    // Exact match
    if (n1 === n2) return 1.0;

    // Check if one name is a subset of the other
    // E.g., "Brett" matches "Brett Thebault"
    if (n1.includes(n2) || n2.includes(n1)) {
      return 0.85;
    }

    // Levenshtein distance
    const distance = this.levenshteinDistance(n1, n2);
    const maxLength = Math.max(n1.length, n2.length);

    if (maxLength === 0) return 1.0;

    // Convert distance to similarity score (0-1)
    const similarity = 1 - distance / maxLength;

    return Math.max(0, similarity);
  }

  /**
   * Match candidate against existing entity
   */
  private matchPerson(
    candidate: ExtractedPerson,
    entity: StandaloneEntity
  ): PersonMatch | null {
    const entityName = entity.label;

    // Strategy 1: Exact match (case-insensitive)
    if (this.normalizeForComparison(candidate.fullName) === this.normalizeForComparison(entityName)) {
      return {
        entity,
        similarity: 1.0,
        confidence: 100,
        matchType: 'exact',
      };
    }

    // Strategy 2: First + Last name match
    const candidateFirstLast = `${candidate.firstName} ${candidate.lastName}`.toLowerCase();
    const entityLower = entityName.toLowerCase();

    if (candidateFirstLast === entityLower || entityLower.includes(candidateFirstLast)) {
      return {
        entity,
        similarity: 0.95,
        confidence: 95,
        matchType: 'first-last',
      };
    }

    // Strategy 3: Initial + Last name match
    // E.g., "B. Thebault" matches "Brett Thebault"
    if (candidate.firstName.length > 0 && candidate.lastName) {
      const initial = candidate.firstName[0].toUpperCase();
      const initialLastPattern = new RegExp(`^${initial}\\.?\\s+${candidate.lastName}$`, 'i');

      if (initialLastPattern.test(entityName)) {
        return {
          entity,
          similarity: 0.90,
          confidence: 90,
          matchType: 'initial-last',
        };
      }

      // Reverse: check if entity uses initials
      const entityInitialLastPattern = new RegExp(`^([A-Z])\\.?\\s+${candidate.lastName}$`, 'i');
      const match = entityName.match(entityInitialLastPattern);

      if (match && match[1] === initial) {
        return {
          entity,
          similarity: 0.90,
          confidence: 90,
          matchType: 'initial-last',
        };
      }
    }

    // Strategy 4: Fuzzy match (Levenshtein distance)
    const sim = this.similarity(candidate.fullName, entityName);

    if (sim >= 0.8) {
      return {
        entity,
        similarity: sim,
        confidence: Math.round(sim * 100),
        matchType: 'fuzzy',
      };
    }

    return null;
  }

  /**
   * Normalize name for comparison
   * - Lowercase
   * - Remove diacritics
   * - Remove extra whitespace
   * - Remove punctuation
   */
  private normalizeForComparison(name: string): string {
    if (!name) return '';

    return name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Calculate Levenshtein distance between two strings
   * (Number of single-character edits required to change one string into the other)
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;

    // Create a 2D array to store distances
    const matrix: number[][] = [];

    // Initialize first column
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }

    // Initialize first row
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    // Fill in the rest of the matrix
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;

        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,      // deletion
          matrix[i][j - 1] + 1,      // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }

    return matrix[len1][len2];
  }

  /**
   * Merge duplicate person data
   * Returns the best version of person data from duplicates
   */
  mergeDuplicates(people: ExtractedPerson[]): ExtractedPerson {
    if (people.length === 1) return people[0];

    // Sort by confidence and completeness
    const sorted = [...people].sort((a, b) => {
      if (a.confidence !== b.confidence) {
        return b.confidence - a.confidence;
      }

      const aComplete = (a.middleName ? 1 : 0) + (a.fullName.length > 20 ? 1 : 0);
      const bComplete = (b.middleName ? 1 : 0) + (b.fullName.length > 20 ? 1 : 0);

      return bComplete - aComplete;
    });

    const best = sorted[0];

    // Combine document file names
    const allFiles = people
      .filter((p) => p.documentFileName)
      .map((p) => p.documentFileName)
      .filter((f, i, arr) => arr.indexOf(f) === i); // unique

    return {
      ...best,
      documentFileName: allFiles.join(', '),
      source: `merged from ${people.length} sources`,
    };
  }
}

// Export singleton instance
export const personDeduplicationService = PersonDeduplicationService.getInstance();
