// Data model interfaces for the Document Graph application

export type EntityType = 'person' | 'pet' | 'asset' | 'document';
export type EntitySubtype = 'property' | 'vehicle' | 'financial' | 'legal' | 'medical' | 'insurance';

export interface Entity {
  id: string;
  label: string;
  type: EntityType;
  subtype?: EntitySubtype;
  description?: string;
  expiry?: string;
  source?: string;
  level: number;
  parentIds?: string[];
  hasChildren?: boolean;
  // Document reference fields
  documentPath?: string;
  documentType?: 'image' | 'pdf' | 'other';
  documentMetadata?: {
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    [key: string]: any;
  };
  // Additional metadata that might be needed
  metadata?: {
    [key: string]: any;
  };
}

export interface EntityRelationship {
  id: string;
  source: string;
  target: string;
  type?: string;
  label?: string;
}

export interface DocumentGraphModel {
  version: string;
  metadata: {
    created: string;
    modified: string;
    description?: string;
  };
  entities: Entity[];
  relationships: EntityRelationship[];
}

// Helper type for entity with computed properties
export interface EntityWithComputed extends Entity {
  isExpanded?: boolean;
  isManuallyPositioned?: boolean;
}