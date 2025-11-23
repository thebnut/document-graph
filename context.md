# LifeMap - Project Context & Current State

**Last Updated:** 2025-11-23
**Current Phase:** Phase 2 Refactoring Complete + Build Configured
**Status:** Production-ready build, modular architecture (App.tsx: 1,195 → 56 lines), comprehensive test coverage (198 tests passing)

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture & Structure](#architecture--structure)
4. [Key Features](#key-features)
5. [Development State](#development-state)
6. [Development Setup](#development-setup)
7. [Code Conventions](#code-conventions)
8. [Technical Debt](#technical-debt)
9. [Key Files Reference](#key-files-reference)
10. [Next Steps](#next-steps)

---

## Project Overview

### What is LifeMap?

**Domain:** lifemap.au

LifeMap is a sophisticated personal/family document management system that provides a visual, graph-based interface for organizing, exploring, and managing life's important documents. Unlike traditional file systems or folder hierarchies, LifeMap presents documents as an interactive 2D network graph where relationships and ownership are visually explicit.

### Problem It Solves

- **Information Fragmentation**: Important documents scattered across email, cloud storage, and physical locations
- **Relationship Complexity**: Hard to track document relationships (e.g., which insurance covers which vehicle for which person)
- **Temporal Management**: Difficulty remembering and tracking document expiry dates, renewals, and deadlines
- **Family Coordination**: Challenges sharing and managing documents across family members
- **Discovery**: Difficult to find specific documents when needed

### Core Value Proposition

A "digital life filing cabinet" that makes it easier for individuals and families to organize, find, and manage personal documents through spatial visualization, AI-powered intelligence, and secure cloud storage.

### Current Status

- ✅ **Phase 7 Complete** - AI document analysis with GPT-4 Vision
- ✅ **Phase 2 Refactoring Complete** - App.tsx reduced from 1,195 → 56 lines
- ✅ **Build System Fixed** - Custom build script for Node.js v25+ localStorage compatibility
- ✅ **Test Coverage Complete** - 12 test suites, 198 passing tests
  - Service layer: 100% coverage (utilities, hooks)
  - Component layer: 75-100% coverage
  - Total coverage: >70% across all tested modules
- ✅ Functional prototype with Google Drive integration
- ✅ Bulk upload with intelligent AI placement
- ✅ Modular architecture with custom hooks and components
- ✅ Clean separation of concerns (utilities, components, hooks)
- 🎯 **Ready for Vercel deployment**

---

## Technology Stack

### Frontend Framework
- **React 19.1.0** (latest) with TypeScript 4.9.5
- **Create React App 5.0.1** - Development tooling and build system
- **React Hooks** - Modern functional component patterns throughout

### Graph Visualization
- **ReactFlow 11.11.4** - Interactive node-graph visualization
  - Drag-and-drop, zoom/pan, minimap
  - Custom node components with extensible data model
  - Edge rendering with visual distinction

### UI & Styling
- **Tailwind CSS 3.4.17** - Utility-first CSS framework
  - Dark mode support via `class` strategy
  - Custom theme extensions
  - Responsive design
- **Lucide React 0.523.0** - Icon library
  - 30+ icons mapped to entity types (User, Home, Car, FileText, Heart, Shield, etc.)

### Cloud Storage & Authentication
- **Google Identity Services** - OAuth2 authentication
- **Google Drive API v3** - Document storage and synchronization
- **gapi-script 1.2.0** - Google API integration utilities

### AI & Machine Learning
- **OpenAI 4.104.0** - GPT-4 Vision API integration
  - Multimodal document analysis (images + PDFs)
  - Intelligent metadata extraction
  - Smart document placement decisions

### Data Visualization
- **d3-hierarchy 3.1.2** - Hierarchical layout algorithms
  - Radial/circular layout for multi-level trees

### Testing
- **Jest** - Unit and integration testing framework
- **@testing-library/react 16.3.0**
- **Puppeteer 24.11.1** - Visual regression testing

### Development Tools
- **TypeScript 4.9.5** - Type safety with strict mode
- **ESLint** - Code quality (react-app config)
- **ts-node 10.9.2** - TypeScript execution for scripts
- **Autoprefixer + PostCSS** - CSS processing

### Key Dependencies
```json
{
  "@react-oauth/google": "^0.12.2",
  "openai": "^4.104.0",
  "reactflow": "^11.11.4",
  "lucide-react": "^0.523.0",
  "d3-hierarchy": "^3.1.2",
  "gapi-script": "^1.2.0",
  "tailwindcss": "^3.4.17"
}
```

---

## Architecture & Structure

### Project Organization
```
document-graph/
├── src/
│   ├── App.tsx                           # Main application (56 lines - REFACTORED!)
│   ├── index.tsx                         # Entry point
│   ├── components/                       # UI components (18 files)
│   │   ├── DocumentGraphInner.tsx        # Main orchestration component (268 lines)
│   │   ├── ErrorBoundary.tsx             # Error boundary with ResizeObserver filtering
│   │   ├── AuthGate.tsx                  # Authentication guard
│   │   ├── BulkUploadModal.tsx           # AI-powered bulk upload
│   │   ├── DocumentViewer.tsx            # PDF/image viewer
│   │   ├── GoogleDriveAuth.tsx           # Auth UI
│   │   ├── SyncStatusIndicator.tsx       # Sync status display
│   │   ├── nodes/                        # Custom ReactFlow nodes
│   │   │   └── EntityNode.tsx            # Entity node component (76 lines)
│   │   ├── panels/                       # Panel components
│   │   │   └── ControlsPanel.tsx         # Top control panel (104 lines)
│   │   ├── modals/                       # Modal components
│   │   │   └── AddNodeModal.tsx          # Add node modal (114 lines)
│   │   └── overlays/                     # Overlay components
│   │       └── TooltipPortal.tsx         # Portal-rendered tooltip (108 lines)
│   ├── hooks/                            # Custom React hooks (6 files) **NEW**
│   │   ├── useLayout.ts                  # Layout engine management
│   │   ├── useGraphData.ts               # Graph state (nodes, edges, expansion)
│   │   ├── useTooltip.ts                 # Tooltip state and handlers
│   │   ├── useSearch.ts                  # Search query and filtering
│   │   ├── useNodeActions.ts             # Node interactions
│   │   └── useDocuments.ts               # Document uploads
│   ├── types/                            # Type definitions **NEW**
│   │   └── tooltip.ts                    # TooltipState interface
│   ├── contexts/                         # React Context providers (2 files)
│   │   ├── AuthContext.tsx               # Global auth state
│   │   └── DocumentViewerContext.tsx     # Document viewer state
│   ├── services/                         # Business logic layer (10 files)
│   │   ├── dataService.ts                # Original data service
│   │   ├── dataService-adapter.ts        # Adapter for new model
│   │   ├── standaloneDataService.ts      # Platform-agnostic service
│   │   ├── googleDriveDataService.ts     # Drive sync service
│   │   ├── googleAuthService.ts          # OAuth management
│   │   ├── googleDriveService.ts         # Drive API operations
│   │   ├── documentOrganizerService.ts   # Folder management
│   │   ├── documentAnalysisService.ts    # AI document analysis
│   │   ├── documentPlacementService.ts   # AI placement
│   │   └── d3RadialLayoutEngine.ts       # Layout algorithms
│   ├── data/                             # Data models and sample data (14 files)
│   │   ├── model.ts                      # Original data types
│   │   ├── standalone-model.ts           # New platform-agnostic model
│   │   ├── standalone-model-implementation.ts
│   │   ├── google-drive-types.ts         # Drive integration types
│   │   ├── migration-utils.ts            # Old → new migration
│   │   ├── sampleData.json               # Basic sample
│   │   ├── expandedSampleData.json       # Comprehensive sample
│   │   └── documents/                    # Sample document files
│   ├── config/                           # Configuration (3 files)
│   │   ├── app-config.ts                 # Application settings
│   │   ├── ai-config.ts                  # OpenAI configuration
│   │   └── nodeTypes.tsx                 # ReactFlow node types config **NEW**
│   ├── utils/                            # Utility functions (10 files)
│   │   ├── resizeObserverFix.ts          # ResizeObserver error suppression **NEW**
│   │   ├── iconMapper.tsx                # Icon selection logic **NEW**
│   │   ├── colorMapper.ts                # Node color gradients **NEW**
│   │   ├── sizeMapper.ts                 # Node sizing logic **NEW**
│   │   ├── testAIServices.ts             # Browser console tests
│   │   ├── googleServiceTest.ts          # Drive testing utilities
│   │   └── ...
│   └── test-utils/                       # Testing utilities (3 files)
│       ├── mockFactories.ts              # Test data factories
│       ├── testHelpers.ts                # Test helper functions
│       └── renderHelpers.tsx             # React testing utilities
├── public/                               # Static assets
├── visual-testing/                       # Puppeteer testing framework
├── docs/                                 # Implementation documentation
├── product-requirements/                 # Feature specifications
└── node_modules/                         # 557MB of dependencies
```

### Architecture Patterns

**1. Service Layer Architecture**
- Clear separation: UI → Services → Data
- Singleton pattern for service instances
- Adapter pattern for data model migration
- Observer pattern for state changes (auth, sync)

**2. Data Model Evolution**
- **Old Model**: ReactFlow-coupled entities and relationships
- **New Model**: Platform-agnostic StandaloneDocumentGraph
- **Migration Strategy**: Automatic conversion on first load with backward compatibility

**3. Authentication Flow**
```
App.tsx
  └── AuthProvider (global auth state)
      └── AuthGate (authentication guard)
          └── DocumentGraphApp (main UI)
              ├── ReactFlowProvider (graph context)
              └── DocumentViewerProvider (viewer context)
```

**4. Data Service Selection**
```typescript
if (googleAuthService.isAuthenticated()) {
  service = GoogleDriveDataService.getInstance();
  // Auto-sync, cloud storage, person folders
} else {
  service = StandaloneDataService;
  // Local sample data, no persistence
}
```

**5. Component Communication**
- React Context for global state (Auth, DocumentViewer)
- Service layer for business logic
- Props for component communication
- Event callbacks for user interactions

### Hierarchical Data Model

```
Level 1: People (Brett, Gemma, Freya, Anya)
    ↓
Level 2: Categories (Identity, Health, Finance) + Assets (Vehicles, Properties)
    ↓
Level 3: Subcategories (Passports, GP records, Bank accounts)
    ↓
Level 4: Individual Documents (Passport.pdf, Insurance policy.pdf)
```

---

## Key Features

### 1. Interactive Graph Visualization ✅
- 2D infinite canvas with ReactFlow
- Zoom, pan, and drag-and-drop node positioning
- Expandable/collapsible hierarchical nodes
- Visual hierarchy through node sizing (decreases with level)
- Minimap for navigation
- Edge types: solid (primary), dotted (secondary)
- Manual positioning with persistence
- Auto-layout using radial/circular algorithms

### 2. Document Management ✅

**Built-in Document Viewer:**
- PDF rendering
- Image display (JPEG, PNG, WebP)
- Zoom controls (+/-)
- 90-degree rotation
- Direct download
- Error handling for unsupported formats

**Google Drive Integration:**
- Organized folder structure per person + "Household"
- Automatic folder creation
- Document upload with progress tracking
- Metadata preservation
- Blob-based secure loading
- Reference format: `google-drive://[fileId]`

### 3. AI-Powered Document Analysis ✅ (Phase 7)

**Bulk Upload Modal:**
- Drag-and-drop interface
- Multi-file support (max 20MB per file)
- Supported formats: JPEG, PNG, WebP, PDF
- Real-time progress tracking

**Document Analysis Service:**
- GPT-4 Vision multimodal analysis
- Flexible metadata extraction (no schema)
- Single-sentence summaries
- Document type classification
- Confidence scoring (0-100)

**Intelligent Placement:**
- Analyzes document graph structure
- Determines optimal node placement
- Creates intermediate folders as needed
- Provides reasoning for decisions

**Example AI Analysis:**
```json
{
  "summary": "The passport for Brett Thebault",
  "documentType": "passport",
  "extractedData": {
    "holder": {
      "fullName": "Brett Thebault",
      "dateOfBirth": "1985-03-15"
    },
    "document": {
      "number": "PA1234567",
      "expiryDate": "2030-06-15"
    }
  },
  "confidence": 95
}
```

### 4. Search & Discovery ✅
- Real-time text search across entities
- Multi-field searching (labels, descriptions)
- Graph filtering while preserving connectivity
- Visual feedback for matches

### 5. Authentication & Security ✅
- Google OAuth2 authentication
- Token management with automatic refresh
- Session persistence via localStorage
- Secure token storage
- Two-factor authentication support (configured)

### 6. Data Synchronization ✅
- Auto-save to Google Drive (30-second debounce)
- Local caching for offline access
- Change detection to avoid unnecessary saves
- Sync status indicator in UI
- Manual sync option
- Conflict resolution strategies

### 7. Visual Design ✅
- Dark/Light theme toggle
- Glass morphism effects (backdrop blur)
- Gradient backgrounds
- Color coding by entity type
- Dynamic icon mapping (30+ icons)
- Responsive tooltips with rich metadata
- Portal-rendered tooltips for z-index control

### 8. Node Management ✅
- Add new entities via modal
- File upload integration
- Delete entities
- Update entity properties
- Reset canvas to default layout
- Manual position override

### 9. Error Handling ✅
- Global error boundary
- ResizeObserver error suppression
- Graceful fallbacks for failures
- User-friendly error messages
- Detailed console logging for debugging

---

## Development State

### Phase Timeline

1. ✅ **Phase 1**: Google Cloud Setup
2. ✅ **Phase 2**: Authentication Services
3. ✅ **Phase 3-4**: Authentication Flow
4. ✅ **Phase 5**: Data Synchronization
5. ✅ **Phase 6**: Document Organization
6. ✅ **Phase 7**: AI Document Analysis
7. ⏭️  **Phase 8**: Backend & Multi-tenancy (planned)
8. ⏭️  **Phase 9**: Email Integration (planned)
9. ⏭️  **Phase 10**: Reminders & Notifications (planned)
10. ⏭️  **Phase 11**: Mobile App (planned)

### What's Complete

- ✅ Interactive graph visualization with ReactFlow
- ✅ Hierarchical data model with 4 levels
- ✅ Google Drive authentication and storage
- ✅ Person-based folder organization
- ✅ Document viewer for PDFs and images
- ✅ Search functionality
- ✅ Dark/light themes
- ✅ Auto-save with debouncing
- ✅ Local caching for offline use
- ✅ AI-powered document analysis
- ✅ Bulk upload with intelligent placement
- ✅ Manual node positioning
- ✅ Expandable/collapsible nodes
- ✅ Sync status indicator
- ✅ Error boundaries and error handling
- ✅ **Code refactoring - App.tsx from 1,195 → 56 lines**
- ✅ **Custom hooks for state management**
- ✅ **Modular component architecture**
- ✅ **Comprehensive test coverage (198 tests, >70% coverage)**
- ✅ **Production build configuration (Node.js v25+ compatible)**

### What's Pending

- 🎯 **Vercel deployment** (next priority - see [vercel-deployment.md](vercel-deployment.md))
- ⏳ Backend API (currently using Google Drive as backend)
- ⏳ Multi-user collaboration
- ⏳ Real-time updates
- ⏳ Email ingestion (Gmail scanning)
- ⏳ Document discovery service
- ⏳ Automated reminders for expiry dates
- ⏳ Mobile app (web only)
- ⏳ Offline-first architecture (has offline cache)
- ⏳ Advanced access control
- ⏳ Audit logging
- ⏳ Export/import functionality
- ⏳ Document versioning
- ⏳ Production monitoring & analytics

---

## Development Setup

### Prerequisites
- Node.js 16+ (using ES2015 target)
- npm or yarn
- Google Cloud Project with Drive API enabled
- OpenAI API key (for AI features)

### Environment Variables (.env)
```bash
GENERATE_SOURCEMAP=false
REACT_APP_GOOGLE_CLIENT_ID=your-client-id
REACT_APP_GOOGLE_API_KEY=your-api-key
REACT_APP_OPENAI_API_KEY=your-openai-key
```

### Installation
```bash
cd document-graph
npm install
```

### Development Scripts
```bash
npm start              # Dev server on :3000
npm run build          # Production build (custom script with localStorage support)
npm test               # Jest test runner (198 tests)
npm run test:coverage  # Jest with coverage report
npm run visual:test    # Puppeteer visual tests
npm run visual:screenshot   # Take screenshots
npm run visual:baseline     # Set baseline images
```

**Note:** Build uses custom [scripts/build.js](scripts/build.js) to provide `--localstorage-file` for Node.js v25+ compatibility.

### Running the Application
```bash
npm start
# Opens http://localhost:3000
# Requires Google authentication
# Loads from Google Drive or sample data
```

### Testing in Browser Console
```javascript
// Test Google services
testGoogleServices.runAll()

// Test AI services
testAIServices.isConfigured()
testAIServices.analyzeFile(file)
```

### Build Configuration

**TypeScript:**
- Target: ES5
- Strict mode enabled
- Isolated modules (CRA requirement)
- JSX: react-jsx (new transform)

**Tailwind:**
- Dark mode: class-based
- Content: all src/**/*.{js,jsx,ts,tsx}
- No custom plugins

---

## Code Conventions

### TypeScript Patterns

**1. Type-only Exports/Imports**
```typescript
// Use export type for isolatedModules
export type EntityType = 'person' | 'pet' | 'asset' | 'document' | 'folder';

// Use import type when importing types only
import type { Entity } from './data/model';
```

**2. Naming Conventions**
- **Components**: PascalCase (`BulkUploadModal.tsx`)
- **Services**: camelCase singletons (`googleAuthService`)
- **Files**: kebab-case for utilities, PascalCase for components
- **Interfaces**: Descriptive names without "I" prefix
- **Types**: Descriptive with `Type` suffix for unions

**3. Component Pattern**
```typescript
interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDocumentsAdded?: (count: number) => void;
  darkMode?: boolean;
}

export const BulkUploadModal: React.FC<BulkUploadModalProps> = ({
  isOpen,
  onClose,
  onDocumentsAdded,
  darkMode = false
}) => {
  // Early returns for loading/error states
  if (!isOpen) return null;

  // Implementation
};
```

**4. Service Pattern (Singleton)**
```typescript
export class GoogleAuthService {
  private static instance: GoogleAuthService;

  private constructor() {}

  static getInstance(): GoogleAuthService {
    if (!GoogleAuthService.instance) {
      GoogleAuthService.instance = new GoogleAuthService();
    }
    return GoogleAuthService.instance;
  }

  async signIn(): Promise<void> {
    // Implementation
  }
}

export const googleAuthService = GoogleAuthService.getInstance();
```

**5. Import Organization**
```typescript
// 1. External libraries
import React from 'react';
import { Node, Edge } from 'reactflow';

// 2. Internal modules
import { dataService } from './services/dataService-adapter';

// 3. Types
import type { Entity } from './data/model';

// 4. Styles
import './App.css';
```

### Design Patterns Used

1. **Adapter Pattern** - `dataService-adapter.ts` wraps new model for backward compatibility
2. **Strategy Pattern** - Different data services based on auth state
3. **Observer Pattern** - Auth/sync state change listeners
4. **Singleton Pattern** - All service classes
5. **Factory Pattern** - Entity/Node/Edge creation
6. **Provider Pattern** - React Context for global state

### File Organization

- Components in `/components`
- Services in `/services`
- Data models in `/data`
- Utilities in `/utils`
- Configuration in `/config`
- Contexts in `/contexts`
- Co-located types with implementations

---

## Technical Debt

### Recently Resolved ✅

**1. Monolithic App.tsx (RESOLVED)**
- **Was**: 1,195 lines of monolithic code
- **Now**: 56 lines with clean provider composition
- **Refactored Into**:
  - 6 custom hooks (useLayout, useGraphData, useTooltip, useSearch, useNodeActions, useDocuments)
  - 5 components (ErrorBoundary, EntityNode, TooltipPortal, AddNodeModal, ControlsPanel)
  - 4 utilities (iconMapper, colorMapper, sizeMapper, resizeObserverFix)
  - 1 orchestration component (DocumentGraphInner - 268 lines)
- **Impact**: ✅ Dramatically improved maintainability, testability, and code organization

### Remaining Issues

**1. ~~Limited Test Coverage~~ ✅ RESOLVED**
- **Was**: 60/85 tests passing (71% service layer)
- **Now**: 198 tests passing, >70% coverage across 12 test suites
- **Covered**: All utilities (100%), all hooks (96-100%), all tested components (75-100%)
- **Impact**: ✅ High confidence in code quality and stability

**2. Large Bundle Size**
- **Impact**: 557MB node_modules, slower install/build
- **Priority**: MEDIUM
- **Recommended Action**: Audit dependencies, lazy-load components

**3. ~~Build Configuration Issue~~ ✅ RESOLVED**
- **Was**: Production build failed due to localStorage access during webpack HTML generation
- **Root Cause**: Node.js v25+ requires `--localstorage-file` path initialization
- **Solution**: Created custom [scripts/build.js](scripts/build.js) that provides localStorage file path
- **Impact**: ✅ Production builds now work correctly

### Minor Issues

- Some type assertions (`as any`) in adapter layer
- No TypeScript strict null checks in some files
- Limited error recovery in some async operations
- No analytics or user behavior tracking
- No performance monitoring

---

## Key Files Reference

### Core Application
- [src/App.tsx](src/App.tsx) - Main application (56 lines - REFACTORED!)
- [src/components/DocumentGraphInner.tsx](src/components/DocumentGraphInner.tsx) - Orchestration component (268 lines)
- [src/index.tsx](src/index.tsx) - Entry point

### Custom Hooks (NEW)
- [src/hooks/useLayout.ts](src/hooks/useLayout.ts) - Layout engine management
- [src/hooks/useGraphData.ts](src/hooks/useGraphData.ts) - Graph state (nodes, edges, expansion)
- [src/hooks/useTooltip.ts](src/hooks/useTooltip.ts) - Tooltip state and handlers
- [src/hooks/useSearch.ts](src/hooks/useSearch.ts) - Search query and filtering
- [src/hooks/useNodeActions.ts](src/hooks/useNodeActions.ts) - Node interactions (click, drag, add, reset)
- [src/hooks/useDocuments.ts](src/hooks/useDocuments.ts) - Document upload handling

### Utilities (NEW)
- [src/utils/resizeObserverFix.ts](src/utils/resizeObserverFix.ts) - ResizeObserver error suppression
- [src/utils/iconMapper.tsx](src/utils/iconMapper.tsx) - Icon selection logic
- [src/utils/colorMapper.ts](src/utils/colorMapper.ts) - Node color gradients
- [src/utils/sizeMapper.ts](src/utils/sizeMapper.ts) - Node sizing logic

### Components
- [src/components/ErrorBoundary.tsx](src/components/ErrorBoundary.tsx) - Error boundary with ResizeObserver filtering
- [src/components/nodes/EntityNode.tsx](src/components/nodes/EntityNode.tsx) - Custom ReactFlow node (76 lines)
- [src/components/panels/ControlsPanel.tsx](src/components/panels/ControlsPanel.tsx) - Top control panel (104 lines)
- [src/components/modals/AddNodeModal.tsx](src/components/modals/AddNodeModal.tsx) - Add node modal (114 lines)
- [src/components/overlays/TooltipPortal.tsx](src/components/overlays/TooltipPortal.tsx) - Portal-rendered tooltip (108 lines)
- [src/components/BulkUploadModal.tsx](src/components/BulkUploadModal.tsx) - AI upload UI
- [src/components/DocumentViewer.tsx](src/components/DocumentViewer.tsx) - PDF/image viewer
- [src/components/AuthGate.tsx](src/components/AuthGate.tsx) - Auth guard
- [src/components/GoogleDriveAuth.tsx](src/components/GoogleDriveAuth.tsx) - Sign in UI

### Data Models
- [src/data/model.ts](src/data/model.ts) - Original ReactFlow-coupled types
- [src/data/standalone-model.ts](src/data/standalone-model.ts) - Platform-agnostic model
- [src/data/expandedSampleData.json](src/data/expandedSampleData.json) - Sample family data

### Services (Business Logic)
- [src/services/dataService-adapter.ts](src/services/dataService-adapter.ts) - Service factory
- [src/services/googleDriveDataService.ts](src/services/googleDriveDataService.ts) - Cloud sync
- [src/services/documentAnalysisService.ts](src/services/documentAnalysisService.ts) - AI analysis
- [src/services/documentPlacementService.ts](src/services/documentPlacementService.ts) - AI placement
- [src/services/googleAuthService.ts](src/services/googleAuthService.ts) - OAuth management

### Components
- [src/components/BulkUploadModal.tsx](src/components/BulkUploadModal.tsx) - AI upload UI
- [src/components/DocumentViewer.tsx](src/components/DocumentViewer.tsx) - PDF/image viewer
- [src/components/AuthGate.tsx](src/components/AuthGate.tsx) - Auth guard
- [src/components/GoogleDriveAuth.tsx](src/components/GoogleDriveAuth.tsx) - Sign in UI

### Contexts
- [src/contexts/AuthContext.tsx](src/contexts/AuthContext.tsx) - Global auth state
- [src/contexts/DocumentViewerContext.tsx](src/contexts/DocumentViewerContext.tsx) - Document viewer state

### Configuration
- [src/config/app-config.ts](src/config/app-config.ts) - App settings
- [src/config/ai-config.ts](src/config/ai-config.ts) - OpenAI config
- [package.json](package.json) - Dependencies and scripts
- [tailwind.config.js](tailwind.config.js) - Tailwind customization

### Documentation
- [CLAUDE.md](CLAUDE.md) - Comprehensive development guide
- [PHASE-7-STATUS.md](PHASE-7-STATUS.md) - Latest feature status
- [project-vision.md](project-vision.md) - Product vision and roadmap
- [context.md](context.md) - This file

### Testing
- [visual-testing/index.ts](visual-testing/index.ts) - Puppeteer test framework
- [src/utils/testAIServices.ts](src/utils/testAIServices.ts) - Browser console tests

---

## Next Steps

### Immediate Priority

**1. Vercel Deployment** 🎯 **NOW**
- See comprehensive deployment plan in [vercel-deployment.md](vercel-deployment.md)
- Configure Vercel project and environment variables
- Set up custom domain (lifemap.au)
- Configure Google OAuth for production domains
- Deploy to production with CI/CD pipeline
- Add monitoring and analytics

### Post-Deployment Improvements

**1. Error Handling Improvements** 🟡 MEDIUM
- Better error messages for users
- Error recovery strategies
- Offline mode indicators
- Network failure handling

**2. Performance Optimization** 🟡 MEDIUM
- Code splitting and lazy loading
- Memoization for expensive renders
- Optimize ReactFlow rendering
- Bundle size reduction

### Future Roadmap

**Phase 8: Backend & Multi-tenancy**
- Proper backend API (Node.js + Express or similar)
- User management
- Family accounts (5 users per tenant)
- Role-based access control

**Phase 9: Email Integration**
- Gmail scanning for documents
- Automatic import from email attachments
- Smart filtering and categorization

**Phase 10: Reminders & Notifications**
- Expiry date tracking
- Renewal reminders
- Push notifications
- Email alerts

**Phase 11: Mobile App**
- React Native or Flutter
- Shared data model with web
- Offline-first sync
- Mobile-optimized UI

**Phase 12: Advanced Features**
- Document versioning
- Audit logs
- Advanced sharing controls
- Professional/business use cases

---

## Architectural Decisions (Why?)

### Why ReactFlow?
- Mature library (30k+ GitHub stars)
- Built-in zoom, pan, drag-and-drop
- Extensible node/edge system
- Good TypeScript support

### Why Google Drive?
- No backend infrastructure needed initially
- User owns their data
- Familiar authentication
- Free tier sufficient for personal use

### Why GPT-4 Vision?
- Multimodal (handles images + PDFs)
- No separate OCR needed
- Flexible metadata extraction
- High accuracy

### Why TypeScript?
- Type safety prevents runtime errors
- Better IDE support
- Self-documenting code
- Easier refactoring

### Why Tailwind CSS?
- Rapid prototyping
- Small bundle size
- Dark mode support
- Consistent design system

### Why Refactor to Modular Architecture?
- **Was**: 1,195-line monolithic App.tsx for rapid prototyping ✅
- **Now**: 56-line App.tsx with 16 focused modules ✅
- **Benefits**:
  - Dramatically improved maintainability
  - Each component/hook can be tested independently
  - Clear separation of concerns
  - Easier to understand and modify
  - Follows React best practices (custom hooks pattern)

---

## Quick Start Commands

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build

# Run visual tests
npm run visual:test

# Take screenshots
npm run visual:screenshot
```

---

## Project Health Indicators

| Metric | Status | Notes |
|--------|--------|-------|
| **Functionality** | ✅ Excellent | All Phase 7 features working |
| **Code Quality** | ✅ Excellent | Modular architecture, custom hooks, clean separation |
| **Testing** | ✅ Excellent | 198 tests passing, >70% coverage, 12 test suites |
| **Documentation** | ✅ Excellent | Comprehensive docs (CLAUDE.md, context.md, vercel-deployment.md) |
| **Architecture** | ✅ Excellent | Clean service layer, hooks pattern, modular components |
| **Build System** | ✅ Excellent | Production builds working, Node.js v25+ compatible |
| **Performance** | 🟡 Good | Works well, ready for optimization post-deployment |
| **Security** | ✅ Good | OAuth2, secure token handling, environment variables |
| **Scalability** | 🟡 Medium | Works for prototype, needs backend for scale |
| **Maintainability** | ✅ Excellent | 1,195-line App.tsx → 56 lines + 16 focused modules |
| **Deployment Readiness** | ✅ Ready | Build configured, tests passing, ready for Vercel |

---

**Legend:**
- ✅ Excellent / Complete
- 🟡 Good / In Progress
- 🔴 Needs Attention
- ⏳ Planned / Pending
- ⚠️  Technical Debt

---

## Phase 2 Refactoring Details

### Summary
Successfully refactored the monolithic 1,195-line App.tsx into a clean, modular architecture with 56-line main App component and 16 focused modules.

### Refactoring Strategy

**Phase 2.1: Extract Utilities (5 files)**
- `/types/tooltip.ts` - Centralized TooltipState interface
- `/utils/resizeObserverFix.ts` - ResizeObserver error suppression logic
- `/utils/sizeMapper.ts` - Node sizing calculations
- `/utils/colorMapper.ts` - Node color gradient mappings
- `/utils/iconMapper.tsx` - Icon selection with Lucide imports

**Phase 2.2: Extract Components (6 files)**
- `/components/ErrorBoundary.tsx` - Error boundary with ResizeObserver filtering (72 lines)
- `/components/nodes/EntityNode.tsx` - Custom ReactFlow node (76 lines)
- `/config/nodeTypes.tsx` - ReactFlow configuration
- `/components/overlays/TooltipPortal.tsx` - Portal-rendered tooltip (108 lines)
- `/components/modals/AddNodeModal.tsx` - Add node modal (114 lines)
- `/components/panels/ControlsPanel.tsx` - Top control panel (104 lines)

**Phase 2.3: Extract Custom Hooks (6 files)**
- `/hooks/useLayout.ts` - Layout engine instance management
- `/hooks/useGraphData.ts` - Graph state (nodes, edges, expansion) - 97 lines
- `/hooks/useTooltip.ts` - Tooltip state and handlers with distance-based hiding - 131 lines
- `/hooks/useSearch.ts` - Search query and node filtering - 37 lines
- `/hooks/useNodeActions.ts` - Node interactions (click, drag, add, reset) - 182 lines
- `/hooks/useDocuments.ts` - Document upload handling - 122 lines

**Phase 2.4: Create Orchestration Component**
- `/components/DocumentGraphInner.tsx` - Main orchestration (268 lines)
  - Composes all custom hooks
  - Manages local state (darkMode, modals, refs)
  - Renders ReactFlow with all components
  - Clean separation of concerns

**Phase 2.5: Update App.tsx**
- **Before**: 1,195 lines of monolithic code
- **After**: 56 lines with clean provider composition
- Providers: ErrorBoundary → AuthProvider → AuthGate → DocumentViewerProvider → ReactFlowProvider → DocumentGraphInner

### Benefits Achieved

1. **Maintainability**: Each file has a single, clear responsibility
2. **Testability**: Components and hooks can be tested in isolation
3. **Reusability**: Hooks and utilities can be reused across components
4. **Readability**: Easier to understand with smaller, focused files
5. **Type Safety**: All TypeScript errors resolved (main app code)
6. **Best Practices**: Follows React patterns (custom hooks, component composition)

### Metrics

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Main file size | 1,195 lines | 56 lines | **95% reduction** |
| Number of files | 1 | 17 | Better organization |
| Largest file | 1,195 lines | 268 lines | **78% reduction** |
| Custom hooks | 0 | 6 | Reusable logic |
| Utility modules | 0 | 4 | Shared functions |
| Component modules | 0 | 7 | Focused UI |

---

*This document serves as a living reference for the LifeMap project. Update it as the project evolves.*
