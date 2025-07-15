# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Document Graph Visualization Application - a React-based interactive tool for managing and visualizing personal/family documents, assets, and relationships through a hierarchical graph interface. The application provides a spatial, intuitive way to organize and navigate life's important documents through an expandable network visualization.

## Development Commands

### Start Development Server
```bash
npm start
```
Runs the app in development mode at http://localhost:3000

### Build for Production
```bash
npm run build
```
Creates optimized production build in the `build/` folder

### Run Tests
```bash
npm test
```
Launches the test runner in interactive watch mode

### Environment Variables
Create a `.env` file in the project root with:
```bash
REACT_APP_GOOGLE_CLIENT_ID=your-client-id-here
REACT_APP_GOOGLE_API_KEY=your-api-key-here
```

## Architecture Overview

### Core Technologies
- **React 19.1.0** with TypeScript
- **ReactFlow 11.11.4** - Primary library for interactive node-graph visualization
- **Lucide React** - Icon library for entity type visualization
- **Tailwind CSS** - Utility-first styling with dark mode support
- **Create React App** - Build tooling and development setup
- **Puppeteer & Pixelmatch** - Visual testing infrastructure (dev dependencies)

### Component Structure
The application currently uses a **monolithic component architecture** with the main logic in `src/App.tsx` (1100+ lines). Key components include:

**Core Components:**
- `DocumentGraphApp` - Top-level wrapper providing ReactFlowProvider context
- `DocumentGraphInner` - Main application component containing graph logic and state
- `EntityNode` - Custom ReactFlow node component with:
  - Dynamic sizing based on hierarchy level
  - Icon assignment based on entity type/category
  - Hover tooltips with detailed information
  - Expansion/collapse indicators for nodes with children

**Supporting Components:**
- `DocumentViewer` - Lightweight document viewer supporting PDFs and images
- `DocumentViewerProvider` - Context provider for document viewing state
- `ErrorBoundary` - React error boundary with ResizeObserver error suppression

### Data Model Implementation

The application uses a **hierarchical node-edge graph model** defined in `src/data/model.ts`:

#### Entity Structure
```typescript
interface Entity {
  id: string;
  label: string;
  type: EntityType;        // 'person' | 'pet' | 'asset' | 'document' | 'folder'
  subtype?: EntitySubtype; // 'property' | 'vehicle' | 'financial' | etc.
  category?: DocumentCategory; // Detailed categorization for documents
  description?: string;
  expiry?: string;
  source?: string;
  level: number;           // 1-4 hierarchy level
  parentIds?: string[];    // References to parent entities
  hasChildren?: boolean;
  ownership?: OwnershipType; // 'individual' | 'shared'
  documentPath?: string;   // Path to actual document file
  documentType?: 'image' | 'pdf' | 'other';
  metadata?: TypeSpecificMetadata; // Rich metadata based on document type
}
```

#### Hierarchy Levels
- **Level 1**: Root entities (people) - Central nodes in the graph
- **Level 2**: Categories/folders per person (Identity, Health, Finance, etc.)
- **Level 3**: Subcategories (e.g., Health → GP, Vaccinations, Insurance)
- **Level 4**: Individual documents (e.g., specific passport, policy document)

#### Specialized Metadata
The model includes type-specific metadata interfaces:
- `PassportMetadata`: passport number, expiry date, country
- `VehicleMetadata`: make, model, year, VIN, registration
- `PropertyMetadata`: address, title number, purchase details
- `HealthMetadata`: clinic, doctor, date, type
- `FinancialMetadata`: bank, account details, balance
- `InsuranceMetadata`: provider, policy number, coverage type

#### Relationships
```typescript
interface EntityRelationship {
  id: string;
  source: string;  // Entity ID
  target: string;  // Entity ID
  type?: string;
  label?: string;
}
```

### Graph Layout Algorithm

The application implements a **sophisticated radial/circular auto-layout algorithm** in `App.tsx`:

#### Layout Strategy by Level
1. **Level 1 (People)**: 
   - Positioned at center (400, 300)
   - Multiple people offset by ±100px horizontally

2. **Level 2 (Categories)**:
   - Arranged in a circle around center
   - Radius: 250px
   - Equal angular distribution (2π / node count)

3. **Level 3 (Subcategories)**:
   - Positioned relative to parent nodes
   - Radius: 200px from parent
   - Angular spread based on sibling count
   - Maximum spread angle: π/3 radians

4. **Level 4 (Documents)**:
   - Linear horizontal distribution
   - Positioned 150px below parent
   - Spacing: 120px between siblings
   - Aligned perpendicular to grandparent-parent vector

#### Manual Positioning
- Nodes can be manually dragged to custom positions
- Manual positions are preserved during re-layouts
- `isManuallyPositioned` flag tracks user modifications

### State Management
The application uses **React local state** with ReactFlow's specialized hooks:

- `useNodesState` & `useEdgesState` - ReactFlow state management
- `allNodesData` - Complete dataset including hidden nodes
- `nodes` - Filtered view based on expansion state
- `expandedNodes` - Set tracking which nodes are expanded
- `tooltipState` - Global tooltip display state
- No external state management library (Redux, MobX, etc.)

### Data Service Architecture

The `DataService` class (`src/services/dataService.ts`) provides a centralized interface for data operations:

**Key Methods:**
- `entitiesToNodes()` - Converts entities to ReactFlow nodes
- `relationshipsToEdges()` - Converts relationships to ReactFlow edges
- `getVisibleEntities()` - Filters entities based on expansion state
- `getChildren()` / `getAllDescendantIds()` - Hierarchical navigation
- `searchEntities()` - Text-based entity search
- `getMetadataDisplay()` - Formats metadata for display

The service uses a singleton pattern and supports both basic and expanded sample datasets.

## Implemented Features

### 1. Interactive Graph Visualization
- **Expandable/Collapsible Nodes**: Click nodes to reveal/hide children
- **Drag & Drop**: Manual node positioning with persistence
- **Zoom & Pan**: Full canvas navigation with minimap
- **Auto-Layout**: Intelligent radial layout algorithm
- **Visual Hierarchy**: Node sizes decrease with depth levels

### 2. Document Viewer
- **Lightweight Viewer**: Built-in component for PDFs and images
- **Blob-based Loading**: Secure document fetching mechanism
- **Zoom Controls**: +/- buttons and keyboard shortcuts
- **Rotation**: 90-degree rotation for images
- **Download**: Direct file download capability
- **Error Handling**: Graceful fallbacks for unsupported formats

### 3. Search Functionality
- **Real-time Filtering**: Instant results as you type
- **Multi-field Search**: Searches both labels and descriptions
- **Edge Preservation**: Maintains graph connectivity during search
- **Visual Feedback**: Filtered nodes remain connected

### 4. Node Management
- **Add Node Modal**: Create new entities with type selection
- **File Upload**: Placeholder for document upload functionality
- **Reset Canvas**: Return to default layout
- **Metadata Display**: Rich tooltips showing entity details

### 5. Visual Design
- **Dark/Light Themes**: Toggle between color schemes
- **Dynamic Icons**: 30+ icons mapped to entity types/categories
- **Color Coding**: Different colors for different entity types
- **Gradient Backgrounds**: Subtle visual depth
- **Backdrop Blur Effects**: Modern glass morphism UI

### 6. Error Handling
- **ResizeObserver Suppression**: Prevents ReactFlow console spam
- **Error Boundary**: Catches and displays React errors gracefully
- **Global Error Handlers**: Window-level error interception
- **Debounced Callbacks**: Prevents performance issues

### 7. Tooltips System
- **Hover Activation**: 500ms delay before showing
- **Smart Positioning**: Follows mouse with offset
- **Rich Content**: Shows description, metadata, expiry dates
- **Portal Rendering**: Renders above all other content
- **Distance-based Hiding**: Hides when mouse moves away

## Sample Data

The application includes two JSON datasets in `src/data/`:

1. **sampleData.json**: Basic family structure with minimal documents
2. **expandedSampleData.json**: Comprehensive dataset featuring:
   - The Thebault family (Brett, Gemma, Freya, Anya)
   - Multiple document categories per person
   - Rich metadata for various document types
   - Shared assets (Tesla vehicles, family home)
   - Individual and shared ownership indicators

## Project Vision & Direction

### High-Level Intent
The Document Graph is envisioned as a **"digital life filing cabinet"** - a beautiful, relational, and intelligent way to organize life's important documents. It aims to make it easier for people to keep track of family, assets, responsibilities, and deadlines in one spatial, intuitive interface.

### Core Concept
The application provides a **2D, zoomable infinite canvas** where users build a visual representation of their personal records. Starting from either an individual or family entity, the graph branches outward to show:
- Family members and pets
- Assets (vehicles, homes)
- Document categories (health, finance, education)
- Individual documents and records

### Future Direction
The vision includes several advanced features not yet implemented:
- **AI Document Processing**: Automatic metadata extraction from uploaded documents
- **Smart Ingestion**: Import from email accounts, scanned photos
- **Auto-Reminders**: Notifications for document renewals
- **Cloud Storage Integration**: Connect to Google Drive, Dropbox, OneDrive
- **Multi-tenant Architecture**: Family accounts with role-based access
- **Secure Sharing**: Share graphs or sub-graphs with family members
- **Offline-First Design**: Work without internet connectivity

For the complete vision and roadmap, see `project-vision.md`.

## Development Considerations

### Current State
- The application is in active development with core visualization features complete
- Using hardcoded sample data (no backend/persistence)
- Monolithic architecture suitable for rapid prototyping
- Focus on user experience and visual design

### Technical Debt
- Single large component file (App.tsx) needs refactoring
- No tests implemented yet
- No data persistence layer
- Limited error handling for edge cases

### Next Steps for Production
- Extract components for better maintainability
- Implement data persistence (local storage → backend API)
- Add authentication and user management
- Build document upload and processing pipeline
- Create comprehensive test suite
- **Migrate to standalone data model** (see src/data/standalone-model-spec.md)

### Standalone Data Model (Implemented)
The project has successfully transitioned to a platform-agnostic data model that:
- Works independently of ReactFlow or any UI framework
- Supports secure document references via Google Drive
- Includes pre-computed search indices for offline functionality
- Provides built-in change tracking and audit trails
- Enables the same data to be consumed by web, mobile, and CLI tools

**Key Implementation Files:**
- `src/data/standalone-model.ts` - Core type definitions with Google Drive support
- `src/data/standalone-model-implementation.ts` - Full implementation with CRUD, search, validation
- `src/data/google-drive-types.ts` - Comprehensive Google Drive integration types
- `src/data/migration-utils.ts` - Automated migration from old to new format
- `src/services/standaloneDataService.ts` - New service using standalone model
- `src/services/dataService-adapter.ts` - Backward compatibility adapter
- `src/config/app-config.ts` - Centralized configuration (domain: lifemap.au)

**Current Status:**
- ✅ App is running with the new standalone model
- ✅ Single line change in App.tsx to switch models
- ✅ All existing UI functionality preserved
- ✅ TypeScript compilation issues resolved
- 🔄 Google Drive authentication pending (see GOOGLE-DRIVE-IMPLEMENTATION-PLAN.md)

### Important TypeScript Considerations
When using Create React App with `--isolatedModules`:
- Use `export type` for type-only exports
- Use `import type` when importing types
- For partial nested objects, use DeepPartial type helper
- Use Array.from() instead of spread operator with Sets for ES compatibility

### Data Model Migration
The app automatically migrates from the old format to the new standalone model:
1. On first load, `StandaloneDataService` detects old data
2. `DataMigration` utility converts entities and relationships
3. Documents are prepared for Google Drive (with placeholder IDs)
4. The UI continues working through the adapter layer

### Google Drive Integration (Phases 1-6 Complete ✅)
See `GOOGLE-DRIVE-IMPLEMENTATION-PLAN.md` for detailed implementation steps:
- ✅ **Phase 1**: API setup complete (packages installed, .env configured)
- ✅ **Phase 2**: Authentication services implemented
  - `googleAuthService.ts` - OAuth2 flow and token management
  - `googleDriveService.ts` - Drive API operations (folders, files, sync)
- ✅ **Phase 3-4**: Authentication flow integrated
  - `AuthContext.tsx` - Global auth state management
  - `AuthGate.tsx` - Authentication guard component
- ✅ **Phase 5**: Data synchronization implemented
  - `googleDriveDataService.ts` - Auto-sync with 30-second debouncing
  - `SyncStatusIndicator.tsx` - Visual sync status
- ✅ **Phase 6**: Document organization implemented
  - `documentOrganizerService.ts` - Person folder management
  - Automatic folder creation for each person + Household
  - Document upload/download integration

**Current Architecture**:
```
App.tsx
└── AuthProvider (contexts/AuthContext.tsx)
    └── AuthGate (components/AuthGate.tsx)
        └── DocumentGraphApp
            ├── Uses dataService-adapter.ts
            ├── Which uses GoogleDriveDataService (when authenticated)
            └── Document operations use documentOrganizerService
```

**Key Files for Google Drive**:
- `/src/services/googleAuthService.ts` - Authentication management
- `/src/services/googleDriveService.ts` - Core Drive API operations
- `/src/services/googleDriveDataService.ts` - Data sync service
- `/src/services/documentOrganizerService.ts` - Document folder management
- `/src/components/DocumentViewer.tsx` - Updated to download from Drive
- `/src/App.tsx` - Updated handleFileUpload for Drive uploads

**Testing**: 
- Browser console: `testGoogleServices.runAll()`
- Check auth: `googleAuthService.isAuthenticated()`
- Manual sync: `dataService.saveChanges()`

### Google Drive API Integration Learnings

When working with Google Drive API, these critical lessons were learned through extensive debugging:

#### 1. **Use Different Endpoints for Different Operations**
- **Upload endpoint** (`https://www.googleapis.com/upload/drive/v3`): Use ONLY for uploading content with `uploadType=media`
- **Regular endpoint** (`https://www.googleapis.com/drive/v3`): Use for everything else including:
  - Creating file metadata (POST without uploadType)
  - Downloading files (GET with alt=media)
  - All other metadata operations

#### 2. **Avoid Multipart Upload for JSON Content**
- Google Drive API unexpectedly parses JSON content even with `uploadType=media`
- This causes "Invalid JSON payload" errors if your JSON contains fields that conflict with Drive's File resource schema (e.g., `version`, `id`)
- Solution: Use two-step approach: create metadata first, then update content

#### 3. **Two-Step File Creation Pattern**
```typescript
// Step 1: Create empty file with metadata
const response = await fetch('https://www.googleapis.com/drive/v3/files', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ name, mimeType, parents })
});

// Step 2: Update content with PATCH
const updateResponse = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
  method: 'PATCH',
  headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: jsonContent
});
```

#### 4. **Common Pitfalls**
- ❌ Don't use FormData for JSON uploads - it creates wrong Content-Type
- ❌ Don't use PUT for content updates - use PATCH
- ❌ Don't manually construct multipart bodies - they're error-prone
- ❌ Don't use base64 encoding - it adds complexity without solving the core issues

#### 5. **Authentication with Google Identity Services**
- The new library uses token-based auth, not session-based
- Tokens must be manually refreshed before expiry
- Store tokens in localStorage for persistence
- Always check token expiry before API calls

### Phase 4 & 5 Implementation Learnings

When implementing authentication flow and data synchronization with Google Drive:

#### 1. **Architecture Pattern: AuthProvider + AuthGate**
- Use React Context (AuthProvider) for global auth state management
- AuthGate component acts as a guard that blocks app access until authenticated
- This pattern cleanly separates auth concerns from business logic
- Place AuthProvider high in component tree but inside ErrorBoundary

#### 2. **Data Service Architecture**
- Create a service that extends the base data service for Drive-specific operations
- Use dependency injection pattern: check auth status to decide which service to instantiate
- Keep the adapter pattern to maintain backward compatibility with existing UI code
- Make the base service's `model` property `protected` (not private) to allow extension

#### 3. **Auto-Save Implementation**
- Debounce saves to avoid excessive API calls (30 seconds works well)
- Track actual changes by comparing serialized data to avoid unnecessary saves
- Override data mutation methods (addEntity, updateEntity, etc.) to trigger auto-save
- Save UI state changes (node positions, expansion state) separately from data changes

#### 4. **Sync Status Management**
- Create a dedicated sync status type with clear states (syncing, synced, error, pending)
- Use observer pattern for sync status updates
- Show sync status in UI but keep it non-intrusive
- Provide manual sync option for user control

#### 5. **Data Migration Strategy**
- Check for existing Drive data first, migrate sample data only if empty
- Use async migration but handle synchronously for initial load (improve with progress UI later)
- Cache migrated data locally immediately
- Keep migration tool separate from service for reusability

#### 6. **TypeScript Gotchas**
- DocumentGraphModel's internal structure needs careful handling
- Use `toJSON()` and `JSON.parse()` to get proper StandaloneDocumentGraph type
- Be careful with property access - use proper methods instead of direct property access
- Type guards help when dealing with service polymorphism

#### 7. **Local Caching Strategy**
- Cache both data and metadata (lastModified, lastSyncTime)
- Load from cache first for fast startup, then sync in background
- Handle cache failures gracefully - don't block app startup
- Clear cache on sign out for security

#### 8. **Error Handling Best Practices**
- Don't fail auth if folder creation fails - user can work offline
- Show sync errors in UI but don't block user actions
- Implement retry logic for transient failures
- Log errors for debugging but keep user messages simple

#### 9. **Component Integration**
- Add auth/sync features incrementally to existing components
- Use existing component callbacks (onNodeDragStop, etc.) to trigger saves
- Keep sync logic in services, not components
- Make components sync-agnostic where possible

### Phase 6: Document Organization Implementation Learnings

When implementing document organization with person-specific folders in Google Drive:

#### 1. **Service Architecture for Folder Management**
- Create dedicated service (DocumentOrganizerService) for folder operations
- Cache folder IDs to avoid repeated API calls
- Initialize folders once during app startup, not on every upload
- Handle "Household" folder for shared documents gracefully

#### 2. **Person Folder Mapping Strategy**
- Extract person entities from data model during initialization
- Walk up entity hierarchy to find document ownership
- Default to "Household" for documents without clear ownership
- Store person name with folder ID for efficient lookups

#### 3. **Document Upload Flow**
- Show upload progress immediately in UI (optimistic updates)
- Upload file first, then update entity with Drive metadata
- Include full Google Drive metadata in entity for future reference
- Trigger auto-save after successful upload to persist changes

#### 4. **Document Download Integration**
- Check for `google-drive://` prefix in document paths
- Fall back to checking entity.documents[0].googleDriveMetadata
- Handle authentication errors gracefully
- Use blob URLs for consistent viewer experience

#### 5. **TypeScript Considerations**
- Google Drive File interface is minimal - avoid adding custom fields
- Use type guards when checking for Drive-specific properties
- Entity types may need updates to support documents array
- Service instanceof checks help with polymorphic behavior

#### 6. **Error Handling Patterns**
- Don't fail initialization if folder creation fails
- Show upload errors in UI but don't block other operations
- Provide fallback behavior for non-authenticated users
- Log detailed errors for debugging while keeping user messages simple

#### 7. **UI/UX Best Practices**
- Update document description to show target folder
- Display upload progress inline with document creation
- Keep existing node creation flow, enhance with Drive features
- Show sync status without interrupting user workflow

#### 8. **Folder Structure**
```
Google Drive/
└── lifemap-data/
    ├── data-model/
    │   └── document-graph.json
    └── documents/
        ├── Brett Thebault/
        ├── Gemma Thebault/
        ├── Freya Thebault/
        ├── Anya Thebault/
        └── Household/
```

#### 9. **Migration Considerations**
- Sample data document paths need updating to Drive references
- Create placeholder references during migration
- Track documents needing manual upload
- Consider bulk upload UI for existing documents

### Critical Implementation Notes

#### Authentication Required on App Load
The app now requires Google Drive authentication before use. This is enforced by the AuthGate component wrapping the entire app. To disable this for development:
- Change `<AuthGate requireAuth={true}>` to `requireAuth={false}` in App.tsx
- Or remove AuthProvider/AuthGate wrappers temporarily

#### Data Service Selection
The dataService-adapter automatically selects the appropriate service:
- Authenticated: Uses GoogleDriveDataService with auto-sync
- Not authenticated: Falls back to StandaloneDataService with sample data

#### Document Upload Behavior
When uploading documents:
1. File uploads immediately to Google Drive
2. Node shows upload progress in description
3. Document is placed in appropriate person folder
4. Entity is updated with full Drive metadata
5. Auto-save triggers to persist the change

#### Folder Structure Initialization
Person folders are created automatically on first authentication:
- Happens during GoogleDriveDataService.initialize()
- Creates folders for all person entities in the data model
- Adds a "Household" folder for shared documents
- Cached to avoid repeated API calls

#### Document Path Formats
The app supports multiple document path formats:
- `google-drive://fileId` - New Drive reference format
- `/documents/...` - Legacy local path format
- `https://drive.google.com/...` - Direct Drive URLs
- DocumentViewer handles all formats transparently