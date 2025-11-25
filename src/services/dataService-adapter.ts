/**
 * Adapter to use new StandaloneDataService as drop-in replacement for old DataService
 * This allows gradual migration of the UI components
 */

import { Node, Edge } from '@xyflow/react';
import { StandaloneDataService, NodeData } from './standaloneDataService';
import { GoogleDriveDataService } from './googleDriveDataService';
import { googleAuthService } from './googleAuthService';
import { Entity } from '../data/model';

/**
 * Drop-in replacement for the old DataService class
 * Uses GoogleDriveDataService when authenticated, StandaloneDataService otherwise
 */
export class DataService {
  private standaloneService: StandaloneDataService | GoogleDriveDataService;
  private service: StandaloneDataService | GoogleDriveDataService; // Alias for compatibility
  
  constructor(model?: any, useExpandedData: boolean = true) {
    // Use GoogleDriveDataService if authenticated
    if (googleAuthService.isAuthenticated()) {
      this.standaloneService = GoogleDriveDataService.getInstance();
      this.service = this.standaloneService; // Set alias
      // Initialize it asynchronously
      (this.standaloneService as GoogleDriveDataService).initialize().catch(error => {
        console.error('Failed to initialize Google Drive data service:', error);
      });
    } else {
      // Fall back to local sample data
      this.standaloneService = new StandaloneDataService(undefined, useExpandedData);
      this.service = this.standaloneService; // Set alias
    }
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
   * Delete an entity
   */
  deleteEntity(entityId: string): boolean {
    try {
      return this.standaloneService.deleteEntity(entityId);
    } catch (error) {
      console.error('Failed to delete entity:', error);
      return false;
    }
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
  
  /**
   * Check if using Google Drive service
   */
  isUsingGoogleDrive(): boolean {
    return this.service instanceof GoogleDriveDataService;
  }
  
  /**
   * Get Google Drive service if available
   */
  getGoogleDriveService(): GoogleDriveDataService | null {
    if (this.standaloneService instanceof GoogleDriveDataService) {
      return this.standaloneService;
    }
    return null;
  }
  
  /**
   * Save changes (only works with Google Drive)
   */
  async saveChanges(): Promise<void> {
    if (this.standaloneService instanceof GoogleDriveDataService) {
      await this.standaloneService.saveChanges();
    }
  }
  
  /**
   * Update UI hints for an entity (triggers auto-save if using Google Drive)
   */
  updateUIHints(entityId: string, hints: any): void {
    if (this.standaloneService instanceof GoogleDriveDataService) {
      this.standaloneService.updateUIHints(entityId, hints);
    }
  }
  
  /**
   * Upload a document to Google Drive (if available)
   */
  async uploadDocument(
    file: File,
    entity: any
  ): Promise<{
    fileId: string;
    webViewLink: string;
    webContentLink: string;
    personFolder: string;
  } | null> {
    if (this.standaloneService instanceof GoogleDriveDataService) {
      return await this.standaloneService.uploadDocument(file, entity);
    }
    return null;
  }
  
  /**
   * Add a new entity to the model
   */
  addEntity(entity: Partial<any>): any {
    return this.standaloneService.addEntity(entity);
  }
  
  /**
   * Update an existing entity
   */
  updateEntity(id: string, updates: Partial<any>): any {
    return this.standaloneService.updateEntity(id, updates);
  }

  /**
   * Check if user needs to go through onboarding (Google Drive only)
   */
  needsOnboarding(): boolean {
    if (this.standaloneService instanceof GoogleDriveDataService) {
      return this.standaloneService.needsOnboarding();
    }
    return false;
  }

  /**
   * Complete onboarding by saving the family name (Google Drive only)
   */
  async completeOnboarding(familyName: string): Promise<void> {
    if (this.standaloneService instanceof GoogleDriveDataService) {
      await this.standaloneService.completeOnboarding(familyName);
    }
  }

  /**
   * Wait for data service initialization to complete (Google Drive only)
   * Returns immediately for non-Google Drive services
   */
  async waitForInitialization(): Promise<void> {
    if (this.standaloneService instanceof GoogleDriveDataService) {
      await this.standaloneService.waitForInitialization();
    }
  }

  /**
   * Check if the data service has finished initializing
   */
  isInitialized(): boolean {
    if (this.standaloneService instanceof GoogleDriveDataService) {
      return this.standaloneService.isInitialized();
    }
    return true; // Non-Google Drive services are always "initialized"
  }
}

// Export singleton instance for backward compatibility
export const dataService = new DataService(undefined, true);

// Also export the standalone service for new code
export { StandaloneDataService } from './standaloneDataService';
export type { NodeData } from './standaloneDataService';