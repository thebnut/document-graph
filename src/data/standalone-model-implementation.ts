/**
 * Example implementation of the standalone document graph model
 * This demonstrates how the model can be used independently of any UI framework
 */

import {
  StandaloneDocumentGraph,
  StandaloneEntity,
  SearchIndex,
  Query,
  QueryResult,
  ValidationResult,
  ChangeLogEntry
} from './standalone-model';

export class DocumentGraphModel {
  private data: StandaloneDocumentGraph;
  private searchIndex: SearchIndex;

  constructor(data?: StandaloneDocumentGraph) {
    this.data = data || this.createEmptyGraph();
    this.searchIndex = this.buildSearchIndex();
  }

  /**
   * Create an empty graph with default structure
   */
  private createEmptyGraph(): StandaloneDocumentGraph {
    const now = new Date().toISOString();
    return {
      id: this.generateId(),
      version: '1.0.0',
      schema: 'https://familygraph.com/schemas/v1/document-graph.json',
      metadata: {
        title: 'New Document Graph',
        created: now,
        modified: now,
        createdBy: 'system',
        modifiedBy: 'system',
        tenant: '',
        familyName: undefined, // Will be set during onboarding
        locale: 'en-US'
      },
      entities: [],
      relationships: [],
      permissions: {
        owners: [],
        editors: [],
        viewers: [],
        publicRead: false
      },
      changeLog: []
    };
  }

  /**
   * Build search index from current data
   */
  private buildSearchIndex(): SearchIndex {
    const index: SearchIndex = {
      byId: new Map(),
      byLabel: new Map(),
      byType: new Map(),
      byCategory: new Map(),
      byTag: new Map(),
      fullText: [],
      byParent: new Map(),
      byLevel: new Map(),
      byExpiry: new Map(),
      byModified: new Map()
    };

    // Index all entities
    this.data.entities.forEach(entity => {
      // By ID
      index.byId.set(entity.id, entity);

      // By label (case-insensitive)
      const labelKey = entity.label.toLowerCase();
      if (!index.byLabel.has(labelKey)) {
        index.byLabel.set(labelKey, new Set());
      }
      index.byLabel.get(labelKey)!.add(entity.id);

      // By type
      if (!index.byType.has(entity.type)) {
        index.byType.set(entity.type, new Set());
      }
      index.byType.get(entity.type)!.add(entity.id);

      // By category
      if (entity.category) {
        if (!index.byCategory.has(entity.category)) {
          index.byCategory.set(entity.category, new Set());
        }
        index.byCategory.get(entity.category)!.add(entity.id);
      }

      // By tags
      entity.tags?.forEach(tag => {
        const tagKey = tag.toLowerCase();
        if (!index.byTag.has(tagKey)) {
          index.byTag.set(tagKey, new Set());
        }
        index.byTag.get(tagKey)!.add(entity.id);
      });

      // By parent
      entity.parentIds?.forEach(parentId => {
        if (!index.byParent.has(parentId)) {
          index.byParent.set(parentId, new Set());
        }
        index.byParent.get(parentId)!.add(entity.id);
      });

      // By level
      if (!index.byLevel.has(entity.level)) {
        index.byLevel.set(entity.level, new Set());
      }
      index.byLevel.get(entity.level)!.add(entity.id);

      // By expiry (if exists)
      if (entity.expiry) {
        const expiryMonth = entity.expiry.substring(0, 7); // YYYY-MM
        if (!index.byExpiry.has(expiryMonth)) {
          index.byExpiry.set(expiryMonth, new Set());
        }
        index.byExpiry.get(expiryMonth)!.add(entity.id);
      }

      // Full-text search
      const searchableText = [
        entity.label,
        entity.description,
        entity.tags?.join(' '),
        entity.keywords?.join(' '),
        entity.searchableText
      ].filter(Boolean).join(' ').toLowerCase();

      index.fullText.push({
        entityId: entity.id,
        text: searchableText,
        fields: ['label', 'description', 'tags'],
        weight: entity.level === 1 ? 2.0 : 1.0 // Higher weight for top-level entities
      });
    });

    // Store in main data structure
    this.data.searchIndex = index;
    return index;
  }

  /**
   * Add a new entity
   */
  addEntity(entity: Omit<StandaloneEntity, 'id' | 'created' | 'modified'>): StandaloneEntity {
    const now = new Date().toISOString();
    const newEntity: StandaloneEntity = {
      ...entity,
      id: this.generateId(),
      created: now,
      modified: now,
      createdBy: entity.createdBy || 'system',
      modifiedBy: entity.modifiedBy || 'system'
    };

    this.data.entities.push(newEntity);
    this.addToChangeLog('create', 'entity', newEntity.id, newEntity.label);
    
    // Update search index
    this.rebuildSearchIndex();
    
    return newEntity;
  }

  /**
   * Update an entity
   */
  updateEntity(id: string, updates: Partial<StandaloneEntity>): StandaloneEntity | null {
    const entityIndex = this.data.entities.findIndex(e => e.id === id);
    if (entityIndex === -1) return null;

    const oldEntity = this.data.entities[entityIndex];
    const changes = this.detectChanges(oldEntity, updates);
    
    const updatedEntity: StandaloneEntity = {
      ...oldEntity,
      ...updates,
      id: oldEntity.id, // Preserve ID
      created: oldEntity.created, // Preserve creation date
      modified: new Date().toISOString(),
      modifiedBy: updates.modifiedBy || 'system'
    };

    this.data.entities[entityIndex] = updatedEntity;
    this.addToChangeLog('update', 'entity', id, updatedEntity.label, changes);
    
    // Update search index
    this.rebuildSearchIndex();
    
    return updatedEntity;
  }

  /**
   * Delete an entity and its relationships
   */
  deleteEntity(id: string): boolean {
    const entityIndex = this.data.entities.findIndex(e => e.id === id);
    if (entityIndex === -1) return false;

    const entity = this.data.entities[entityIndex];
    
    // Remove entity
    this.data.entities.splice(entityIndex, 1);
    
    // Remove related relationships
    this.data.relationships = this.data.relationships.filter(
      rel => rel.source !== id && rel.target !== id
    );
    
    this.addToChangeLog('delete', 'entity', id, entity.label);
    
    // Update search index
    this.rebuildSearchIndex();
    
    return true;
  }

  /**
   * Search entities
   */
  search(query: Query): QueryResult {
    const startTime = Date.now();
    let results: StandaloneEntity[] = Array.from(this.data.entities);
    const highlights: Record<string, string[]> = {};

    // Text search
    if (query.text) {
      const searchText = query.text.toLowerCase();
      const matchingIds = new Set<string>();
      
      // Search in full-text index
      this.searchIndex.fullText.forEach(entry => {
        if (entry.text.includes(searchText)) {
          matchingIds.add(entry.entityId);
          
          // Extract highlights
          const entity = this.searchIndex.byId.get(entry.entityId);
          if (entity) {
            highlights[entry.entityId] = this.extractHighlights(entity, searchText);
          }
        }
      });
      
      results = results.filter(e => matchingIds.has(e.id));
    }

    // Type filter
    if (query.types && query.types.length > 0) {
      results = results.filter(e => query.types!.includes(e.type));
    }

    // Category filter
    if (query.categories && query.categories.length > 0) {
      results = results.filter(e => e.category && query.categories!.includes(e.category));
    }

    // Level filter
    if (query.levels && query.levels.length > 0) {
      results = results.filter(e => query.levels!.includes(e.level));
    }

    // Tag filter
    if (query.tags && query.tags.length > 0) {
      const tagSet = new Set(query.tags.map(t => t.toLowerCase()));
      results = results.filter(e => 
        e.tags?.some(tag => tagSet.has(tag.toLowerCase()))
      );
    }

    // Date filters
    if (query.modifiedAfter) {
      results = results.filter(e => e.modified >= query.modifiedAfter!);
    }
    if (query.modifiedBefore) {
      results = results.filter(e => e.modified <= query.modifiedBefore!);
    }
    if (query.expiringBefore) {
      results = results.filter(e => e.expiry && e.expiry <= query.expiringBefore!);
    }

    // Parent filter
    if (query.hasParent) {
      results = results.filter(e => e.parentIds?.includes(query.hasParent!));
    }

    // Sorting
    results = this.sortResults(results, query.sortBy || 'relevance', query.sortOrder || 'desc');

    // Pagination
    const totalCount = results.length;
    const offset = query.offset || 0;
    const limit = query.limit || 50;
    const paginatedResults = results.slice(offset, offset + limit);

    return {
      entities: paginatedResults,
      totalCount,
      hasMore: offset + limit < totalCount,
      nextOffset: offset + limit < totalCount ? offset + limit : undefined,
      executionTime: Date.now() - startTime,
      highlights
    };
  }

  /**
   * Get entity by ID
   */
  getEntity(id: string): StandaloneEntity | null {
    return this.searchIndex.byId.get(id) || null;
  }

  /**
   * Get children of an entity
   */
  getChildren(parentId: string): StandaloneEntity[] {
    const childIds = this.searchIndex.byParent.get(parentId);
    if (!childIds) return [];
    
    return Array.from(childIds)
      .map(id => this.searchIndex.byId.get(id))
      .filter(Boolean) as StandaloneEntity[];
  }

  /**
   * Get documents expiring soon
   */
  getExpiringDocuments(days: number = 30): StandaloneEntity[] {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    const futureDateStr = futureDate.toISOString().split('T')[0];
    
    return this.data.entities.filter(e => 
      e.expiry && e.expiry <= futureDateStr
    ).sort((a, b) => (a.expiry || '').localeCompare(b.expiry || ''));
  }

  /**
   * Validate the graph structure
   */
  validate(): ValidationResult {
    const errors: any[] = [];
    const warnings: any[] = [];

    // Check for orphaned relationships
    this.data.relationships.forEach(rel => {
      if (!this.searchIndex.byId.has(rel.source)) {
        errors.push({
          path: `relationships[${rel.id}].source`,
          message: `Source entity '${rel.source}' not found`,
          code: 'ORPHANED_RELATIONSHIP'
        });
      }
      if (!this.searchIndex.byId.has(rel.target)) {
        errors.push({
          path: `relationships[${rel.id}].target`,
          message: `Target entity '${rel.target}' not found`,
          code: 'ORPHANED_RELATIONSHIP'
        });
      }
    });

    // Check for missing parent references
    this.data.entities.forEach(entity => {
      entity.parentIds?.forEach(parentId => {
        if (!this.searchIndex.byId.has(parentId)) {
          warnings.push({
            path: `entities[${entity.id}].parentIds`,
            message: `Parent entity '${parentId}' not found`,
            code: 'MISSING_PARENT'
          });
        }
      });
    });

    // Check for expired documents
    const now = new Date().toISOString();
    this.data.entities.forEach(entity => {
      if (entity.expiry && entity.expiry < now) {
        warnings.push({
          path: `entities[${entity.id}].expiry`,
          message: `Document expired on ${entity.expiry}`,
          code: 'EXPIRED_DOCUMENT'
        });
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Export to JSON
   */
  toJSON(): string {
    return JSON.stringify(this.data, null, 2);
  }

  /**
   * Import from JSON
   */
  static fromJSON(json: string): DocumentGraphModel {
    const data = JSON.parse(json) as StandaloneDocumentGraph;
    return new DocumentGraphModel(data);
  }

  /**
   * Get statistics about the graph
   */
  getStatistics() {
    const stats = {
      totalEntities: this.data.entities.length,
      totalRelationships: this.data.relationships.length,
      entitiesByType: {} as Record<string, number>,
      entitiesByLevel: {} as Record<number, number>,
      documentsExpiringSoon: 0,
      totalDocuments: 0
    };

    this.data.entities.forEach(entity => {
      // By type
      stats.entitiesByType[entity.type] = (stats.entitiesByType[entity.type] || 0) + 1;
      
      // By level
      stats.entitiesByLevel[entity.level] = (stats.entitiesByLevel[entity.level] || 0) + 1;
      
      // Count documents
      if (entity.documents && entity.documents.length > 0) {
        stats.totalDocuments += entity.documents.length;
      }
    });

    // Expiring documents
    stats.documentsExpiringSoon = this.getExpiringDocuments(30).length;

    return stats;
  }

  // Helper methods

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private rebuildSearchIndex(): void {
    this.searchIndex = this.buildSearchIndex();
  }

  private addToChangeLog(
    action: ChangeLogEntry['action'],
    entityType: ChangeLogEntry['entityType'],
    entityId: string,
    entityLabel?: string,
    changes?: any[]
  ): void {
    if (!this.data.changeLog) {
      this.data.changeLog = [];
    }

    this.data.changeLog.push({
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      userId: 'system',
      action,
      entityType,
      entityId,
      entityLabel,
      changes
    });

    // Keep only last 1000 entries
    if (this.data.changeLog.length > 1000) {
      this.data.changeLog = this.data.changeLog.slice(-1000);
    }
  }

  private detectChanges(oldEntity: any, updates: any): any[] {
    const changes = [];
    for (const key in updates) {
      if (updates[key] !== oldEntity[key]) {
        changes.push({
          field: key,
          oldValue: oldEntity[key],
          newValue: updates[key]
        });
      }
    }
    return changes;
  }

  private extractHighlights(entity: StandaloneEntity, searchText: string): string[] {
    const highlights: string[] = [];
    const fields = [entity.label, entity.description, entity.tags?.join(' ')];
    
    fields.forEach(field => {
      if (field && field.toLowerCase().includes(searchText)) {
        const index = field.toLowerCase().indexOf(searchText);
        const start = Math.max(0, index - 20);
        const end = Math.min(field.length, index + searchText.length + 20);
        highlights.push('...' + field.slice(start, end) + '...');
      }
    });
    
    return highlights;
  }

  private sortResults(
    results: StandaloneEntity[],
    sortBy: string,
    order: 'asc' | 'desc'
  ): StandaloneEntity[] {
    const sorted = [...results];
    
    sorted.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'label':
          comparison = a.label.localeCompare(b.label);
          break;
        case 'modified':
          comparison = a.modified.localeCompare(b.modified);
          break;
        case 'created':
          comparison = a.created.localeCompare(b.created);
          break;
        case 'expiry':
          comparison = (a.expiry || '').localeCompare(b.expiry || '');
          break;
        default:
          // Relevance - already sorted by search
          return 0;
      }
      
      return order === 'desc' ? -comparison : comparison;
    });
    
    return sorted;
  }
}

// Example usage demonstrating platform independence
export function exampleUsage() {
  // Create a new graph
  const model = new DocumentGraphModel();

  // Add a person
  const brett = model.addEntity({
    label: 'Brett Thebault',
    type: 'person',
    level: 1,
    description: 'Father, primary account holder',
    tags: ['family', 'parent'],
    createdBy: 'user-123',
    modifiedBy: 'user-123'
  });

  // Add a document with secure reference
  model.addEntity({
    label: 'Brett Passport',
    type: 'document',
    category: 'passport',
    level: 3,
    parentIds: [brett.id],
    expiry: '2029-05-15',
    documents: [{
      id: 'doc-001',
      type: 'google-drive',
      location: 'google-drive://1234567890',
      mimeType: 'image/jpeg',
      fileName: 'brett-passport.jpg',
      fileSize: 2048000,
      provider: 'google-drive',
      requiresAuth: true,
      uploadedAt: new Date().toISOString(),
      uploadedBy: 'user-123'
    }],
    metadata: {
      passportNumber: 'ABC123456',
      country: 'USA',
      expiryDate: '2029-05-15'
    },
    createdBy: 'user-123',
    modifiedBy: 'user-123'
  });

  // Search
  const results = model.search({
    text: 'passport',
    types: ['document'],
    expiringBefore: '2030-01-01'
  });

  // Get expiring documents
  const expiring = model.getExpiringDocuments(365);

  // Validate
  const validation = model.validate();

  // Export
  const json = model.toJSON();

  // Import
  DocumentGraphModel.fromJSON(json);

  return { model, results, expiring, validation };
}