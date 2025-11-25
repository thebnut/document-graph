# Standalone Data Model Specification

## Core Principles
- Platform-agnostic JSON structure
- Self-contained with all necessary metadata
- Secure file references via URLs
- Built-in search capabilities
- Version control and schema validation

## Proposed Model Structure

```typescript
interface StandaloneDocumentGraph {
  // Metadata
  version: string;              // Semantic versioning
  schema: string;               // JSON Schema URL
  metadata: {
    id: string;                 // Unique graph ID
    created: string;            // ISO 8601
    modified: string;           // ISO 8601
    createdBy: string;          // User ID
    modifiedBy: string;         // User ID
    tenant: string;             // Family/organization ID
    description?: string;
  };
  
  // Core data
  entities: Entity[];
  relationships: Relationship[];
  
  // Search indices (pre-computed)
  searchIndex?: {
    byLabel: Record<string, string[]>;      // label -> entity IDs
    byType: Record<string, string[]>;       // type -> entity IDs
    byCategory: Record<string, string[]>;   // category -> entity IDs
    fullText: SearchEntry[];                // Full-text search entries
  };
  
  // Access control
  permissions?: {
    owners: string[];           // User IDs with full access
    editors: string[];          // User IDs with edit access
    viewers: string[];          // User IDs with view access
    publicRead?: boolean;       // Allow public read access
  };
}

interface Entity {
  // Core fields
  id: string;
  label: string;
  type: EntityType;
  subtype?: EntitySubtype;
  category?: DocumentCategory;
  description?: string;
  
  // Hierarchy
  level: number;
  parentIds?: string[];
  childrenCount?: number;       // Pre-computed for performance
  
  // Document references (secure)
  documents?: DocumentReference[];
  
  // Metadata
  metadata?: Record<string, any>;
  
  // Lifecycle
  created: string;              // ISO 8601
  modified: string;             // ISO 8601
  createdBy?: string;
  modifiedBy?: string;
  
  // Search optimization
  searchableText?: string;      // Pre-computed searchable content
  tags?: string[];              // Additional search tags
  
  // UI hints (optional, can be ignored by viewers)
  uiHints?: {
    icon?: string;
    color?: string;
    position?: { x: number; y: number };
    expanded?: boolean;
  };
}

interface DocumentReference {
  id: string;
  type: 'url' | 'blob' | 'external';
  location: string;             // Secure URL or blob reference
  mimeType: string;
  fileName: string;
  fileSize?: number;
  
  // Security
  accessToken?: string;         // Temporary access token
  expiresAt?: string;           // Token expiration
  requiresAuth?: boolean;
  
  // Metadata
  uploadedAt: string;
  uploadedBy: string;
  checksum?: string;            // For integrity verification
  
  // Preview/thumbnail
  thumbnailUrl?: string;
  previewUrl?: string;
}

interface Relationship {
  id: string;
  source: string;               // Entity ID
  target: string;               // Entity ID
  type: RelationshipType;
  label?: string;
  
  // Metadata
  created?: string;
  createdBy?: string;
  properties?: Record<string, any>;
}

interface SearchEntry {
  entityId: string;
  text: string;
  weight: number;               // Search relevance weight
}

type RelationshipType = 
  | 'parent-child' 
  | 'owns' 
  | 'insures' 
  | 'references' 
  | 'shares-with';
```

## Implementation Strategy

### 1. Data Layer Separation
Create a standalone data package that can be imported by any viewer:

```typescript
// @family-graph/data-model
export class DocumentGraphModel {
  constructor(data: StandaloneDocumentGraph) {}
  
  // CRUD operations
  addEntity(entity: Entity): void {}
  updateEntity(id: string, updates: Partial<Entity>): void {}
  deleteEntity(id: string): void {}
  
  // Search
  search(query: string): Entity[] {}
  findByType(type: EntityType): Entity[] {}
  findByParent(parentId: string): Entity[] {}
  
  // Export/Import
  toJSON(): StandaloneDocumentGraph {}
  static fromJSON(json: string): DocumentGraphModel {}
  
  // Validation
  validate(): ValidationResult {}
}
```

### 2. Secure File References
Replace local paths with secure URLs:

```typescript
// Before
"documentPath": "/documents/brett passport.jpeg"

// After
"documents": [{
  "id": "doc-123",
  "type": "url",
  "location": "https://storage.familygraph.com/docs/abc123",
  "mimeType": "image/jpeg",
  "fileName": "brett passport.jpeg",
  "requiresAuth": true,
  "accessToken": "temp-token-xyz",
  "expiresAt": "2024-12-15T00:00:00Z"
}]
```

### 3. Platform-Agnostic Viewers
Enable multiple viewers to consume the same data:

```typescript
// Web viewer
import { DocumentGraphModel } from '@family-graph/data-model';
const model = new DocumentGraphModel(data);
const entities = model.search('passport');

// Mobile viewer
import { DocumentGraphModel } from '@family-graph/data-model';
const model = new DocumentGraphModel(data);
const children = model.findByParent('brett');

// CLI tool
import { DocumentGraphModel } from '@family-graph/data-model';
const model = DocumentGraphModel.fromJSON(jsonString);
model.addEntity(newEntity);
console.log(model.toJSON());
```

### 4. Search Optimization
Pre-compute search indices in the model:

```typescript
// Build search index when model changes
private buildSearchIndex() {
  this.data.searchIndex = {
    byLabel: {},
    byType: {},
    fullText: []
  };
  
  this.data.entities.forEach(entity => {
    // Index by label
    const labelKey = entity.label.toLowerCase();
    this.data.searchIndex.byLabel[labelKey] = 
      [...(this.data.searchIndex.byLabel[labelKey] || []), entity.id];
    
    // Full-text index
    const searchText = [
      entity.label,
      entity.description,
      entity.tags?.join(' ')
    ].filter(Boolean).join(' ').toLowerCase();
    
    this.data.searchIndex.fullText.push({
      entityId: entity.id,
      text: searchText,
      weight: entity.level === 1 ? 2.0 : 1.0
    });
  });
}
```

### 5. Change Tracking
Add audit trail to track modifications:

```typescript
interface ChangeLog {
  id: string;
  timestamp: string;
  userId: string;
  action: 'create' | 'update' | 'delete';
  entityId: string;
  changes?: Record<string, { old: any; new: any }>;
}
```

## Migration Path

1. **Phase 1**: Create new standalone model alongside existing
2. **Phase 2**: Build adapter to convert between models
3. **Phase 3**: Migrate viewers to use new model
4. **Phase 4**: Deprecate old model

## Benefits

- ✅ Any viewer can consume the data
- ✅ Search works offline
- ✅ Secure file access with temporary tokens
- ✅ Version control friendly (clean JSON diffs)
- ✅ Schema validation ensures data integrity
- ✅ Platform-agnostic (web, mobile, CLI, API)