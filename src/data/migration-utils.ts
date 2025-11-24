/**
 * Migration utilities for converting existing data to standalone model with Google Drive
 */

import { Entity, DocumentGraphModel as OldModel } from './model';
import { 
  StandaloneEntity, 
  StandaloneDocumentGraph, 
  DocumentReference,
  StandaloneRelationship
} from './standalone-model';

/**
 * Migrate from old model to new standalone model
 */
export class DataMigration {
  private pendingUploads: Map<string, PendingUpload> = new Map();
  
  /**
   * Convert old model to new standalone model
   */
  async migrateToStandalone(
    oldModel: OldModel,
    googleAccount: string
  ): Promise<MigrationResult> {
    const now = new Date().toISOString();
    const migrationId = this.generateId();
    
    // Convert entities
    const { entities, uploads } = await this.migrateEntities(
      oldModel.entities,
      googleAccount
    );
    
    // Store pending uploads
    uploads.forEach(upload => {
      this.pendingUploads.set(upload.entityId, upload);
    });
    
    // Convert relationships
    const relationships = this.migrateRelationships(oldModel.relationships);
    
    // Create new graph
    const newGraph: StandaloneDocumentGraph = {
      id: migrationId,
      version: '2.0.0',
      schema: 'https://lifemap.au/schemas/v2/document-graph.json',
      metadata: {
        title: 'Migrated Document Graph',
        description: 'Migrated from legacy format',
        created: oldModel.metadata.created,
        modified: now,
        createdBy: 'migration-tool',
        modifiedBy: 'migration-tool',
        tenant: `family-${migrationId}`,
        locale: 'en-US'
      },
      entities,
      relationships,
      permissions: {
        owners: [googleAccount],
        editors: [],
        viewers: [],
        publicRead: false
      },
      changeLog: [{
        id: this.generateId(),
        timestamp: now,
        userId: 'migration-tool',
        userName: 'Migration Tool',
        action: 'create',
        entityType: 'entity',
        entityId: 'migration',
        entityLabel: 'Initial migration from v1',
        reason: 'Migrating to standalone model with Google Drive storage'
      }],
      integrations: {
        googleDrive: {
          enabled: true,
          syncEnabled: false
        }
      }
    };
    
    return {
      graph: newGraph,
      pendingUploads: Array.from(this.pendingUploads.values()),
      summary: {
        totalEntities: entities.length,
        totalRelationships: relationships.length,
        pendingUploads: this.pendingUploads.size,
        migrationId
      }
    };
  }
  
  /**
   * Migrate entities with document references
   */
  private async migrateEntities(
    oldEntities: Entity[],
    googleAccount: string
  ): Promise<{ entities: StandaloneEntity[], uploads: PendingUpload[] }> {
    const entities: StandaloneEntity[] = [];
    const uploads: PendingUpload[] = [];
    const now = new Date().toISOString();
    
    for (const oldEntity of oldEntities) {
      const newEntity: StandaloneEntity = {
        // Core fields
        id: oldEntity.id,
        label: oldEntity.label,
        type: oldEntity.type,
        subtype: oldEntity.subtype,
        category: oldEntity.category,
        description: oldEntity.description,
        
        // Hierarchy
        level: oldEntity.level,
        parentIds: oldEntity.parentIds,
        childrenCount: 0, // Will be computed
        
        // Ownership
        ownership: oldEntity.ownership,
        
        // Dates
        created: now,
        modified: now,
        createdBy: 'migration-tool',
        modifiedBy: 'migration-tool',
        expiry: oldEntity.expiry,
        
        // Metadata
        metadata: oldEntity.metadata,
        
        // Search optimization
        searchableText: this.buildSearchableText(oldEntity),
        tags: this.extractTags(oldEntity),
        
        // UI hints (these don't exist in old data, so use defaults)
        uiHints: {
          expanded: false,
          position: undefined
        }
      };
      
      // Convert document references
      if (oldEntity.documentPath) {
        const { reference, upload } = await this.createGoogleDriveReference(
          oldEntity,
          googleAccount
        );
        
        newEntity.documents = [reference];
        newEntity.primaryDocument = reference.id;
        
        if (upload) {
          uploads.push(upload);
        }
      }
      
      entities.push(newEntity);
    }
    
    return { entities, uploads };
  }
  
  /**
   * Create Google Drive reference for a document
   */
  private async createGoogleDriveReference(
    entity: Entity,
    googleAccount: string
  ): Promise<{ reference: DocumentReference, upload?: PendingUpload }> {
    const fileId = `pending-${this.generateId()}`;
    const fileName = this.extractFileName(entity.documentPath!);
    const mimeType = this.getMimeType(entity.documentType || 'other');
    
    const reference: DocumentReference = {
      id: this.generateId(),
      type: 'google-drive',
      location: `google-drive://${fileId}`,
      mimeType,
      fileName,
      provider: 'google-drive',
      accessMethod: 'oauth2',
      requiresAuth: true,
      uploadedAt: new Date().toISOString(),
      uploadedBy: 'migration-tool',
      lastModified: new Date().toISOString(),
      
      // Google Drive specific metadata
      googleDriveMetadata: {
        fileId,
        driveAccount: googleAccount,
        shared: false,
        capabilities: {
          canEdit: true,
          canShare: true,
          canDownload: true
        }
      }
    };
    
    // Create pending upload record
    const upload: PendingUpload = {
      entityId: entity.id,
      entityLabel: entity.label,
      localPath: entity.documentPath!,
      googleDriveFileId: fileId,
      fileName,
      mimeType,
      status: 'pending',
      category: this.determineCategory(entity),
      parentFolder: this.determineParentFolder(entity)
    };
    
    return { reference, upload };
  }
  
  /**
   * Migrate relationships
   */
  private migrateRelationships(
    oldRelationships: any[]
  ): StandaloneRelationship[] {
    const now = new Date().toISOString();
    
    return oldRelationships.map(rel => ({
      id: rel.id,
      source: rel.source,
      target: rel.target,
      type: this.mapRelationshipType(rel.type),
      label: rel.label,
      created: now,
      createdBy: 'migration-tool',
      properties: {},
      weight: 1,
      primary: true
    }));
  }
  
  /**
   * Upload pending documents to Google Drive
   */
  async uploadPendingDocuments(
    pendingUploads: PendingUpload[],
    googleDriveService: any // Would be the actual Google Drive service
  ): Promise<UploadResult[]> {
    const results: UploadResult[] = [];
    
    for (const upload of pendingUploads) {
      try {
        // This would actually upload to Google Drive
        // For now, we'll simulate the process
        const result = await this.simulateUpload(upload, googleDriveService);
        results.push(result);
      } catch (error) {
        results.push({
          entityId: upload.entityId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return results;
  }
  
  /**
   * Simulate upload (placeholder for actual implementation)
   */
  private async simulateUpload(
    upload: PendingUpload,
    googleDriveService: any
  ): Promise<UploadResult> {
    // In real implementation:
    // 1. Read file from local path
    // 2. Create folder structure in Google Drive
    // 3. Upload file
    // 4. Get real file ID
    // 5. Update document reference
    
    return {
      entityId: upload.entityId,
      success: true,
      googleDriveFileId: `real-file-id-${this.generateId()}`,
      webViewLink: `https://drive.google.com/file/d/${upload.googleDriveFileId}/view`,
      webContentLink: `https://drive.google.com/uc?id=${upload.googleDriveFileId}&export=download`
    };
  }
  
  // Helper methods
  
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private extractFileName(path: string): string {
    return path.split('/').pop() || 'document';
  }
  
  private getMimeType(documentType: string): string {
    const mimeTypes: Record<string, string> = {
      'image': 'image/jpeg',
      'pdf': 'application/pdf',
      'document': 'application/vnd.google-apps.document',
      'other': 'application/octet-stream'
    };
    return mimeTypes[documentType] || mimeTypes.other;
  }
  
  private buildSearchableText(entity: Entity): string {
    return [
      entity.label,
      entity.description,
      entity.type,
      entity.subtype,
      entity.category
    ].filter(Boolean).join(' ').toLowerCase();
  }
  
  private extractTags(entity: Entity): string[] {
    const tags: string[] = [];
    
    if (entity.type) tags.push(entity.type);
    if (entity.subtype) tags.push(entity.subtype);
    if (entity.category) tags.push(entity.category);
    if (entity.ownership) tags.push(entity.ownership);
    
    // Extract tags from metadata
    if (entity.metadata) {
      Object.values(entity.metadata).forEach(value => {
        if (typeof value === 'string' && value.length < 50) {
          tags.push(value.toLowerCase());
        }
      });
    }
    
    return Array.from(new Set(tags)); // Remove duplicates
  }
  
  private mapRelationshipType(oldType?: string): any {
    const typeMap: Record<string, string> = {
      'owns': 'owns',
      'parent': 'parent-child',
      'child': 'parent-child',
      'references': 'references',
      'related': 'related-to'
    };
    return typeMap[oldType || ''] || 'related-to';
  }
  
  private determineCategory(entity: Entity): string {
    if (entity.category) return entity.category;
    if (entity.subtype) return entity.subtype;
    return entity.type;
  }
  
  private determineParentFolder(entity: Entity): string {
    // Determine Google Drive folder structure based on entity hierarchy
    const folderMap: Record<string, string> = {
      'identity': 'Identity Documents',
      'health': 'Health Records',
      'finance': 'Financial Documents',
      'property': 'Property Documents',
      'vehicle': 'Vehicle Documents',
      'insurance': 'Insurance Policies',
      'education': 'Education Records',
      'work': 'Work Documents',
      'travel': 'Travel Documents'
    };
    
    const category = this.determineCategory(entity);
    return folderMap[category] || 'Other Documents';
  }
}

// Types for migration

export interface MigrationResult {
  graph: StandaloneDocumentGraph;
  pendingUploads: PendingUpload[];
  summary: {
    totalEntities: number;
    totalRelationships: number;
    pendingUploads: number;
    migrationId: string;
  };
}

export interface PendingUpload {
  entityId: string;
  entityLabel: string;
  localPath: string;
  googleDriveFileId: string;
  fileName: string;
  mimeType: string;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  category: string;
  parentFolder: string;
  error?: string;
}

export interface UploadResult {
  entityId: string;
  success: boolean;
  googleDriveFileId?: string;
  webViewLink?: string;
  webContentLink?: string;
  error?: string;
}

// Migration validator

export class MigrationValidator {
  /**
   * Validate migrated data
   */
  static validate(
    oldModel: OldModel,
    newGraph: StandaloneDocumentGraph
  ): ValidationReport {
    const issues: ValidationIssue[] = [];
    
    // Check entity count
    if (oldModel.entities.length !== newGraph.entities.length) {
      issues.push({
        level: 'error',
        message: `Entity count mismatch: ${oldModel.entities.length} vs ${newGraph.entities.length}`,
        path: 'entities'
      });
    }
    
    // Check all entities migrated
    const oldIds = new Set(oldModel.entities.map(e => e.id));
    const newIds = new Set(newGraph.entities.map(e => e.id));
    
    oldIds.forEach(id => {
      if (!newIds.has(id)) {
        issues.push({
          level: 'error',
          message: `Entity ${id} missing in migrated data`,
          path: `entities.${id}`
        });
      }
    });
    
    // Check document references
    oldModel.entities.forEach(oldEntity => {
      if (oldEntity.documentPath) {
        const newEntity = newGraph.entities.find(e => e.id === oldEntity.id);
        if (!newEntity?.documents || newEntity.documents.length === 0) {
          issues.push({
            level: 'warning',
            message: `Document reference missing for entity ${oldEntity.id}`,
            path: `entities.${oldEntity.id}.documents`
          });
        }
      }
    });
    
    // Check relationships
    if (oldModel.relationships.length !== newGraph.relationships.length) {
      issues.push({
        level: 'warning',
        message: `Relationship count mismatch: ${oldModel.relationships.length} vs ${newGraph.relationships.length}`,
        path: 'relationships'
      });
    }
    
    return {
      valid: issues.filter(i => i.level === 'error').length === 0,
      issues,
      summary: {
        errors: issues.filter(i => i.level === 'error').length,
        warnings: issues.filter(i => i.level === 'warning').length,
        info: issues.filter(i => i.level === 'info').length
      }
    };
  }
}

export interface ValidationReport {
  valid: boolean;
  issues: ValidationIssue[];
  summary: {
    errors: number;
    warnings: number;
    info: number;
  };
}

export interface ValidationIssue {
  level: 'error' | 'warning' | 'info';
  message: string;
  path: string;
}