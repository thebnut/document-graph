# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Document Graph Visualization Application - a React-based interactive tool for managing and visualizing personal/family documents, assets, and relationships through a hierarchical graph interface. The application allows users to create, navigate, and explore complex document relationships in a visual network format.

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

### Component Structure
The application uses a **single-file component architecture** with the main logic in `src/App.tsx` (911 lines). This monolithic approach suggests rapid prototyping phase.

**Key Components:**
- `DocumentGraphApp` - Wrapper providing ReactFlowProvider context
- `DocumentGraphInner` - Main application logic and state management
- `EntityNode` - Custom node component with dynamic sizing, icons, and styling

### State Management
Uses **local React state** with ReactFlow's specialized hooks:
- `useNodesState` & `useEdgesState` - Graph state management
- Dual state pattern: `allNodesData` (complete dataset) vs `nodes` (filtered view)
- Set-based expansion tracking for hierarchical navigation
- No external state management library

### Data Model
Hierarchical entity structure with 1-4 levels:
- **Level 1**: Primary people/entities
- **Level 2**: Shared assets and document categories  
- **Level 3**: Document subcategories
- **Level 4**: Individual documents/items

Each node includes type classification (person/pet/asset/document), descriptions, expiry dates, and parent-child relationships.

### Auto-Layout Algorithm
Sophisticated mathematical positioning:
- Level-based hierarchy with circular positioning
- Angular distribution for child nodes
- Manual position preservation for user-dragged nodes
- Dynamic sizing based on hierarchy level

## Key Features

### Error Handling
Extensive ResizeObserver error suppression specifically for ReactFlow compatibility issues. The application includes global error handlers and console method overrides.

### Search and Filtering
Real-time search across node labels and descriptions with dynamic edge filtering while maintaining graph connectivity.

### Theme Support
Dark/light mode toggle with Tailwind CSS implementation.

### Node Interaction
- Click to expand/collapse hierarchical nodes
- Drag to manually position nodes
- Hover for detailed information tooltips
- Smart icon assignment based on content keywords

## Development Notes

### Current Architecture Limitations
- Monolithic component structure (single 911-line file)
- No data persistence (hardcoded sample data)
- No API integration
- No routing (single-page application)

### Potential Improvements
Consider component extraction, state management library integration, and data persistence implementation for production scaling.

### ReactFlow Integration
The application heavily relies on ReactFlow for visualization. Understanding ReactFlow's API, particularly node/edge state management and custom node components, is essential for development.

## Troubleshooting

### Nodes Not Rendering in ReactFlow

**Problem**: Canvas renders but nodes are not visible despite having positions.

**Root Cause**: Mismatch between ReactFlow's internal state and the nodes being passed to it.

**Solution**: Ensure you're using the `nodes` state from `useNodesState` hook correctly:

```jsx
// WRONG - causes nodes to not render
const [nodes, setNodes] = useNodesState([]);
const processedNodes = /* some processing */;
<ReactFlow nodes={processedNodes} />

// CORRECT - use the state managed by ReactFlow
const [nodes, setNodes] = useNodesState([]);
// Process nodes but update via setNodes
useEffect(() => {
  const processed = nodes.map(node => ({ ...node, /* processing */ }));
  setNodes(processed);
}, [dependencies]);
<ReactFlow nodes={nodes} />
```

**Key Learning**: ReactFlow manages its own internal state through `useNodesState`. Always pass the `nodes` variable from this hook to the `<ReactFlow>` component, not a separately processed array. If you need to process nodes (add handlers, filter, etc.), do so through `setNodes` or return processed nodes in the state update.

### Node Expansion Not Working Properly

**Problem**: Clicking on expandable nodes doesn't show children, or requires clicking other nodes first.

**Root Cause**: Incorrect visibility logic showing nodes that shouldn't be visible yet.

**Solution**: Use ReactFlow's `hidden` property and ensure visibility logic matches hierarchy:

1. **Use hidden property instead of filtering**:
```javascript
// Instead of filtering nodes out:
const visibleNodes = nodes.filter(/* visibility logic */);

// Mark them as hidden:
const nodesWithVisibility = nodes.map(node => ({
  ...node,
  hidden: !shouldBeVisible(node, expandedNodes)
}));
```

2. **Fix visibility levels** - Only show top-level nodes by default:
```javascript
// In elkLayoutService.ts
// WRONG - shows too many levels
if (nodeData.level <= 3) return true;

// CORRECT - only show root and people
if (nodeData.level <= 2) return true;
```

**Key Learning**: Hierarchical expansion requires precise visibility logic. Always verify which levels should be visible by default and ensure child nodes are only visible when ALL parent nodes in the chain are expanded.