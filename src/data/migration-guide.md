# Migration Guide: Current Model → Standalone Model

## Overview
This guide helps migrate from the current ReactFlow-coupled model to the new standalone, platform-agnostic model.

## Key Changes

### 1. Document References
**Before:**
```json
{
  "documentPath": "/documents/brett passport.jpeg",
  "documentType": "image"
}
```

**After:**
```json
{
  "documents": [{
    "id": "doc-123",
    "type": "cloud",
    "location": "https://storage.familygraph.com/docs/abc123",
    "mimeType": "image/jpeg",
    "fileName": "brett passport.jpeg",
    "provider": "google-drive",
    "requiresAuth": true,
    "accessToken": "temp-token-xyz",
    "expiresAt": "2024-12-15T00:00:00Z"
  }]
}
```

### 2. Lifecycle Fields
**Before:**
```json
{
  "id": "brett",
  "label": "Brett Thebault"
}
```

**After:**
```json
{
  "id": "brett",
  "label": "Brett Thebault",
  "created": "2024-01-01T00:00:00Z",
  "modified": "2024-12-10T00:00:00Z",
  "createdBy": "user-123",
  "modifiedBy": "user-456"
}
```

### 3. Search Optimization
**Before:** Search implemented in frontend service

**After:** Pre-computed search indices in data model
```json
{
  "searchableText": "brett thebault passport identity document",
  "tags": ["identity", "passport", "official"],
  "keywords": ["travel", "identification"]
}
```

## Migration Steps

### Step 1: Create Migration Script
```typescript
import { Entity, DocumentGraphModel } from './model';
import { StandaloneEntity, StandaloneDocumentGraph } from './standalone-model';

export function migrateToStandalone(
  oldModel: DocumentGraphModel
): StandaloneDocumentGraph {
  const now = new Date().toISOString();
  
  return {
    id: generateId(),
    version: '2.0.0',
    schema: 'https://familygraph.com/schemas/v2/document-graph.json',
    metadata: {
      title: 'Migrated Document Graph',
      created: oldModel.metadata.created,
      modified: now,
      createdBy: 'migration',
      modifiedBy: 'migration',
      tenant: 'default',
      locale: 'en-US'
    },
    entities: oldModel.entities.map(migrateEntity),
    relationships: oldModel.relationships.map(migrateRelationship),
    permissions: {
      owners: ['migration-owner'],
      editors: [],
      viewers: [],
      publicRead: false
    },
    changeLog: [{
      id: generateId(),
      timestamp: now,
      userId: 'system',
      action: 'create',
      entityType: 'entity',
      entityId: 'migration',
      entityLabel: 'Initial migration from v1',
      changes: []
    }]
  };
}

function migrateEntity(old: Entity): StandaloneEntity {
  const now = new Date().toISOString();
  
  return {
    // Core fields
    id: old.id,
    label: old.label,
    type: old.type,
    subtype: old.subtype,
    category: old.category,
    description: old.description,
    
    // Hierarchy
    level: old.level,
    parentIds: old.parentIds,
    childrenCount: 0, // Will be computed
    
    // Ownership
    ownership: old.ownership,
    
    // Convert document references
    documents: old.documentPath ? [{
      id: generateId(),
      type: 'url',
      location: convertPathToUrl(old.documentPath),
      mimeType: getMimeType(old.documentType),
      fileName: getFileName(old.documentPath),
      uploadedAt: now,
      uploadedBy: 'migration',
      requiresAuth: true
    }] : undefined,
    
    // Dates
    created: now,
    modified: now,
    createdBy: 'migration',
    modifiedBy: 'migration',
    expiry: old.expiry,
    
    // Metadata
    metadata: old.metadata,
    
    // Search optimization
    searchableText: buildSearchableText(old),
    tags: extractTags(old),
    
    // UI hints (preserve any manual positions)
    uiHints: {
      expanded: old.isExpanded,
      position: old.isManuallyPositioned ? { x: 0, y: 0 } : undefined
    }
  };
}

function convertPathToUrl(path: string): string {
  // Convert local paths to secure URLs
  // This would integrate with your storage provider
  const baseUrl = process.env.STORAGE_BASE_URL || 'https://storage.familygraph.com';
  return `${baseUrl}/migrate${path}`;
}
```

### Step 2: Create Adapter for Existing UI
```typescript
import { DocumentGraphModel } from './standalone-model-implementation';
import { Node, Edge } from 'reactflow';

export class StandaloneToReactFlowAdapter {
  private model: DocumentGraphModel;
  
  constructor(model: DocumentGraphModel) {
    this.model = model;
  }
  
  getNodes(expandedIds: Set<string>): Node[] {
    const entities = this.model.search({}).entities;
    
    return entities
      .filter(entity => this.shouldShowEntity(entity, expandedIds))
      .map(entity => ({
        id: entity.id,
        type: 'entity',
        position: entity.uiHints?.position || { x: 0, y: 0 },
        data: {
          ...entity,
          // Map new document structure to old format temporarily
          documentPath: entity.documents?.[0]?.location,
          documentType: this.getDocumentType(entity.documents?.[0]?.mimeType)
        }
      }));
  }
  
  getEdges(): Edge[] {
    // Convert relationships to edges
    return this.model.data.relationships.map(rel => ({
      id: rel.id,
      source: rel.source,
      target: rel.target,
      type: 'smoothstep',
      animated: false
    }));
  }
  
  private shouldShowEntity(
    entity: StandaloneEntity,
    expandedIds: Set<string>
  ): boolean {
    // Show root entities
    if (!entity.parentIds || entity.parentIds.length === 0) {
      return true;
    }
    
    // Show if any parent is expanded
    return entity.parentIds.some(parentId => expandedIds.has(parentId));
  }
}
```

### Step 3: Update Data Service
```typescript
// New data service that works with standalone model
export class StandaloneDataService {
  private model: DocumentGraphModel;
  private adapter: StandaloneToReactFlowAdapter;
  
  constructor(data?: StandaloneDocumentGraph) {
    this.model = new DocumentGraphModel(data);
    this.adapter = new StandaloneToReactFlowAdapter(this.model);
  }
  
  // Maintain backward compatibility
  entitiesToNodes(expandedIds: Set<string>): Node[] {
    return this.adapter.getNodes(expandedIds);
  }
  
  relationshipsToEdges(): Edge[] {
    return this.adapter.getEdges();
  }
  
  // New methods using standalone model
  search(query: string): StandaloneEntity[] {
    return this.model.search({ text: query }).entities;
  }
  
  addEntity(entity: Partial<StandaloneEntity>): StandaloneEntity {
    return this.model.addEntity(entity as any);
  }
  
  updateEntity(id: string, updates: Partial<StandaloneEntity>): void {
    this.model.updateEntity(id, updates);
  }
  
  getExpiringDocuments(): StandaloneEntity[] {
    return this.model.getExpiringDocuments(30);
  }
}
```

### Step 4: Gradual UI Migration
```typescript
// Phase 1: Use adapter (current)
const dataService = new DataService(sampleData);
const nodes = dataService.entitiesToNodes();

// Phase 2: Use standalone with adapter
const standaloneService = new StandaloneDataService(migratedData);
const nodes = standaloneService.entitiesToNodes(expandedIds);

// Phase 3: Direct standalone usage (future)
const model = new DocumentGraphModel(data);
const entities = model.search({ levels: [1, 2] }).entities;
// Render entities directly without ReactFlow dependency
```

## Testing Migration

### 1. Validate Data Integrity
```typescript
import { migrateToStandalone } from './migration';
import { DocumentGraphModel } from './standalone-model-implementation';

// Migrate
const oldData = require('./sampleData.json');
const newData = migrateToStandalone(oldData);

// Validate
const model = new DocumentGraphModel(newData);
const validation = model.validate();

console.log('Migration valid:', validation.valid);
console.log('Errors:', validation.errors);
console.log('Warnings:', validation.warnings);
```

### 2. Compare Search Results
```typescript
// Old search
const oldResults = oldDataService.searchEntities('passport');

// New search
const newResults = model.search({ text: 'passport' }).entities;

// Compare
console.log('Old count:', oldResults.length);
console.log('New count:', newResults.length);
```

### 3. Performance Testing
```typescript
// Measure search performance
const start = Date.now();
const results = model.search({ 
  text: 'health',
  types: ['document'],
  levels: [3, 4]
});
console.log('Search time:', Date.now() - start, 'ms');
console.log('Results:', results.totalCount);
```

## Benefits After Migration

1. **Platform Independence**: Same data model works on web, mobile, CLI
2. **Offline Search**: Pre-computed indices enable fast offline search
3. **Secure Documents**: URLs with temporary tokens instead of local paths
4. **Change Tracking**: Built-in audit trail for all modifications
5. **Better Performance**: Optimized search and filtering
6. **Schema Validation**: Ensures data integrity
7. **Easy Integration**: Clean API for any frontend framework

## Rollback Plan

If issues arise, maintain both models during transition:

```typescript
export class DualModeDataService {
  private useStandalone: boolean;
  private oldService: DataService;
  private newService: StandaloneDataService;
  
  constructor(useStandalone = false) {
    this.useStandalone = useStandalone;
    this.oldService = new DataService();
    this.newService = new StandaloneDataService();
  }
  
  search(query: string) {
    if (this.useStandalone) {
      return this.newService.search(query);
    }
    return this.oldService.searchEntities(query);
  }
}
```

This allows toggling between implementations via feature flag.