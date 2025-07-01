# Product Requirements Document (PRD)
## Radial Layout Implementation for Document Graph

**Document Version:** 1.3  
**Date:** January 2025  
**Author:** Document Graph Team  
**Status:** Draft  
**Change Log:** 
- v1.1: Added Family Root Node adaptation
- v1.2: Added detailed d3-hierarchy data mapping and implementation specifications
- v1.3: Added current problems documentation, enhanced implementation details, and comprehensive integration guide

---

## 1. Executive Summary

### 1.1 Purpose
Replace the current manual layout algorithm in the document-graph application with a sophisticated radial/concentric layout system using d3-hierarchy, enabling automatic and visually appealing arrangement of nodes in a tree structure centered around a family root node.

### 1.2 Problem Statement

#### Current Layout Issues (Visual Evidence)
The existing implementation exhibits several critical layout problems:

1. **Node Overlapping at Center**
   - Multiple person nodes (Level 1) overlap each other
   - Anya node completely covers Gemma and Freya nodes
   - Only 2 of 4 family members are visible

2. **Edge Crossing and Misalignment**
   - Tesla Model Y (Gemma's asset) connects across Brett to the left side
   - Anya's Health node appears on opposite side of Brett
   - No logical grouping of related nodes near their parents

3. **Poor Space Utilization**
   - Uneven distribution of nodes around the circle
   - Wasted space in some quadrants while others are overcrowded
   - Manual calculations fail to account for node sizes

4. **Technical Limitations**
   - Uses basic trigonometry for node positioning
   - Has multiple root nodes, incompatible with standard radial tree layouts
   - Lacks semantic representation of the family unit
   - No collision detection or overlap prevention

### 1.3 Solution Overview
1. **Adapt the data model** to include a semantic family root node
2. **Map existing data structure** to d3-hierarchy format using stratify
3. **Integrate d3-hierarchy's radial tree layout** with polar coordinate conversion
4. **Maintain ReactFlow** for rendering and interactions

---

## 2. Data Model Adaptation

### 2.1 Current Structure (4 Levels)
```
Level 1: Brett, Gemma, Freya, Anya
Level 2: Categories (Identity, Health, Finance, Assets)
Level 3: Subcategories (Passports, Medical Records, etc.)
Level 4: Documents
```

### 2.2 Proposed Structure (5 Levels)
```
Level 0: Thebault Family (ROOT)
Level 1: Brett, Gemma, Freya, Anya
Level 2: Categories (Identity, Health, Finance, Assets)
Level 3: Subcategories
Level 4: Documents
```

### 2.3 Family Root Node Benefits
The family root node provides:
- **Central anchor point** for radial layout algorithm
- **Natural location for shared documents** (mortgage, family insurance, shared accounts)
- **Scalability** for multi-family or extended family structures
- **Semantic correctness** representing the family as a cohesive unit

---

## 3. Technical Implementation Details

### 3.1 Data Model Mapping to d3-hierarchy

#### 3.1.1 Family Root Node Injection

```typescript
export const injectFamilyRootNode = (
  nodes: Node[], 
  edges: Edge[]
): { nodes: Node[], edges: Edge[] } => {
  // Create the family root node
  const familyNode: Node = {
    id: 'family-root',
    type: 'entity',
    position: { x: 0, y: 0 }, // Will be recalculated by layout
    data: {
      id: 'family-root',
      label: 'Thebault Family',
      type: 'folder' as EntityType,
      level: 0,
      hasChildren: true,
      description: 'Family root node for shared documents and relationships',
      // Special styling for family node
      isRootNode: true
    } as NodeData
  };
  
  // Find all level 1 nodes (people)
  const level1Nodes = nodes.filter(n => (n.data as NodeData).level === 1);
  
  // Create edges from family root to all people
  const familyEdges = level1Nodes.map(node => ({
    id: `family-to-${node.id}`,
    source: 'family-root',
    target: node.id,
    type: 'smoothstep',
    animated: false
  }));
  
  // Update all nodes to increment their level
  const updatedNodes = nodes.map(node => ({
    ...node,
    data: {
      ...node.data,
      level: (node.data as NodeData).level + 1
    }
  }));
  
  return {
    nodes: [familyNode, ...updatedNodes],
    edges: [...edges, ...familyEdges]
  };
};
```

#### 3.1.2 Data Transformation Pipeline

```typescript
interface D3HierarchyMapper {
  // Convert ReactFlow nodes/edges to d3-hierarchy format
  toHierarchy(nodes: Node[], edges: Edge[]): d3.HierarchyNode<NodeData>;
  
  // Convert d3-hierarchy layout back to ReactFlow nodes
  toReactFlow(hierarchy: d3.HierarchyNode<NodeData>): Node[];
}
```

#### 3.1.2 Using d3.stratify() for Hierarchy Creation

```typescript
import { stratify, tree } from 'd3-hierarchy';

export class RadialLayoutEngine {
  // Convert flat node list to hierarchy using parent references
  private createHierarchy(nodes: Node[], edges: Edge[]) {
    // Create parent mapping from edges
    const parentMap = new Map<string, string>();
    edges.forEach(edge => {
      parentMap.set(edge.target, edge.source);
    });

    // Use d3.stratify to build hierarchy
    const stratifyFunc = stratify<Node>()
      .id(d => d.id)
      .parentId(d => {
        // For ReactFlow nodes, get parent from edge mapping
        return parentMap.get(d.id) || null;
      });

    return stratifyFunc(nodes);
  }
}
```

#### 3.1.3 Alternative: Direct Hierarchy Building

```typescript
// For when you have parentIds in node data
private buildHierarchyDirect(nodes: Node[]) {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  
  // Find root (family node at level 0)
  const root = nodes.find(n => n.data.level === 0);
  if (!root) throw new Error('No root node found');

  // Recursive hierarchy builder
  const buildNode = (nodeId: string): any => {
    const node = nodeMap.get(nodeId);
    const children = nodes
      .filter(n => n.data.parentIds?.includes(nodeId))
      .map(child => buildNode(child.id));
    
    return {
      ...node,
      children: children.length > 0 ? children : undefined
    };
  };

  return hierarchy(buildNode(root.id));
}
```

### 3.2 Enhanced Layout Configuration

#### 3.2.1 Node Size-Aware Separation Function

```typescript
// Get node dimensions based on type and level
const getNodeDimensions = (node: any): { width: number, height: number } => {
  const data = node.data as NodeData;
  
  // Family root node
  if (data.level === 0) return { width: 180, height: 180 };
  
  // Person nodes
  if (data.level === 1) return { width: 128, height: 128 };
  
  // Category folders
  if (data.level === 2) {
    switch (data.type) {
      case 'asset': return { width: 110, height: 110 };
      case 'folder': return { width: 96, height: 96 };
      default: return { width: 96, height: 96 };
    }
  }
  
  // Subcategory and documents
  if (data.level === 3) return { width: 88, height: 88 };
  if (data.level === 4) return { width: 80, height: 80 };
  
  return { width: 80, height: 80 };
};

// Enhanced separation function accounting for node sizes
const enhancedRadialSeparation = (a: any, b: any) => {
  // Base separation using D3's recommended formula
  const baseSeparation = (a.parent === b.parent ? 1 : 2) / a.depth;
  
  // Get node dimensions
  const aSize = getNodeDimensions(a);
  const bSize = getNodeDimensions(b);
  
  // Calculate required angular separation based on node sizes
  // This prevents overlapping by ensuring enough arc length between nodes
  const avgRadius = (a.y + b.y) / 2 || 300; // Use average radius
  const requiredArcLength = (aSize.width + bSize.width) / 2 + 20; // 20px padding
  const requiredAngle = requiredArcLength / avgRadius;
  
  // Return the larger of base separation or size-based separation
  return Math.max(baseSeparation, requiredAngle);
};

const configureRadialLayout = (nodes: Node[]) => {
  const treeLayout = tree<NodeData>()
    // Use dynamic size based on the data
    .size([2 * Math.PI, 600]) // Full circle, 600px max radius
    // Use our enhanced separation function
    .separation(enhancedRadialSeparation);
  
  return treeLayout;
};
```

#### 3.2.2 Coordinate Conversion

```typescript
interface PolarCoordinate {
  angle: number;  // x from d3 layout (in radians)
  radius: number; // y from d3 layout
}

interface CartesianCoordinate {
  x: number;
  y: number;
}

const polarToCartesian = (
  polar: PolarCoordinate,
  center: CartesianCoordinate
): CartesianCoordinate => {
  return {
    x: center.x + polar.radius * Math.cos(polar.angle - Math.PI / 2),
    y: center.y + polar.radius * Math.sin(polar.angle - Math.PI / 2)
  };
};

// Complete layout transformation
const applyRadialLayout = (hierarchy: HierarchyNode<NodeData>) => {
  const layout = tree<NodeData>()
    .size([2 * Math.PI, 400]); // 360° and 400px radius
  
  // Apply layout - this sets x (angle) and y (radius)
  const root = layout(hierarchy);
  
  // Convert all nodes to cartesian coordinates
  const center = { x: 400, y: 300 };
  
  return root.descendants().map(d => ({
    id: d.data.id,
    position: polarToCartesian(
      { angle: d.x, radius: d.y },
      center
    ),
    data: {
      ...d.data,
      // Store polar coords for animations
      polarAngle: d.x,
      polarRadius: d.y
    }
  }));
};
```

### 3.3 Handling Variable Node Sizes

#### 3.3.1 Node Size Considerations

```typescript
interface NodeSizeConfig {
  family: { width: 160, height: 160 },
  person: { width: 128, height: 128 },
  folder: { width: 96, height: 96 },
  document: { width: 80, height: 80 }
}

// Adjust spacing based on node type
const customSeparation = (a: HierarchyNode, b: HierarchyNode) => {
  const aSize = getNodeSize(a.data.type);
  const bSize = getNodeSize(b.data.type);
  
  // Calculate minimum angular separation to prevent overlap
  const avgRadius = (a.y + b.y) / 2;
  const avgSize = (aSize.width + bSize.width) / 2;
  
  // Arc length = radius × angle
  const minAngle = avgSize / avgRadius;
  
  // Apply depth-based scaling
  return minAngle * (a.parent === b.parent ? 1 : 2) / a.depth;
};
```

#### 3.3.2 Alternative: d3-flextree Integration

```typescript
// For significantly different node sizes
import flextree from 'd3-flextree';

const flexLayout = flextree()
  .nodeSize(node => {
    const sizes = {
      family: [160, 160],
      person: [128, 128],
      folder: [96, 96],
      document: [80, 80]
    };
    return sizes[node.data.type] || [80, 80];
  })
  .spacing((a, b) => a.parent === b.parent ? 0.5 : 1);
```

### 3.3 Manual Position Preservation

```typescript
interface LayoutOptions {
  preserveManualPositions?: boolean;
  animationDuration?: number;
  fitViewAfterLayout?: boolean;
}

// Track manually positioned nodes
const preserveManualPositions = (
  layoutedNodes: Node[],
  originalNodes: Node[]
): Node[] => {
  const manualPositionMap = new Map<string, Position>();
  
  // Collect manually positioned nodes
  originalNodes.forEach(node => {
    if ((node.data as NodeData).isManuallyPositioned) {
      manualPositionMap.set(node.id, node.position);
    }
  });
  
  // Apply manual positions to layouted nodes
  return layoutedNodes.map(node => {
    if (manualPositionMap.has(node.id)) {
      return {
        ...node,
        position: manualPositionMap.get(node.id)!,
        data: {
          ...node.data,
          isManuallyPositioned: true
        }
      };
    }
    return node;
  });
};
```

### 3.4 Complete Implementation Example

```typescript
export class D3RadialLayoutEngine {
  private centerX = 400;
  private centerY = 300;
  private maxRadius = 600;

  public calculateLayout(
    nodes: Node[], 
    edges: Edge[],
    options: LayoutOptions = {}
  ): Node[] {
    // Step 0: Inject family root if not present
    const hasRootNode = nodes.some(n => n.id === 'family-root');
    let processedData = { nodes, edges };
    
    if (!hasRootNode) {
      processedData = injectFamilyRootNode(nodes, edges);
    }
    
    // Step 1: Convert to hierarchy
    const hierarchy = this.createHierarchy(processedData.nodes, processedData.edges);
    
    // Step 2: Configure radial layout with enhanced separation
    const treeLayout = tree<NodeData>()
      .size([2 * Math.PI, this.maxRadius])
      .separation(enhancedRadialSeparation);
    
    // Step 3: Apply layout (sets x as angle, y as radius)
    const root = treeLayout(hierarchy);
    
    // Step 4: Convert to ReactFlow nodes with cartesian coords
    let layoutedNodes = root.descendants().map(d => {
      // Special handling for root node (centered)
      if (d.depth === 0) {
        return {
          ...processedData.nodes.find(n => n.id === d.data.id)!,
          position: { x: this.centerX, y: this.centerY },
          data: {
            ...d.data,
            layoutAngle: 0,
            layoutRadius: 0,
            layoutDepth: d.depth
          }
        };
      }
      
      // Convert polar (x=angle, y=radius) to cartesian
      const x = this.centerX + d.y * Math.cos(d.x - Math.PI / 2);
      const y = this.centerY + d.y * Math.sin(d.x - Math.PI / 2);
      
      // Find original node to preserve ReactFlow properties
      const originalNode = processedData.nodes.find(n => n.id === d.data.id);
      
      return {
        ...originalNode!,
        position: { x, y },
        data: {
          ...originalNode!.data,
          // Store layout metadata for animations
          layoutAngle: d.x,
          layoutRadius: d.y,
          layoutDepth: d.depth
        }
      };
    });
    
    // Step 5: Preserve manual positions if requested
    if (options.preserveManualPositions) {
      layoutedNodes = preserveManualPositions(layoutedNodes, nodes);
    }
    
    return layoutedNodes;
  }

  private createHierarchy(nodes: Node[], edges: Edge[]) {
    // Option 1: Use stratify with parent mapping
    const parentMap = new Map<string, string>();
    edges.forEach(e => parentMap.set(e.target, e.source));
    
    const stratified = stratify<Node>()
      .id(d => d.id)
      .parentId(d => parentMap.get(d.id) || null);
    
    return stratified(nodes);
  }

  private radialSeparation(a: any, b: any) {
    // D3 recommended formula for radial layouts
    return (a.parent === b.parent ? 1 : 2) / a.depth;
  }
}
```

### 3.5 React Integration Pattern

```typescript
export const useD3RadialLayout = () => {
  const { getNodes, getEdges, setNodes } = useReactFlow();
  const layoutEngine = useMemo(() => new D3RadialLayoutEngine(), []);

  const applyLayout = useCallback(async () => {
    const nodes = getNodes();
    const edges = getEdges();
    
    // Calculate new positions
    const layoutedNodes = layoutEngine.calculateLayout(nodes, edges);
    
    // Animate to new positions
    setNodes(layoutedNodes);
    
    // Optional: Fit view after layout
    setTimeout(() => {
      fitView({ padding: 0.1, duration: 800 });
    }, 50);
  }, [getNodes, getEdges, setNodes, layoutEngine]);

  return { applyLayout };
};
```

### 3.6 Edge Compatibility

Since ReactFlow handles edge rendering:

```typescript
// No changes needed to edges - ReactFlow will draw them
// Edges remain as simple source/target connections
const edges = [
  { id: 'e1', source: 'family', target: 'brett' },
  { id: 'e2', source: 'brett', target: 'brett-identity' }
];

// Optional: Custom edge styling for radial layout
const edgeTypes = {
  radial: RadialEdge // Custom curved edge component
};
```

---

## 4. Data Migration Strategy

### 4.1 Existing Data Transformation

```typescript
export class DataMigrationService {
  // Transform existing 4-level data to 5-level structure
  migrateToFamilyStructure(
    existingEntities: Entity[],
    existingRelationships: EntityRelationship[]
  ): DocumentGraphModel {
    // Create family root entity
    const familyEntity: Entity = {
      id: 'family-root',
      label: 'Thebault Family',
      type: 'folder',
      level: 0,
      hasChildren: true,
      description: 'Family hub for shared documents and relationships'
    };
    
    // Increment levels for all existing entities
    const updatedEntities = existingEntities.map(entity => ({
      ...entity,
      level: entity.level + 1
    }));
    
    // Create relationships from family to all people (new level 1)
    const peopleEntities = updatedEntities.filter(e => e.level === 1);
    const familyRelationships = peopleEntities.map(person => ({
      id: `rel-family-${person.id}`,
      source: 'family-root',
      target: person.id,
      type: 'parent-child'
    }));
    
    // Identify shared documents to connect to family root
    const sharedDocuments = updatedEntities.filter(e => 
      e.ownership === 'shared' && e.level > 2
    );
    
    // Re-parent shared documents to family level categories
    const repairedRelationships = existingRelationships.map(rel => {
      const targetDoc = sharedDocuments.find(d => d.id === rel.target);
      if (targetDoc) {
        // Create shared category if needed
        return {
          ...rel,
          source: 'family-shared-docs' // Will be created as needed
        };
      }
      return rel;
    });
    
    return {
      version: '2.0',
      metadata: {
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        description: 'Migrated to family-centric structure'
      },
      entities: [familyEntity, ...updatedEntities],
      relationships: [...familyRelationships, ...repairedRelationships]
    };
  }
}
```

### 4.2 Backward Compatibility

```typescript
// Support both old and new data formats
export const isLegacyDataFormat = (entities: Entity[]): boolean => {
  return !entities.some(e => e.id === 'family-root' || e.level === 0);
};

// Automatic migration on load
export const loadAndMigrateData = (data: any): DocumentGraphModel => {
  if (isLegacyDataFormat(data.entities)) {
    console.log('Legacy data format detected, migrating...');
    const migrationService = new DataMigrationService();
    return migrationService.migrateToFamilyStructure(
      data.entities,
      data.relationships
    );
  }
  return data;
};
```

---

## 5. Visual Layout Specifications

### 5.1 Radial Distance by Level

```typescript
export const RADIAL_DISTANCES = {
  level0: 0,      // Family root at center
  level1: 150,    // People - close ring
  level2: 300,    // Categories - mid ring  
  level3: 450,    // Subcategories - outer ring
  level4: 600     // Documents - outermost ring
};

// Dynamic radius calculation based on node count
export const calculateDynamicRadius = (
  level: number,
  nodeCountAtLevel: number
): number => {
  const baseRadius = RADIAL_DISTANCES[`level${level}`];
  
  // Expand radius if too many nodes at this level
  if (nodeCountAtLevel > 8 && level > 1) {
    const expansionFactor = Math.sqrt(nodeCountAtLevel / 8);
    return baseRadius * expansionFactor;
  }
  
  return baseRadius;
};
```

### 5.2 Angular Distribution

```typescript
export const ANGULAR_DISTRIBUTION = {
  // Minimum angular separation between siblings (in radians)
  minSeparation: Math.PI / 12, // 15 degrees
  
  // Maximum spread angle for child groups
  maxChildSpread: Math.PI / 2, // 90 degrees
  
  // Start angle offset to position first node at top
  startAngleOffset: -Math.PI / 2
};

// Calculate optimal angular positions
export const distributeAngularly = (
  siblingCount: number,
  parentAngle: number = 0,
  level: number
): number[] => {
  if (level === 1) {
    // Distribute people evenly around circle
    const angleStep = (2 * Math.PI) / siblingCount;
    return Array.from({ length: siblingCount }, (_, i) => 
      i * angleStep + ANGULAR_DISTRIBUTION.startAngleOffset
    );
  }
  
  // For other levels, cluster around parent
  const totalSpread = Math.min(
    ANGULAR_DISTRIBUTION.maxChildSpread,
    siblingCount * ANGULAR_DISTRIBUTION.minSeparation
  );
  
  const angleStep = totalSpread / Math.max(siblingCount - 1, 1);
  const startAngle = parentAngle - totalSpread / 2;
  
  return Array.from({ length: siblingCount }, (_, i) =>
    startAngle + i * angleStep
  );
};
```

---

## 6. Performance Considerations

### 6.1 Layout Caching

```typescript
class CachedRadialLayout {
  private cache = new Map<string, Node[]>();
  
  calculateLayout(nodes: Node[], edges: Edge[]): Node[] {
    const cacheKey = this.generateCacheKey(nodes, edges);
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }
    
    const result = this.performLayout(nodes, edges);
    this.cache.set(cacheKey, result);
    
    return result;
  }
}
```

### 6.2 Incremental Updates

```typescript
// Only recalculate affected subtrees
const updatePartialLayout = (
  changedNodeId: string,
  nodes: Node[],
  edges: Edge[]
) => {
  // Find subtree root
  const subtreeRoot = findSubtreeRoot(changedNodeId, nodes, edges);
  
  // Layout only the subtree
  const subtree = extractSubtree(subtreeRoot, nodes, edges);
  const layoutedSubtree = layoutEngine.calculateLayout(subtree.nodes, subtree.edges);
  
  // Merge back into full node list
  return mergeLayoutResults(nodes, layoutedSubtree);
};
```

---

## 7. Integration Guide

### 7.1 Replacing autoLayout Function

```typescript
// In App.tsx - Replace the existing autoLayout function
import { D3RadialLayoutEngine } from './services/d3RadialLayoutEngine';

const DocumentGraphInner = () => {
  // Initialize layout engine
  const layoutEngine = useMemo(() => new D3RadialLayoutEngine(), []);
  
  // Replace autoLayout calls with:
  const applyRadialLayout = useCallback((nodes: Node[], options?: LayoutOptions) => {
    const edges = getEdges();
    return layoutEngine.calculateLayout(nodes, edges, options);
  }, [layoutEngine, getEdges]);
  
  // Update initialization
  React.useEffect(() => {
    const allNodes = dataService.entitiesToNodes();
    const edges = dataService.relationshipsToEdges();
    
    // Apply new radial layout
    const layoutedNodes = applyRadialLayout(allNodes, {
      preserveManualPositions: false
    });
    
    setAllNodesData(layoutedNodes);
    // ... rest of initialization
  }, []);
  
  // Update reset handler
  const handleResetCanvas = useCallback(() => {
    setExpandedNodes(new Set());
    
    const resetNodes = allNodesData.map(node => ({
      ...node,
      data: { ...node.data, isManuallyPositioned: false }
    }));
    
    // Use new layout engine
    const layoutedNodes = applyRadialLayout(resetNodes, {
      preserveManualPositions: false,
      fitViewAfterLayout: true
    });
    
    setAllNodesData(layoutedNodes);
    // ... rest of reset logic
  }, [allNodesData, applyRadialLayout]);
};
```

### 7.2 Handling Expanded Nodes

```typescript
// Update expansion logic to work with new hierarchy
const handleNodeExpansion = useCallback((nodeId: string) => {
  setExpandedNodes(prev => {
    const newExpanded = new Set(prev);
    
    if (newExpanded.has(nodeId)) {
      // Collapse node and all descendants
      newExpanded.delete(nodeId);
      const descendants = dataService.getAllDescendantIds(nodeId);
      descendants.forEach(id => newExpanded.delete(id));
    } else {
      // Expand node
      newExpanded.add(nodeId);
    }
    
    return newExpanded;
  });
  
  // Re-layout with animation
  setTimeout(() => {
    const layoutedNodes = applyRadialLayout(allNodesData, {
      preserveManualPositions: true,
      animationDuration: 500
    });
    setAllNodesData(layoutedNodes);
  }, 0);
}, [allNodesData, applyRadialLayout]);
```

### 7.3 Search Integration

```typescript
// Ensure search works with new family root
const handleSearch = useCallback((query: string) => {
  if (!query) {
    // Show default view with family at center
    const visibleNodes = getVisibleNodesWithFamily(allNodesData, expandedNodes);
    setNodes(visibleNodes);
    return;
  }
  
  // Filter nodes but always include family root for context
  const matchedNodes = allNodesData.filter(node => {
    if (node.id === 'family-root') return true;
    const nodeData = node.data as NodeData;
    return nodeData.label.toLowerCase().includes(query.toLowerCase()) ||
           nodeData.description?.toLowerCase().includes(query.toLowerCase());
  });
  
  // Ensure edges connect through family hierarchy
  const visibleEdges = maintainHierarchicalEdges(matchedNodes, edges);
  
  setNodes(matchedNodes);
  setEdges(visibleEdges);
}, [allNodesData, expandedNodes, edges]);
```

---

## 8. Migration and Testing

### 8.1 Comprehensive Testing Scenarios

```typescript
describe('D3RadialLayoutEngine', () => {
  let layoutEngine: D3RadialLayoutEngine;
  
  beforeEach(() => {
    layoutEngine = new D3RadialLayoutEngine();
  });
  
  describe('Node Overlap Prevention', () => {
    it('should prevent overlapping of person nodes at level 1', () => {
      const nodes = createMockFamilyNodes(4); // 4 people
      const edges = createMockEdges(nodes);
      
      const result = layoutEngine.calculateLayout(nodes, edges);
      
      // Check no overlaps between level 1 nodes
      const level1Nodes = result.filter(n => n.data.level === 1);
      for (let i = 0; i < level1Nodes.length; i++) {
        for (let j = i + 1; j < level1Nodes.length; j++) {
          const distance = calculateDistance(
            level1Nodes[i].position,
            level1Nodes[j].position
          );
          const minDistance = 128 + 20; // Node width + padding
          expect(distance).toBeGreaterThanOrEqual(minDistance);
        }
      }
    });
    
    it('should handle dense category nodes without overlap', () => {
      const nodes = createMockNodesWithCategories(4, 8); // 4 people, 8 categories each
      const edges = createMockEdges(nodes);
      
      const result = layoutEngine.calculateLayout(nodes, edges);
      
      // Verify no overlaps at level 2
      const level2Nodes = result.filter(n => n.data.level === 2);
      validateNoOverlaps(level2Nodes, 96); // Category node size
    });
  });
  
  describe('Edge Crossing Prevention', () => {
    it('should maintain parent-child angular relationships', () => {
      const nodes = createCompleteFamily();
      const edges = createMockEdges(nodes);
      
      const result = layoutEngine.calculateLayout(nodes, edges);
      
      // Verify children are positioned near their parents angularly
      edges.forEach(edge => {
        const parent = result.find(n => n.id === edge.source);
        const child = result.find(n => n.id === edge.target);
        
        if (parent && child && child.data.level > 1) {
          const parentAngle = Math.atan2(
            parent.position.y - 300,
            parent.position.x - 400
          );
          const childAngle = Math.atan2(
            child.position.y - 300,
            child.position.x - 400
          );
          
          const angleDiff = Math.abs(parentAngle - childAngle);
          expect(angleDiff).toBeLessThan(Math.PI / 2); // Within 90 degrees
        }
      });
    });
  });
  
  describe('Performance Benchmarks', () => {
    it('should layout 100 nodes in under 100ms', () => {
      const nodes = createLargeDataset(100);
      const edges = createMockEdges(nodes);
      
      const startTime = performance.now();
      layoutEngine.calculateLayout(nodes, edges);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(100);
    });
    
    it('should handle 500 nodes efficiently', () => {
      const nodes = createLargeDataset(500);
      const edges = createMockEdges(nodes);
      
      const startTime = performance.now();
      const result = layoutEngine.calculateLayout(nodes, edges);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(500);
      expect(result.length).toBe(501); // 500 + family root
    });
  });
  
  describe('Data Migration', () => {
    it('should correctly migrate 4-level to 5-level structure', () => {
      const legacyData = loadLegacySampleData();
      const migrated = loadAndMigrateData(legacyData);
      
      // Verify family root exists
      expect(migrated.entities.find(e => e.id === 'family-root')).toBeDefined();
      
      // Verify all levels incremented
      legacyData.entities.forEach(entity => {
        const migratedEntity = migrated.entities.find(e => 
          e.id === entity.id && e.id !== 'family-root'
        );
        expect(migratedEntity.level).toBe(entity.level + 1);
      });
    });
  });
  
  describe('Manual Position Preservation', () => {
    it('should preserve manually positioned nodes', () => {
      const nodes = createMockFamilyNodes(2);
      nodes[1].data.isManuallyPositioned = true;
      nodes[1].position = { x: 600, y: 200 };
      
      const edges = createMockEdges(nodes);
      const result = layoutEngine.calculateLayout(nodes, edges, {
        preserveManualPositions: true
      });
      
      const manualNode = result.find(n => n.id === nodes[1].id);
      expect(manualNode.position).toEqual({ x: 600, y: 200 });
    });
  });
});
```

### 8.2 Visual Regression Testing

```typescript
// Visual testing with Puppeteer
export const visualRegressionTest = async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Test scenarios
  const scenarios = [
    {
      name: 'default-view',
      action: async () => {
        await page.goto('http://localhost:3000');
        await page.waitForSelector('.react-flow__renderer');
      }
    },
    {
      name: 'all-nodes-expanded',
      action: async () => {
        await page.goto('http://localhost:3000');
        // Expand all level 1 nodes
        const personNodes = await page.$$('[data-id*="person"]');
        for (const node of personNodes) {
          await node.click();
          await page.waitForTimeout(500);
        }
      }
    },
    {
      name: 'search-active',
      action: async () => {
        await page.goto('http://localhost:3000');
        await page.type('input[placeholder="Search nodes..."]', 'passport');
        await page.waitForTimeout(500);
      }
    }
  ];
  
  for (const scenario of scenarios) {
    await scenario.action();
    await page.screenshot({
      path: `./visual-tests/radial-layout-${scenario.name}.png`,
      fullPage: true
    });
  }
  
  await browser.close();
};
```

---

## 9. Updated Acceptance Criteria

### Functional Requirements
- [ ] Family root node successfully injected at Level 0
- [ ] All person nodes (Brett, Gemma, Freya, Anya) visible without overlap
- [ ] d3.stratify correctly converts flat node/edge structure to hierarchy
- [ ] Polar coordinates (angle, radius) correctly convert to cartesian (x, y)
- [ ] Enhanced separation function prevents all node overlaps
- [ ] Variable node sizes are properly accommodated
- [ ] Manual node positions preserved when requested
- [ ] Shared family documents can be attached to family root

### Performance Requirements  
- [ ] Layout calculation completes in < 100ms for 100 nodes
- [ ] Layout calculation completes in < 500ms for 500 nodes
- [ ] Smooth animations during node expansion/collapse
- [ ] No visible lag during search operations

### Visual Requirements
- [ ] No edge crossings between parent-child relationships
- [ ] Children nodes clustered near their parents
- [ ] Even distribution of nodes around each ring
- [ ] Family root node centered and visually distinct
- [ ] Clear visual hierarchy from center outward

### Integration Requirements
- [ ] Existing ReactFlow event handlers maintained
- [ ] Search functionality works with new hierarchy
- [ ] Tooltip system continues to function
- [ ] Document viewer integration preserved
- [ ] Node drag-and-drop still works
- [ ] Minimap correctly reflects new layout

### Migration Requirements
- [ ] Legacy 4-level data automatically migrated
- [ ] No data loss during migration
- [ ] Backward compatibility maintained
- [ ] Clear migration path documented

## 10. Implementation Timeline

### Phase 1: Core Implementation (Week 1)
- Install d3-hierarchy dependencies
- Create D3RadialLayoutEngine service
- Implement family root injection
- Basic radial layout working

### Phase 2: Enhancement & Integration (Week 2)  
- Enhanced separation function for overlap prevention
- Manual position preservation
- Integration with existing App.tsx
- Data migration service

### Phase 3: Testing & Refinement (Week 3)
- Comprehensive unit tests
- Visual regression tests
- Performance optimization
- Bug fixes and edge cases

### Phase 4: Documentation & Release (Week 4)
- Update user documentation
- Create migration guide
- Final testing and QA
- Production release

---

This PRD v1.3 provides comprehensive technical guidance for implementing a d3-hierarchy-based radial layout that solves the critical layout problems in the current implementation while maintaining all existing functionality.