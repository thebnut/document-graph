/**
 * Standalone Document Graph Data Model
 * Platform-agnostic implementation that can be used by any viewer
 */

// Import types for use in this file
import type { 
  EntityType, 
  EntitySubtype, 
  DocumentCategory,
  OwnershipType,
  PassportMetadata,
  DriverLicenceMetadata,
  VehicleMetadata,
  PropertyMetadata,
  HealthMetadata,
  FinancialMetadata,
  InsuranceMetadata
} from './model';

// Re-export for external use
export type { 
  EntityType, 
  EntitySubtype, 
  DocumentCategory,
  OwnershipType,
  PassportMetadata,
  DriverLicenceMetadata,
  VehicleMetadata,
  PropertyMetadata,
  HealthMetadata,
  FinancialMetadata,
  InsuranceMetadata
};

// New secure document reference
export interface DocumentReference {
  id: string;
  type: 'google-drive' | 'url' | 'blob' | 'external';
  location: string;             // For Google Drive: 'google-drive://[fileId]'
  mimeType: string;
  fileName: string;
  fileSize?: number;
  
  // Security
  provider?: 'google-drive' | 'dropbox' | 'onedrive' | 'internal';
  accessMethod?: 'oauth2' | 'api-key' | 'direct';
  requiresAuth?: boolean;
  
  // Metadata
  uploadedAt: string;
  uploadedBy: string;
  lastModified?: string;
  checksum?: string;           // MD5 or SHA-256 for integrity
  
  // Preview
  thumbnailUrl?: string;
  previewUrl?: string;
  webViewLink?: string;        // View in Google Drive
  
  // Google Drive specific
  googleDriveMetadata?: {
    fileId: string;
    driveId?: string;          // Shared drive ID
    folderId?: string;         // Parent folder ID
    driveAccount: string;      // User's Google account
    permissions?: Array<{
      role: string;
      emailAddress?: string;
    }>;
    owners?: Array<{
      emailAddress: string;
      displayName: string;
    }>;
    shared?: boolean;
    capabilities?: {
      canEdit: boolean;
      canShare: boolean;
      canDownload: boolean;
    };
    webContentLink?: string;   // Direct download link
    iconLink?: string;         // File type icon
    hasThumbnail?: boolean;
    createdTime?: string;
    modifiedTime?: string;
    viewedByMeTime?: string;
  };
}

// Enhanced entity with secure references
export interface StandaloneEntity {
  // Core identification
  id: string;
  label: string;
  type: EntityType;
  subtype?: EntitySubtype;
  category?: DocumentCategory;
  
  // Content
  description?: string;
  
  // Hierarchy
  level: number;
  parentIds?: string[];
  childrenCount?: number;
  
  // Ownership
  ownership?: OwnershipType;
  owners?: string[];           // User IDs for shared ownership
  
  // Document references (replaces documentPath)
  documents?: DocumentReference[];
  primaryDocument?: string;    // ID of primary document
  
  // Dates
  created: string;             // ISO 8601
  modified: string;            // ISO 8601
  createdBy: string;
  modifiedBy: string;
  expiry?: string;            // For time-sensitive documents
  
  // Rich metadata (type-specific)
  metadata?: Record<string, any>;
  
  // Search optimization
  searchableText?: string;     // Pre-computed for fast search
  tags?: string[];
  keywords?: string[];
  
  // UI hints (optional for viewers)
  uiHints?: {
    icon?: string;
    color?: string;
    position?: { x: number; y: number };
    expanded?: boolean;
    hidden?: boolean;
    starred?: boolean;
  };
  
  // Compliance
  dataClassification?: 'public' | 'internal' | 'confidential' | 'restricted';
  retentionPolicy?: {
    deleteAfter?: string;      // ISO 8601
    archiveAfter?: string;     // ISO 8601
  };
}

// Relationship with metadata
export interface StandaloneRelationship {
  id: string;
  source: string;              // Entity ID
  target: string;              // Entity ID
  type: RelationshipType;
  label?: string;
  
  // Metadata
  created: string;
  createdBy: string;
  properties?: Record<string, any>;
  
  // Relationship strength/importance
  weight?: number;
  primary?: boolean;
}

// Search index for offline search
export interface SearchIndex {
  byId: Map<string, StandaloneEntity>;
  byLabel: Map<string, Set<string>>;
  byType: Map<EntityType, Set<string>>;
  byCategory: Map<DocumentCategory, Set<string>>;
  byTag: Map<string, Set<string>>;
  fullText: SearchEntry[];
  
  // Hierarchical indices
  byParent: Map<string, Set<string>>;
  byLevel: Map<number, Set<string>>;
  
  // Date indices
  byExpiry: Map<string, Set<string>>;  // YYYY-MM format -> entity IDs
  byModified: Map<string, Set<string>>; // YYYY-MM-DD format -> entity IDs
}

export interface SearchEntry {
  entityId: string;
  text: string;
  fields: string[];            // Which fields contain the text
  weight: number;              // Relevance weight
}

// Main standalone document graph
export interface StandaloneDocumentGraph {
  // Identification & versioning
  id: string;                  // Unique graph ID
  version: string;             // Semantic version
  schema: string;              // JSON Schema URL for validation
  
  // Metadata
  metadata: {
    title: string;
    description?: string;
    created: string;
    modified: string;
    createdBy: string;
    modifiedBy: string;
    tenant: string;            // Family/organization ID
    familyName?: string;       // Family name for filtering (e.g., "Thebault Family")
    locale?: string;           // en-US, etc.
  };
  
  // Core data
  entities: StandaloneEntity[];
  relationships: StandaloneRelationship[];
  
  // Pre-computed indices
  searchIndex?: SearchIndex;
  statistics?: {
    totalEntities: number;
    totalDocuments: number;
    entitiesByType: Record<EntityType, number>;
    documentsExpiringSoon: number;
    lastFullIndexing?: string;
  };
  
  // Access control
  permissions: {
    owners: string[];          // Full control
    editors: string[];         // Can modify
    viewers: string[];         // Read-only
    publicRead: boolean;
    allowedDomains?: string[]; // Email domains for auto-access
  };
  
  // Change tracking
  changeLog?: ChangeLogEntry[];
  lastSync?: {
    timestamp: string;
    source: string;
    status: 'success' | 'partial' | 'failed';
  };
  
  // External integrations
  integrations?: {
    googleDrive?: {
      enabled: boolean;
      rootFolderId?: string;
      syncEnabled?: boolean;
    };
    dropbox?: {
      enabled: boolean;
      appFolder?: string;
    };
  };
}

// Change tracking
export interface ChangeLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName?: string;
  action: 'create' | 'update' | 'delete' | 'restore';
  entityType: 'entity' | 'relationship';
  entityId: string;
  entityLabel?: string;
  changes?: Array<{
    field: string;
    oldValue: any;
    newValue: any;
  }>;
  reason?: string;
}

// Validation result
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  path: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  path: string;
  message: string;
  code: string;
}

// Relationship types
export type RelationshipType = 
  | 'parent-child'
  | 'owns'
  | 'shared-owner'
  | 'insures'
  | 'covers'
  | 'references'
  | 'related-to'
  | 'depends-on'
  | 'replaces'
  | 'supersedes';

// Export/Import formats
export interface ExportOptions {
  format: 'json' | 'yaml' | 'xml';
  includeDocuments: boolean;
  includeChangeLog: boolean;
  compressed: boolean;
  encryption?: {
    type: 'aes-256';
    publicKey?: string;
  };
}

export interface ImportOptions {
  merge: boolean;
  validateSchema: boolean;
  dryRun: boolean;
  conflictResolution: 'keep-existing' | 'overwrite' | 'create-new';
}

// Query interface for advanced searches
export interface Query {
  // Text search
  text?: string;
  
  // Filters
  types?: EntityType[];
  categories?: DocumentCategory[];
  levels?: number[];
  tags?: string[];
  
  // Date ranges
  modifiedAfter?: string;
  modifiedBefore?: string;
  expiringBefore?: string;
  expiringAfter?: string;
  
  // Relationships
  hasParent?: string;
  hasChild?: string;
  relatedTo?: string;
  
  // Metadata filters
  metadataFilters?: Array<{
    path: string;             // e.g., "metadata.passportNumber"
    operator: 'eq' | 'ne' | 'gt' | 'lt' | 'contains' | 'starts-with';
    value: any;
  }>;
  
  // Pagination
  offset?: number;
  limit?: number;
  
  // Sorting
  sortBy?: 'relevance' | 'label' | 'modified' | 'created' | 'expiry';
  sortOrder?: 'asc' | 'desc';
}

// API Response format
export interface QueryResult {
  entities: StandaloneEntity[];
  totalCount: number;
  hasMore: boolean;
  nextOffset?: number;
  executionTime: number;
  highlights?: Record<string, string[]>; // entityId -> highlighted snippets
}