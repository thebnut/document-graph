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