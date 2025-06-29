# Revert and New Plan for Expansion Fix

## What We Reverted

1. **App.tsx**: Changed back from `displayNodes` to `nodes` for processedNodes
2. **useElkLayout.ts**: Reverted to filtering nodes before passing to ReactFlow

This should restore node visibility to the previous working state where:
- Nodes are visible
- But expansion doesn't show children (the original problem)

## Why The Previous Fix Failed

The attempt to pass ALL nodes to ReactFlow and handle visibility through display filtering failed because:
- We broke the connection between ReactFlow's state management and what was being displayed
- Using `displayNodes` in App.tsx while `nodes` state was empty resulted in no nodes showing

## Better Approach for Expansion

### Option 1: Use node.hidden property (Recommended)
Instead of filtering nodes, use ReactFlow's built-in `hidden` property:

1. Pass ALL nodes to ReactFlow (they all get positions from layout)
2. Set `node.hidden = true` for nodes that shouldn't be visible
3. ReactFlow handles the visibility internally

Benefits:
- All nodes have positions ready when expanded
- No double filtering issues
- ReactFlow's internal state stays consistent

### Option 2: Two-phase approach
1. Keep all nodes in allNodesData with positions
2. When expansion changes, update ReactFlow with the new visible set
3. Ensure newly visible nodes already have positions from allNodesData

### Option 3: Use subflows
ReactFlow supports subflows for hierarchical data, which might be more appropriate for this use case.

## Current State

The application should now be back to the original state where:
- Nodes are visible
- Clicking on expandable nodes doesn't show children (original issue)
- But at least the canvas isn't empty

## Next Steps

1. Test that nodes are visible again
2. Implement Option 1 (node.hidden approach) for proper expansion
3. Ensure ELK layout calculates positions for ALL nodes, not just visible ones