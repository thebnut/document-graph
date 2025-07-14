/**
 * Data service implementation using the standalone model
 * Provides backward compatibility with existing UI while using new data structure
 */

import { Node, Edge } from 'reactflow';
import { DocumentGraphModel } from '../data/standalone-model-implementation';
import { StandaloneDocumentGraph, StandaloneEntity, Query } from '../data/standalone-model';
import { Entity, EntityRelationship, DocumentGraphModel as OldModel } from '../data/model';
import { DataMigration } from '../data/migration-utils';
import { config } from '../config/app-config';
import sampleData from '../data/sampleData.json';
import expandedSampleData from '../data/expandedSampleData.json';

// NodeData interface for ReactFlow compatibility
export interface NodeData extends StandaloneEntity {
  onShowTooltip?: (nodeId: string, data: NodeData, event: React.MouseEvent) => void;
  onHideTooltip?: () => void;
  isRootNode?: boolean;
  layoutAngle?: number;
  layoutRadius?: number;
  layoutDepth?: number;
}

/**
 * Adapter to convert between standalone model and ReactFlow
 */
export class StandaloneToReactFlowAdapter {
  /**
   * Convert StandaloneEntity to ReactFlow Node
   */
  static entityToNode(entity: StandaloneEntity): Node<NodeData> {
    return {
      id: entity.id,
      type: 'entity',
      position: entity.uiHints?.position || { x: 0, y: 0 },
      data: {
        ...entity,
        // Map document references to old format for compatibility
        documentPath: entity.documents?.[0]?.location,
        documentType: this.getDocumentType(entity.documents?.[0]?.mimeType),
        hasChildren: (entity.childrenCount || 0) > 0,
        isExpanded: entity.uiHints?.expanded,
        isManuallyPositioned: !!entity.uiHints?.position
      } as NodeData
    };
  }
  
  /**
   * Convert StandaloneRelationship to ReactFlow Edge
   */
  static relationshipToEdge(rel: any): Edge {
    return {
      id: rel.id,
      source: rel.source,
      target: rel.target,
      type: 'smoothstep',
      animated: false,
      label: rel.label
    };
  }
  
  /**
   * Get document type from mime type
   */
  private static getDocumentType(mimeType?: string): 'image' | 'pdf' | 'other' | undefined {
    if (!mimeType) return undefined;
    
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType === 'application/pdf') return 'pdf';
    return 'other';
  }
}

/**
 * Enhanced data service using standalone model
 */
export class StandaloneDataService {
  private model: DocumentGraphModel;
  private useExpandedData: boolean;
  private migrationTool: DataMigration;
  
  constructor(data?: StandaloneDocumentGraph, useExpandedData: boolean = true) {
    this.useExpandedData = useExpandedData;
    this.migrationTool = new DataMigration();
    
    if (data) {
      this.model = new DocumentGraphModel(data);
    } else {
      // Migrate from old format on first load
      this.model = this.loadAndMigrateData();
    }
  }
  
  /**
   * Load and migrate legacy data
   */
  private loadAndMigrateData(): DocumentGraphModel {
    const oldData = this.useExpandedData 
      ? (expandedSampleData as OldModel)
      : (sampleData as OldModel);
    
    // Perform migration (synchronously for now)
    const migrationResult = this.migrateLegacyData(oldData);
    
    return new DocumentGraphModel(migrationResult.graph);
  }
  
  /**
   * Migrate legacy data to standalone format
   */
  private migrateLegacyData(oldData: OldModel) {
    // For now, do a synchronous migration
    // In production, this would be async with progress tracking
    const googleAccount = config.auth.providers.includes('google') 
      ? 'user@example.com' // Would get from auth
      : 'local-user';
    
    // The migration is async, but we'll handle it synchronously for now
    const migrationPromise = this.migrationTool.migrateToStandalone(oldData, googleAccount);
    
    // Temporary: block until migration completes
    // In production, show a migration progress UI
    let result: any;
    migrationPromise.then(r => result = r);
    
    // For now, return a simplified migration
    return {
      graph: this.simpleMigration(oldData, googleAccount),
      pendingUploads: [],
      summary: {
        totalEntities: oldData.entities.length,
        totalRelationships: oldData.relationships.length,
        pendingUploads: 0,
        migrationId: 'simple-migration'
      }
    };
  }
  
  /**
   * Simple synchronous migration for immediate use
   */
  private simpleMigration(oldData: OldModel, googleAccount: string): StandaloneDocumentGraph {
    const now = new Date().toISOString();
    
    // Convert entities
    const entities: StandaloneEntity[] = oldData.entities.map(old => ({
      id: old.id,
      label: old.label,
      type: old.type,
      subtype: old.subtype,
      category: old.category,
      description: old.description,
      level: old.level,
      parentIds: old.parentIds,
      childrenCount: 0,
      ownership: old.ownership,
      created: now,
      modified: now,
      createdBy: 'migration',
      modifiedBy: 'migration',
      expiry: old.expiry,
      metadata: old.metadata,
      documents: old.documentPath ? [{
        id: `doc-${old.id}`,
        type: 'google-drive' as const,
        location: `google-drive://pending-${old.id}`,
        mimeType: this.getMimeType(old.documentType),
        fileName: old.documentPath.split('/').pop() || 'document',
        provider: 'google-drive' as const,
        requiresAuth: true,
        uploadedAt: now,
        uploadedBy: 'migration',
        googleDriveMetadata: {
          fileId: `pending-${old.id}`,
          driveAccount: googleAccount,
          shared: false
        }
      }] : undefined
    }));
    
    // Count children
    entities.forEach(entity => {
      entity.childrenCount = entities.filter(e => 
        e.parentIds?.includes(entity.id)
      ).length;
    });
    
    // Convert relationships
    const relationships = oldData.relationships.map(rel => ({
      ...rel,
      type: 'parent-child' as const,
      created: now,
      createdBy: 'migration'
    }));
    
    return {
      id: `migration-${Date.now()}`,
      version: '2.0.0',
      schema: 'https://lifemap.au/schemas/v2/document-graph.json',
      metadata: {
        title: 'Migrated Document Graph',
        created: oldData.metadata.created,
        modified: now,
        createdBy: 'migration',
        modifiedBy: 'migration',
        tenant: 'default',
        locale: 'en-US'
      },
      entities,
      relationships,
      permissions: {
        owners: [googleAccount],
        editors: [],
        viewers: [],
        publicRead: false
      }
    };
  }
  
  /**
   * Get the current data model
   */
  getModel(): DocumentGraphModel {
    return this.model;
  }
  
  /**
   * Convert entities to ReactFlow nodes
   */
  entitiesToNodes(entityIds?: string[]): Node<NodeData>[] {
    const query: Query = entityIds 
      ? {} // Will filter after
      : {};
    
    let entities = this.model.search(query).entities;
    
    // Filter by IDs if provided
    if (entityIds) {
      const idSet = new Set(entityIds);
      entities = entities.filter(e => idSet.has(e.id));
    }
    
    return entities.map(entity => StandaloneToReactFlowAdapter.entityToNode(entity));
  }
  
  /**
   * Convert relationships to ReactFlow edges
   */
  relationshipsToEdges(relationshipIds?: string[]): Edge[] {
    const relationships = (this.model as any).data.relationships || [];
    
    if (relationshipIds) {
      const idSet = new Set(relationshipIds);
      return relationships
        .filter((rel: any) => idSet.has(rel.id))
        .map((rel: any) => StandaloneToReactFlowAdapter.relationshipToEdge(rel));
    }
    
    return relationships.map((rel: any) => StandaloneToReactFlowAdapter.relationshipToEdge(rel));
  }
  
  /**
   * Get all entities
   */
  getAllEntities(): StandaloneEntity[] {
    return this.model.search({}).entities;
  }
  
  /**
   * Get entities by level
   */
  getEntitiesByLevel(level: number): StandaloneEntity[] {
    return this.model.search({ levels: [level] }).entities;
  }
  
  /**
   * Get children of an entity
   */
  getChildren(entityId: string): StandaloneEntity[] {
    return this.model.getChildren(entityId);
  }
  
  /**
   * Get entity by ID
   */
  getEntityById(id: string): StandaloneEntity | null {
    return this.model.getEntity(id);
  }
  
  /**
   * Get all descendant IDs (recursive children)
   */
  getAllDescendantIds(entityId: string): string[] {
    const descendants: string[] = [];
    const visited = new Set<string>();
    
    const collectDescendants = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);
      
      const children = this.getChildren(id);
      children.forEach(child => {
        descendants.push(child.id);
        collectDescendants(child.id);
      });
    };
    
    collectDescendants(entityId);
    return descendants;
  }
  
  /**
   * Get parent entities
   */
  getParents(entityId: string): StandaloneEntity[] {
    const entity = this.getEntityById(entityId);
    if (!entity?.parentIds) return [];
    
    return entity.parentIds
      .map(id => this.getEntityById(id))
      .filter(Boolean) as StandaloneEntity[];
  }
  
  /**
   * Search entities
   */
  searchEntities(searchText: string): StandaloneEntity[] {
    return this.model.search({ text: searchText }).entities;
  }
  
  /**
   * Get visible entities based on expansion state
   */
  getVisibleEntities(expandedNodeIds: Set<string>): StandaloneEntity[] {
    const visibleEntities: StandaloneEntity[] = [];
    const allEntities = this.getAllEntities();
    
    allEntities.forEach(entity => {
      // Always show root entities
      if (!entity.parentIds || entity.parentIds.length === 0) {
        visibleEntities.push(entity);
        return;
      }
      
      // Show if any parent is expanded
      const hasExpandedParent = entity.parentIds.some(parentId => 
        expandedNodeIds.has(parentId)
      );
      
      if (hasExpandedParent) {
        visibleEntities.push(entity);
      }
    });
    
    return visibleEntities;
  }
  
  /**
   * Get visible relationships based on visible entities
   */
  getVisibleRelationships(visibleEntityIds: Set<string>): any[] {
    const relationships = (this.model as any).data.relationships || [];
    
    return relationships.filter((rel: any) =>
      visibleEntityIds.has(rel.source) && visibleEntityIds.has(rel.target)
    );
  }
  
  /**
   * Get metadata display string
   */
  getMetadataDisplay(entity: StandaloneEntity): string[] {
    const display: string[] = [];
    
    if (entity.metadata) {
      Object.entries(entity.metadata).forEach(([key, value]) => {
        if (value && typeof value === 'string') {
          const formattedKey = key
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase());
          display.push(`${formattedKey}: ${value}`);
        }
      });
    }
    
    // Add document info
    if (entity.documents && entity.documents.length > 0) {
      const doc = entity.documents[0];
      if (doc.googleDriveMetadata?.shared) {
        display.push('Shared in Google Drive');
      }
    }
    
    return display;
  }
  
  /**
   * Add a new entity
   */
  addEntity(entity: Partial<StandaloneEntity>): StandaloneEntity {
    return this.model.addEntity({
      ...entity,
      createdBy: 'current-user', // Would get from auth
      modifiedBy: 'current-user'
    } as any);
  }
  
  /**
   * Update an entity
   */
  updateEntity(id: string, updates: Partial<StandaloneEntity>): StandaloneEntity | null {
    return this.model.updateEntity(id, {
      ...updates,
      modifiedBy: 'current-user' // Would get from auth
    });
  }
  
  /**
   * Delete an entity
   */
  deleteEntity(id: string): boolean {
    return this.model.deleteEntity(id);
  }
  
  /**
   * Get expiring documents
   */
  getExpiringDocuments(days: number = 30): StandaloneEntity[] {
    return this.model.getExpiringDocuments(days);
  }
  
  /**
   * Export data as JSON
   */
  exportToJSON(): string {
    return this.model.toJSON();
  }
  
  /**
   * Import data from JSON
   */
  importFromJSON(json: string): void {
    const imported = DocumentGraphModel.fromJSON(json);
    this.model = imported;
  }
  
  /**
   * Get statistics about the data
   */
  getStatistics() {
    return this.model.getStatistics();
  }
  
  /**
   * Validate the data model
   */
  validate() {
    return this.model.validate();
  }
  
  // Helper methods
  
  private getMimeType(documentType?: string): string {
    switch (documentType) {
      case 'image': return 'image/jpeg';
      case 'pdf': return 'application/pdf';
      default: return 'application/octet-stream';
    }
  }
}

// Export singleton instance for backward compatibility
let dataServiceInstance: StandaloneDataService;

export function getDataService(useExpandedData = true): StandaloneDataService {
  if (!dataServiceInstance) {
    dataServiceInstance = new StandaloneDataService(undefined, useExpandedData);
  }
  return dataServiceInstance;
}

// Re-export as default for drop-in replacement
export const dataService = getDataService();