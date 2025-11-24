/**
 * Person Node Creation Service
 * Creates person entities and their default category folders in the document graph
 */

import { ExtractedPerson } from './personExtractionService';
import { personDeduplicationService } from './personDeduplicationService';
import { DocumentGraphModel } from '../data/standalone-model-implementation';
import { StandaloneEntity, EntitySubtype } from '../data/standalone-model';

export interface PersonCreationResult {
  person: StandaloneEntity;
  categories: StandaloneEntity[];
  isNew: boolean; // true if person was created, false if existing person found
}

export interface DefaultCategory {
  label: string;
  subtype: string;
  description: string;
}

export class PersonNodeCreationService {
  private static instance: PersonNodeCreationService | null = null;

  // Default categories to create for each person
  private readonly DEFAULT_CATEGORIES: DefaultCategory[] = [
    {
      label: 'Identity',
      subtype: 'identity',
      description: 'Identity documents',
    },
    {
      label: 'Health',
      subtype: 'health',
      description: 'Health records and medical documents',
    },
    {
      label: 'Finance',
      subtype: 'financial',
      description: 'Financial documents and records',
    },
    {
      label: 'Education',
      subtype: 'education',
      description: 'Educational certificates and records',
    },
    {
      label: 'Insurance',
      subtype: 'insurance',
      description: 'Insurance policies and related documents',
    },
  ];

  private constructor() {}

  static getInstance(): PersonNodeCreationService {
    if (!PersonNodeCreationService.instance) {
      PersonNodeCreationService.instance = new PersonNodeCreationService();
    }
    return PersonNodeCreationService.instance;
  }

  /**
   * Create person nodes with default categories
   * Checks for existing people first (deduplication)
   */
  async createPersonNodes(
    people: ExtractedPerson[],
    model: DocumentGraphModel,
    userEmail: string = 'lifemap-builder'
  ): Promise<PersonCreationResult[]> {
    const results: PersonCreationResult[] = [];
    // Access entities directly from model data
    const allEntities = (model as any).data.entities || [];
    const existingPeople = allEntities.filter((e: any) => e.type === 'person');

    for (const extractedPerson of people) {
      // Check if person already exists
      const match = personDeduplicationService.findMatchingPerson(
        extractedPerson,
        existingPeople
      );

      if (match && match.similarity >= 0.8) {
        // Person already exists
        console.log(`Person already exists: ${extractedPerson.fullName} → ${match.entity.label}`);

        // Get existing categories for this person
        const existingCategories = allEntities.filter(
            (e: any) =>
              e.type === 'folder' &&
              e.parentIds &&
              e.parentIds.includes(match.entity.id)
          );

        results.push({
          person: match.entity,
          categories: existingCategories,
          isNew: false,
        });

        continue;
      }

      // Create new person entity
      const personEntity = model.addEntity({
        type: 'person',
        label: extractedPerson.fullName,
        description: `Detected from document: ${extractedPerson.source}`,
        level: 1,
        createdBy: userEmail,
        modifiedBy: userEmail,
        tags: ['person', 'family-member'],
        metadata: {
          detectedFrom: 'lifemap-builder',
          extractionSource: extractedPerson.source,
          extractionConfidence: extractedPerson.confidence,
          firstName: extractedPerson.firstName,
          lastName: extractedPerson.lastName,
          middleName: extractedPerson.middleName,
        },
        uiHints: {
          icon: 'user',
        },
      });

      console.log(`Created person: ${personEntity.label} (${personEntity.id})`);

      // Create default categories for this person
      const categories = await this.createDefaultCategories(
        personEntity,
        model,
        userEmail
      );

      results.push({
        person: personEntity,
        categories,
        isNew: true,
      });
    }

    return results;
  }

  /**
   * Create default category folders for a person
   */
  async createDefaultCategories(
    person: StandaloneEntity,
    model: DocumentGraphModel,
    userEmail: string = 'lifemap-builder'
  ): Promise<StandaloneEntity[]> {
    const categories: StandaloneEntity[] = [];

    for (const categoryDef of this.DEFAULT_CATEGORIES) {
      const categoryEntity = model.addEntity({
        type: 'folder',
        subtype: categoryDef.subtype as EntitySubtype,
        label: categoryDef.label,
        description: `${person.label}'s ${categoryDef.description.toLowerCase()}`,
        level: 2,
        parentIds: [person.id],
        ownership: 'individual',
        createdBy: userEmail,
        modifiedBy: userEmail,
        metadata: {
          personId: person.id,
          personName: person.label,
          categoryType: categoryDef.subtype,
        },
        uiHints: {
          icon: this.getCategoryIcon(categoryDef.subtype),
        },
      });

      categories.push(categoryEntity);

      console.log(`  Created category: ${categoryEntity.label} (${categoryEntity.id})`);
    }

    return categories;
  }

  /**
   * Get icon name for category
   */
  private getCategoryIcon(subtype: string): string {
    const iconMap: Record<string, string> = {
      identity: 'id-card',
      health: 'heart',
      financial: 'dollar-sign',
      education: 'graduation-cap',
      insurance: 'shield',
    };

    return iconMap[subtype] || 'folder';
  }

  /**
   * Get default categories definition
   */
  getDefaultCategories(): DefaultCategory[] {
    return [...this.DEFAULT_CATEGORIES];
  }

  /**
   * Add a custom category definition
   */
  addCategoryDefinition(category: DefaultCategory): void {
    const exists = this.DEFAULT_CATEGORIES.some((c) => c.subtype === category.subtype);

    if (!exists) {
      this.DEFAULT_CATEGORIES.push(category);
    }
  }

  /**
   * Find or create a category for a person
   * Useful when placing documents
   */
  async findOrCreateCategory(
    person: StandaloneEntity,
    categorySubtype: string,
    model: DocumentGraphModel,
    userEmail: string = 'lifemap-builder'
  ): Promise<StandaloneEntity | null> {
    // Find existing category
    const allEntities = (model as any).data.entities || [];
    const existingCategory = allEntities.find(
      (e: any) =>
        e.type === 'folder' &&
        e.subtype === categorySubtype &&
        e.parentIds &&
        e.parentIds.includes(person.id)
    );

    if (existingCategory) {
      return existingCategory;
    }

    // Find category definition
    const categoryDef = this.DEFAULT_CATEGORIES.find((c) => c.subtype === categorySubtype);

    if (!categoryDef) {
      console.warn(`Unknown category subtype: ${categorySubtype}`);
      return null;
    }

    // Create new category
    const categoryEntity = model.addEntity({
      type: 'folder',
      subtype: categoryDef.subtype as EntitySubtype,
      label: categoryDef.label,
      description: `${person.label}'s ${categoryDef.description.toLowerCase()}`,
      level: 2,
      parentIds: [person.id],
      ownership: 'individual',
      createdBy: userEmail,
      modifiedBy: userEmail,
      metadata: {
        personId: person.id,
        personName: person.label,
        categoryType: categoryDef.subtype,
      },
      uiHints: {
        icon: this.getCategoryIcon(categoryDef.subtype),
      },
    });

    console.log(`Created missing category: ${categoryEntity.label} for ${person.label}`);

    return categoryEntity;
  }
}

// Export singleton instance
export const personNodeCreationService = PersonNodeCreationService.getInstance();
