/**
 * Adapter to use new StandaloneDataService as drop-in replacement for old DataService
 * This allows gradual migration of the UI components
 */

import { Node, Edge } from 'reactflow';
import { StandaloneDataService, NodeData } from './standaloneDataService';
import { Entity } from '../data/model';

/**
 * Drop-in replacement for the old DataService class
 * Uses StandaloneDataService internally but maintains the same API
 */
export class DataService {
  private standaloneService: StandaloneDataService;
  
  constructor(model?: any, useExpandedData: boolean = true) {
    // If model is provided, it's likely the old format - ignore for now
    this.standaloneService = new StandaloneDataService(undefined, useExpandedData);
  }
  
  /**
   * Get the current data model (returns the new model)
   */
  getModel(): any {
    return this.standaloneService.getModel();
  }
  
  /**
   * Convert entities to ReactFlow nodes (same API as before)
   */
  entitiesToNodes(entities?: Entity[]): Node<NodeData>[] {
    if (entities) {
      // If specific entities provided, get their IDs
      const entityIds = entities.map(e => e.id);
      return this.standaloneService.entitiesToNodes(entityIds);
    }
    return this.standaloneService.entitiesToNodes();
  }
  
  /**
   * Convert relationships to ReactFlow edges
   */
  relationshipsToEdges(relationships?: any[]): Edge[] {
    if (relationships) {
      const relationshipIds = relationships.map(r => r.id);
      return this.standaloneService.relationshipsToEdges(relationshipIds);
    }
    return this.standaloneService.relationshipsToEdges();
  }
  
  /**
   * Get all entities
   */
  getAllEntities(): Entity[] {
    // Convert StandaloneEntity to Entity format for compatibility
    return this.standaloneService.getAllEntities().map(entity => ({
      id: entity.id,
      label: entity.label,
      type: entity.type,
      subtype: entity.subtype,
      category: entity.category,
      description: entity.description,
      expiry: entity.expiry,
      source: entity.documents?.[0]?.location,
      level: entity.level,
      parentIds: entity.parentIds,
      hasChildren: (entity.childrenCount || 0) > 0,
      ownership: entity.ownership,
      documentPath: entity.documents?.[0]?.location,
      documentType: this.getDocumentType(entity.documents?.[0]?.mimeType),
      metadata: entity.metadata,
      isExpanded: entity.uiHints?.expanded,
      isManuallyPositioned: !!entity.uiHints?.position
    } as any));
  }
  
  /**
   * Get entities by level
   */
  getEntitiesByLevel(level: number): Entity[] {
    return this.standaloneService.getEntitiesByLevel(level).map(entity => ({
      id: entity.id,
      label: entity.label,
      type: entity.type,
      level: entity.level,
      // ... other fields
    } as any));
  }
  
  /**
   * Get children of an entity
   */
  getChildren(entityId: string): Entity[] {
    return this.standaloneService.getChildren(entityId).map(entity => ({
      id: entity.id,
      label: entity.label,
      type: entity.type,
      level: entity.level,
      parentIds: entity.parentIds,
      // ... other fields
    } as any));
  }
  
  /**
   * Get entity by ID
   */
  getEntityById(id: string): Entity | null {
    const entity = this.standaloneService.getEntityById(id);
    if (!entity) return null;
    
    return {
      id: entity.id,
      label: entity.label,
      type: entity.type,
      level: entity.level,
      // ... map other fields
    } as any;
  }
  
  /**
   * Get all descendant IDs (recursive children)
   */
  getAllDescendantIds(entityId: string): string[] {
    return this.standaloneService.getAllDescendantIds(entityId);
  }
  
  /**
   * Get parent entities
   */
  getParents(entityId: string): Entity[] {
    return this.standaloneService.getParents(entityId).map(entity => ({
      id: entity.id,
      label: entity.label,
      type: entity.type,
      level: entity.level,
      // ... other fields
    } as any));
  }
  
  /**
   * Search entities
   */
  searchEntities(searchText: string): Entity[] {
    return this.standaloneService.searchEntities(searchText).map(entity => ({
      id: entity.id,
      label: entity.label,
      type: entity.type,
      level: entity.level,
      description: entity.description,
      // ... other fields
    } as any));
  }
  
  /**
   * Get visible entities based on expansion state
   */
  getVisibleEntities(
    allEntities: Entity[],
    expandedNodeIds: Set<string>
  ): Entity[] {
    // Use the standalone service method
    const visibleStandalone = this.standaloneService.getVisibleEntities(expandedNodeIds);
    
    // Convert back to Entity format
    return visibleStandalone.map(entity => ({
      id: entity.id,
      label: entity.label,
      type: entity.type,
      level: entity.level,
      parentIds: entity.parentIds,
      hasChildren: (entity.childrenCount || 0) > 0,
      // ... other fields
    } as any));
  }
  
  /**
   * Get visible relationships based on visible entities
   */
  getVisibleRelationships(
    allRelationships: any[],
    visibleEntityIds: Set<string>
  ): any[] {
    return this.standaloneService.getVisibleRelationships(visibleEntityIds);
  }
  
  /**
   * Get metadata display string
   */
  getMetadataDisplay(entity: Entity): string[] {
    // Convert to standalone entity format
    const standaloneEntity = this.standaloneService.getEntityById(entity.id);
    if (!standaloneEntity) return [];
    
    return this.standaloneService.getMetadataDisplay(standaloneEntity);
  }
  
  // Helper method
  private getDocumentType(mimeType?: string): 'image' | 'pdf' | 'other' | undefined {
    if (!mimeType) return undefined;
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType === 'application/pdf') return 'pdf';
    return 'other';
  }
}

// Export singleton instance for backward compatibility
export const dataService = new DataService(undefined, true);

// Also export the standalone service for new code
export { StandaloneDataService } from './standaloneDataService';
export type { NodeData } from './standaloneDataService';