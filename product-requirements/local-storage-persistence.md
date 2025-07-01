# Product Requirements: Local Storage Data Persistence

**Document Version**: 1.0  
**Date**: December 2024  
**Author**: Product Team  
**Status**: Draft

## Executive Summary

This document outlines the requirements for implementing local storage persistence in the Document Graph application. This feature will transform the application from a visualization demo into a functional tool by allowing users to save, load, and manage their document graphs locally in their browser.

### Key Benefits
- Users can save their work and return to it later
- No backend infrastructure required initially
- Provides foundation for future cloud sync features
- Enables real-world usage and feedback collection

## User Stories

### Primary User Stories

1. **As a user, I want to save my document graph** so that I don't lose my work when I close the browser.
   - Acceptance Criteria:
     - One-click save functionality
     - Visual confirmation of successful save
     - Auto-save option available

2. **As a user, I want to load my previously saved graphs** so that I can continue working on them.
   - Acceptance Criteria:
     - List of available saved graphs
     - Preview of graph before loading
     - Load confirmation to prevent accidental overwrites

3. **As a user, I want to create multiple document graphs** so that I can organize different aspects of my life separately.
   - Acceptance Criteria:
     - Create new graph option
     - Name/rename graphs
     - Switch between graphs without data loss

4. **As a user, I want to export my graph data** so that I can backup or share it.
   - Acceptance Criteria:
     - Export to JSON format
     - Include all metadata and relationships
     - Human-readable format

5. **As a user, I want automatic saving** so that I don't lose work due to crashes or forgetting to save.
   - Acceptance Criteria:
     - Configurable auto-save interval
     - Non-intrusive save indicator
     - Ability to disable auto-save

### Secondary User Stories

6. **As a user, I want to import graph data** so that I can restore from backups or load shared graphs.
   - Acceptance Criteria:
     - Import JSON files
     - Validation of imported data
     - Merge or replace options

7. **As a user, I want to see storage usage** so that I know how much space my graphs are using.
   - Acceptance Criteria:
     - Display storage used/available
     - Warning when approaching limits
     - Option to manage/delete old graphs

## Functional Requirements

### 1. Data Storage

#### 1.1 Storage Mechanism
- Use browser's localStorage API for persistence
- Implement IndexedDB for larger datasets (future-proofing)
- Maximum single graph size: 5MB (localStorage limit)
- Support for multiple named graphs per browser

#### 1.2 Data Structure

The storage format wraps the existing `DocumentGraphModel` with additional metadata and UI state:

```typescript
interface StorageFormat {
  version: "1.0.0";
  graphs: {
    [graphId: string]: StoredGraph;
  };
  activeGraphId: string;
  settings: AppSettings;
}

interface StoredGraph {
  id: string;
  name: string;
  created: string;
  lastModified: string;
  thumbnail?: string; // base64 preview image
  model: DocumentGraphModel; // Existing model from model.ts
  uiState: UIState;
}

interface UIState {
  expandedNodes: string[]; // Array of expanded node IDs
  manualPositions: { [nodeId: string]: { x: number; y: number } };
  viewport?: {
    x: number;
    y: number;
    zoom: number;
  };
  theme: "light" | "dark";
  lastSearchQuery?: string;
}

interface AppSettings {
  autoSaveEnabled: boolean;
  autoSaveInterval: number; // milliseconds
  lastAutoSave?: string;
  showWelcomeOnStartup: boolean;
}
```

Example stored data:
```javascript
{
  version: "1.0.0",
  graphs: {
    "550e8400-e29b-41d4-a716-446655440000": {
      id: "550e8400-e29b-41d4-a716-446655440000",
      name: "Thebault Family Documents",
      created: "2024-12-01T00:00:00Z",
      lastModified: "2024-12-15T14:30:00Z",
      thumbnail: "data:image/png;base64,iVBORw0KG...",
      model: {
        // Unchanged DocumentGraphModel structure
        version: "2.0.0",
        metadata: {
          created: "2024-12-01T00:00:00Z",
          modified: "2024-12-15T14:30:00Z",
          description: "Family document graph"
        },
        entities: [...], // Entity[] array
        relationships: [...] // EntityRelationship[] array
      },
      uiState: {
        expandedNodes: ["brett", "brett-identity", "gemma"],
        manualPositions: {
          "brett": { x: 300, y: 300 },
          "gemma": { x: 500, y: 300 }
        },
        viewport: { x: 0, y: 0, zoom: 1 },
        theme: "light"
      }
    }
  },
  activeGraphId: "550e8400-e29b-41d4-a716-446655440000",
  settings: {
    autoSaveEnabled: true,
    autoSaveInterval: 300000,
    lastAutoSave: "2024-12-15T14:25:00Z",
    showWelcomeOnStartup: false
  }
}
```

### 2. Save Functionality

#### 2.1 Manual Save
- Keyboard shortcut: Cmd/Ctrl + S
- Save button in toolbar
- Save status indicator (saved/unsaved changes)
- Optimistic UI updates

#### 2.2 Auto-Save
- Default interval: 5 minutes
- Trigger on significant changes (add/delete node, major edits)
- Debounced to prevent excessive saves
- Background save without blocking UI

#### 2.3 Save Conflict Resolution
- Detect if another tab has modified the same graph
- Prompt user to resolve conflicts
- Option to keep local or remote version

### 3. Load Functionality

#### 3.1 Graph Selection
- Grid view of saved graphs with thumbnails
- Sort by: name, modified date, created date
- Search/filter graphs by name
- Quick preview on hover

#### 3.2 Load Process
- Confirmation if current graph has unsaved changes
- Progress indicator for large graphs
- Restore UI state (expanded nodes, viewport, theme)
- Convert stored arrays back to Sets for expanded nodes
- Apply manual positions to ReactFlow nodes
- Graceful handling of corrupted data

### 4. Graph Management

#### 4.1 Create New Graph
- Template options: blank, sample family structure (using expandedSampleData.json)
- Name input with suggestions
- Generate unique ID (UUID)
- Initialize with default UIState
- Set as active graph automatically

#### 4.2 Delete Graph
- Confirmation dialog with graph name
- Soft delete with recovery option (30 days)
- Permanent delete option

#### 4.3 Rename Graph
- Inline editing of graph name
- Validation for unique names
- Update across all references

### 5. Import/Export

#### 5.1 Export Features
- Export complete StoredGraph structure as JSON
- Option to export only DocumentGraphModel (without UI state)
- Include/exclude options for sensitive metadata
- Pretty-print JSON for readability
- Download with timestamp filename: `family-graph-2024-12-15.json`

#### 5.2 Import Features
- Drag-and-drop import
- File picker import
- Validation of DocumentGraphModel structure
- Check entity relationships integrity
- Preview graph name and entity count before import
- Import modes:
  - Create new graph (default)
  - Replace current graph (with confirmation)
  - Merge entities (future enhancement)

## Technical Requirements

### 1. Storage Implementation

#### 1.1 Storage Service

The storage service will work with the existing `DocumentGraphModel` and manage UI state separately:

```typescript
import { DocumentGraphModel } from '../data/model';

interface StorageService {
  // Graph operations
  saveGraph(graphId: string, name: string, model: DocumentGraphModel, uiState: UIState): Promise<void>;
  loadGraph(graphId: string): Promise<StoredGraph>;
  deleteGraph(graphId: string): Promise<void>;
  listGraphs(): Promise<GraphMetadata[]>;
  createGraph(name: string, template?: 'blank' | 'sample'): Promise<StoredGraph>;
  renameGraph(graphId: string, newName: string): Promise<void>;
  
  // UI State operations
  saveUIState(graphId: string, uiState: UIState): Promise<void>;
  loadUIState(graphId: string): Promise<UIState>;
  
  // Settings
  saveSettings(settings: AppSettings): Promise<void>;
  loadSettings(): Promise<AppSettings>;
  
  // Storage management
  getStorageUsage(): Promise<StorageInfo>;
  exportGraph(graphId: string): Promise<string>; // Returns JSON string
  importGraph(jsonData: string, mode: 'replace' | 'new'): Promise<StoredGraph>;
  clearAllData(): Promise<void>;
  generateThumbnail(graphId: string): Promise<string>; // Returns base64 image
}

interface GraphMetadata {
  id: string;
  name: string;
  created: string;
  lastModified: string;
  thumbnail?: string;
  entityCount: number;
  storageSize: number; // bytes
}

interface StorageInfo {
  used: number; // bytes
  available: number; // bytes
  graphCount: number;
  largestGraph: { id: string; name: string; size: number };
}
```

#### 1.2 Data Versioning
- Version field in all stored data
- Migration functions for version upgrades
- Backward compatibility for at least 2 major versions

#### 1.3 Performance Optimization
- Lazy loading of graph data (load metadata first, full model on demand)
- Thumbnail generation using ReactFlow's getViewport
- LZ-string compression for graphs > 1MB
- Incremental saves for UI state changes only
- Batch ReactFlow node updates when loading

### 2. Error Handling

#### 2.1 Storage Errors
- Quota exceeded: Prompt to delete old graphs
- Corrupted data: Attempt recovery, offer to reset
- Browser incompatibility: Graceful degradation

#### 2.2 User Notifications
- Toast notifications for save/load operations
- Error dialogs with actionable steps
- Progress indicators for long operations

### 3. Security Considerations

#### 3.1 Data Protection
- No sensitive data in graph names or thumbnails
- Option to exclude sensitive metadata from exports
- Clear data privacy warnings
- No automatic cloud sync without consent

#### 3.2 Data Integrity
- Checksums for stored data
- Backup before destructive operations
- Transaction-like saves (all or nothing)

## User Interface Changes

### 1. Navigation Bar Additions
```
File Menu:
- New Graph (Cmd/Ctrl + N)
- Open Graph... (Cmd/Ctrl + O)
- Save (Cmd/Ctrl + S)
- Save As...
- Import...
- Export...
- Recent Graphs >
```

### 2. Status Bar
- Current graph name (click to rename)
- Save status indicator
- Last saved timestamp
- Storage usage indicator

### 3. Dialogs/Modals

#### 3.1 Graph Manager Modal
- Grid of graph thumbnails
- Graph details on selection
- Actions: Open, Delete, Export
- Create new graph button

#### 3.2 Import Dialog
- Drag-and-drop zone
- File browser option
- Import preview
- Conflict resolution options

#### 3.3 Settings Panel
- Auto-save toggle and interval
- Storage management
- Clear all data option
- Export all graphs

## Success Metrics

1. **Technical Metrics**
   - Save/load operations < 500ms for average graphs
   - Zero data loss incidents
   - Storage efficiency > 80% (after compression)

2. **User Metrics**
   - 80% of users successfully save and load graphs
   - < 2% data corruption rate
   - 90% user satisfaction with save/load speed

3. **Engagement Metrics**
   - Average number of graphs per user: 2-3
   - Return rate after first save: > 60%
   - Auto-save adoption rate: > 70%

## Implementation Phases

### Phase 1: Core Persistence (Week 1-2)
- Basic save/load functionality for DocumentGraphModel
- Single graph support
- Manual save only (Cmd/Ctrl+S)
- LocalStorage implementation
- Preserve existing UI state in memory

### Phase 2: Multi-Graph Support (Week 3-4)
- Multiple named graphs with StoredGraph structure
- Graph manager UI with thumbnail grid
- Graph switching with state preservation
- Basic import/export of DocumentGraphModel
- UI state persistence (expanded nodes, positions)

### Phase 3: Enhanced Features (Week 5-6)
- Auto-save with debouncing
- Thumbnail generation from ReactFlow
- Storage quota management
- Settings persistence (AppSettings)
- Viewport state restoration

### Phase 4: Polish & Optimization (Week 7-8)
- Performance optimization
- Error handling improvements
- UI/UX refinements
- Comprehensive testing

## Future Considerations

### Migration to Cloud Storage
- Design storage format to be cloud-compatible
- Unique user IDs for future account system
- Sync conflict resolution strategy
- Progressive enhancement approach

### Advanced Features
- Collaborative editing preparation
- Version history/undo system
- Incremental sync capabilities
- Offline-first architecture

### Platform Expansion
- React Native storage compatibility
- Desktop app considerations
- Cross-device sync preparation

## Appendix

### A. Storage Limits
- localStorage: ~5-10MB per origin
- IndexedDB: ~50% of free disk space
- Recommended graph size: < 2MB

### B. Browser Support
- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

### C. Related Documents
- CLAUDE.md - Development guidelines
- project-vision.md - Overall product vision
- Technical Architecture Document (TBD)