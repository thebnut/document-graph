# Hidden Property Fix for Expansion

## Changes Made

### 1. Fixed Compilation Error ✅
- Moved `getDisplayNodes` definition before `applyLayout` to resolve the "used before declaration" error
- Removed duplicate `getDisplayNodes` definition

### 2. Implemented Hidden Property Approach ✅
Instead of filtering nodes out, we now:
- Pass ALL nodes to ReactFlow with their positions
- Mark non-visible nodes with `hidden: true` property
- ReactFlow handles the visibility internally

**Key change in useElkLayout.ts:**
```typescript
// Instead of filtering:
const visibleNodes = getDisplayNodes(layoutedNodes);
onNodesChange(visibleNodes);

// Now using hidden property:
const visibleNodeIds = new Set(getDisplayNodes(layoutedNodes).map(n => n.id));
const layoutedNodesWithVisibility = layoutedNodes.map(node => ({
  ...node,
  hidden: !visibleNodeIds.has(node.id)
}));
onNodesChange(layoutedNodesWithVisibility);
```

### 3. Cleaned Up App.tsx ✅
- Removed `displayNodes` from useElkLayout return values
- Updated processedNodes to work with all nodes (not filtering by visibility)
- Search now overrides the hidden property for matching nodes

## Benefits

1. **All nodes maintain positions** - When you expand a node, children are already positioned
2. **No double filtering** - Single source of truth for visibility (hidden property)
3. **ReactFlow state consistency** - All nodes stay in ReactFlow's internal state
4. **Smooth expansion** - No layout jump when showing/hiding nodes

## How It Works

1. ELK layout calculates positions for ALL nodes (visible and hidden)
2. useElkLayout marks nodes as hidden based on expansion state
3. ReactFlow receives all nodes but only renders non-hidden ones
4. When expansion changes, nodes are just marked/unmarked as hidden
5. Search temporarily unhides matching nodes

## Testing

The app should now:
- Show nodes correctly
- Expand/collapse when clicking on expandable nodes
- Show pre-positioned children instantly on expansion
- Work properly with search (showing hidden nodes that match)