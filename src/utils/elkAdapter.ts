import { Node, Edge } from 'reactflow';
import ELK, { ElkNode } from 'elkjs/lib/elk.bundled.js';
import { NodeData } from '../services/dataService';

// Initialize ELK instance
const elk = new ELK();

// ELK layout options - using layered algorithm for now
export const elkLayoutOptions = {
  'elk.algorithm': 'layered',
  'elk.direction': 'DOWN',
  'elk.spacing.nodeNode': '60',
  'elk.layered.spacing.nodeNodeBetweenLayers': '100',
  'elk.nodeLabels.placement': 'INSIDE V_CENTER H_CENTER',
  'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
};

// Radial layout options (currently buggy with our graph structure)
export const elkRadialOptions = {
  'elk.algorithm': 'radial',
  'elk.radial.centerOnRoot': 'true',
  'elk.radial.orderId': 'inTrees',
  'elk.radial.compactor': 'WEDGE_COMPACTION',
  'elk.radial.optimizationCriteria': 'EDGE_LENGTH',
  'elk.radial.sorter': 'POLAR_COORDINATE',
  'elk.spacing.nodeNode': '80',
  'elk.radial.radius': '250',
  'elk.nodeLabels.placement': 'INSIDE V_CENTER H_CENTER',
};

// Layered layout options (more stable fallback)
export const elkLayeredOptions = {
  'elk.algorithm': 'layered',
  'elk.direction': 'DOWN',
  'elk.spacing.nodeNode': '60',
  'elk.layered.spacing.nodeNodeBetweenLayers': '100',
  'elk.nodeLabels.placement': 'INSIDE V_CENTER H_CENTER',
  'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
};

// Virtual root node configuration
export const VIRTUAL_ROOT_ID = 'virtual-root';

/**
 * Create a virtual root node for ELK's single-root requirement
 */
export const createVirtualRoot = (): Node<NodeData> => ({
  id: VIRTUAL_ROOT_ID,
  type: 'entity',
  position: { x: 0, y: 0 },
  data: {
    id: VIRTUAL_ROOT_ID,
    label: 'Thebault Family',
    type: 'root' as any, // Virtual type
    level: 0,
    isVirtual: true,
    hasChildren: true,
    hideInView: true, // Flag for visual hiding
    isExpanded: true, // Always expanded
  } as NodeData,
});

/**
 * Adjust node levels to accommodate virtual root
 */
const adjustNodeLevel = (node: Node<NodeData>): Node<NodeData> => ({
  ...node,
  data: {
    ...node.data,
    level: node.data.level + 1, // Shift all levels up by 1
    // Adjust parent IDs for original level 1 nodes
    parentIds: node.data.level === 1 
      ? [VIRTUAL_ROOT_ID] 
      : node.data.parentIds,
  },
});

/**
 * Create edges from virtual root to level 1 nodes
 */
export const createVirtualRootEdges = (level1Nodes: Node<NodeData>[]): Edge[] => 
  level1Nodes.map(node => ({
    id: `${VIRTUAL_ROOT_ID}-${node.id}`,
    source: VIRTUAL_ROOT_ID,
    target: node.id,
    type: 'straight',
    animated: false,
    style: { 
      opacity: 0, // Hide virtual edges
      stroke: 'transparent',
      strokeWidth: 0
    },
  }));

/**
 * Get node size based on level and type
 */
const getNodeSize = (nodeData: NodeData): { width: number; height: number } => {
  // Virtual root is minimal
  if (nodeData.isVirtual) {
    return { width: 20, height: 20 };
  }

  // Adjusted levels (original + 1)
  const baseSize = {
    0: 140, // Never used (virtual root)
    1: 140, // People/Pets (was level 1)
    2: 120, // Assets (was level 2)
    3: 100, // Subcategories (was level 3)
    4: 80,  // Documents (was level 4)
  };

  const size = baseSize[nodeData.level as keyof typeof baseSize] || 100;
  return { width: size, height: size };
};

/**
 * Convert ReactFlow node to ELK node format
 */
const toElkNode = (node: Node<NodeData>, childNodes?: ElkNode[]): ElkNode => {
  const { width, height } = getNodeSize(node.data);
  
  const elkNode: ElkNode = {
    id: node.id,
    width,
    height,
    labels: [{
      text: node.data.label,
    }],
    layoutOptions: node.data.isManuallyPositioned ? {
      'elk.position.x': String(node.position.x),
      'elk.position.y': String(node.position.y),
      'elk.fixed': 'true',
    } : {},
  };
  
  // Add children if provided (for hierarchical structure)
  if (childNodes && childNodes.length > 0) {
    elkNode.children = childNodes;
  }
  
  return elkNode;
};

/**
 * Convert ReactFlow edge to ELK edge format
 * Using primitive edge format for radial algorithm compatibility
 */
const toElkEdge = (edge: Edge): any => ({
  id: edge.id,
  source: edge.source,
  target: edge.target,
});

/**
 * Build hierarchical node structure for ELK radial layout
 */
const buildHierarchicalStructure = (
  nodes: Node<NodeData>[],
  edges: Edge[],
  rootId: string
): ElkNode | null => {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const childrenMap = new Map<string, string[]>();
  
  // Build parent-child relationships from edges
  edges.forEach(edge => {
    if (!childrenMap.has(edge.source)) {
      childrenMap.set(edge.source, []);
    }
    childrenMap.get(edge.source)!.push(edge.target);
  });
  
  // Recursively build node hierarchy
  const buildNode = (nodeId: string): ElkNode | null => {
    const node = nodeMap.get(nodeId);
    if (!node) return null;
    
    const childIds = childrenMap.get(nodeId) || [];
    const childNodes = childIds
      .map(childId => buildNode(childId))
      .filter(child => child !== null) as ElkNode[];
    
    return toElkNode(node, childNodes);
  };
  
  return buildNode(rootId);
};

/**
 * Convert nodes and edges to ELK graph format
 */
export const convertToElkGraph = async (
  nodes: Node<NodeData>[], 
  edges: Edge[],
  _expandedNodes: Set<string>
): Promise<ElkNode> => {
  // Log node and edge IDs to verify references
  console.log('[elkAdapter] Node IDs:', nodes.map(n => n.id));
  console.log('[elkAdapter] Edge connections:', edges.map(e => `${e.source} -> ${e.target}`));
  
  // Use flat structure for layered layout
  const elkGraph: ElkNode = {
    id: 'root',
    layoutOptions: elkLayoutOptions,
    children: nodes.map(n => toElkNode(n)),
    edges: edges.map(toElkEdge),
  };

  // Detailed logging for debugging
  console.log('[elkAdapter] Detailed graph structure for ELK:');
  console.log('  - Graph ID:', elkGraph.id);
  console.log('  - Layout options:', JSON.stringify(elkGraph.layoutOptions, null, 2));
  console.log('  - Children (nodes):');
  elkGraph.children?.slice(0, 5).forEach(node => {
    console.log(`    - ${node.id}: width=${node.width}, height=${node.height}, labels=${JSON.stringify(node.labels)}`);
  });
  if (elkGraph.children && elkGraph.children.length > 5) {
    console.log(`    ... and ${elkGraph.children.length - 5} more nodes`);
  }
  console.log('  - Edges:');
  elkGraph.edges?.slice(0, 5).forEach((edge: any) => {
    console.log(`    - ${edge.id}: ${edge.source} -> ${edge.target}`);
  });
  if (elkGraph.edges && elkGraph.edges.length > 5) {
    console.log(`    ... and ${elkGraph.edges.length - 5} more edges`);
  }

  // Log the complete graph structure for debugging
  console.log('[elkAdapter] Complete ELK graph (stringified):');
  console.log(JSON.stringify(elkGraph, null, 2));

  return elkGraph;
};

/**
 * Flatten hierarchical ELK nodes to extract all positions
 */
const flattenElkNodes = (elkNode: ElkNode, parentX = 0, parentY = 0): Array<{id: string, x: number, y: number}> => {
  const result: Array<{id: string, x: number, y: number}> = [];
  
  // Add current node
  result.push({
    id: elkNode.id,
    x: (elkNode.x || 0) + parentX,
    y: (elkNode.y || 0) + parentY,
  });
  
  // Log node info
  console.log('[elkAdapter] flattenElkNodes - node:', elkNode.id, 'pos:', elkNode.x, elkNode.y, 'children:', elkNode.children?.length || 0);
  
  // Recursively add children
  if (elkNode.children) {
    elkNode.children.forEach(child => {
      result.push(...flattenElkNodes(child, (elkNode.x || 0) + parentX, (elkNode.y || 0) + parentY));
    });
  }
  
  return result;
};

/**
 * Apply ELK layout results back to ReactFlow nodes
 */
export const applyElkLayout = (
  originalNodes: Node<NodeData>[],
  elkLayouted: ElkNode
): Node<NodeData>[] => {
  const nodeMap = new Map(originalNodes.map(n => [n.id, n]));
  
  console.log('[elkAdapter] applyElkLayout - elkLayouted.children:', elkLayouted.children?.length);
  
  // For flat structure, positions are directly in children
  return originalNodes.map(originalNode => {
    const elkNode = elkLayouted.children?.find(n => n.id === originalNode.id);
    if (!elkNode) {
      console.warn(`[elkAdapter] No layout position found for node ${originalNode.id}`);
      return originalNode;
    }
    
    return {
      ...originalNode,
      position: {
        x: elkNode.x || 0,
        y: elkNode.y || 0,
      },
    };
  });
};

/**
 * Apply a simple fallback layout
 */
const applyFallbackLayout = (nodes: Node<NodeData>[]): Node<NodeData>[] => {
  console.log('[elkAdapter] Applying fallback layout to', nodes.length, 'nodes');
  const levelGroups = new Map<number, Node<NodeData>[]>();
  
  // Group nodes by level
  nodes.forEach(node => {
    const level = node.data.level;
    if (!levelGroups.has(level)) {
      levelGroups.set(level, []);
    }
    levelGroups.get(level)!.push(node);
  });
  
  // Position nodes in a tree-like structure
  const startX = 400;
  const startY = 100;
  const levelHeight = 200;
  const nodeSpacing = 250;
  
  const result = nodes.map(node => {
    const level = node.data.level;
    const levelNodes = levelGroups.get(level) || [];
    const nodeIndex = levelNodes.indexOf(node);
    const levelWidth = levelNodes.length * nodeSpacing;
    
    const x = startX - (levelWidth / 2) + (nodeIndex * nodeSpacing) + (nodeSpacing / 2);
    const y = startY + (level - 1) * levelHeight;
    
    return { ...node, position: { x, y } };
  });
  
  console.log('[elkAdapter] Fallback layout complete, sample positions:', 
    result.slice(0, 3).map(n => ({ id: n.id, pos: n.position })));
  return result;
};

/**
 * Perform layout calculation using ELK
 */
export const calculateElkLayout = async (
  nodes: Node<NodeData>[],
  edges: Edge[],
  expandedNodes: Set<string>
): Promise<Node<NodeData>[]> => {
  console.log('[elkAdapter] calculateElkLayout called with', nodes.length, 'nodes and', edges.length, 'edges');
  
  let elkGraph: ElkNode | null = null;
  try {
    elkGraph = await convertToElkGraph(nodes, edges, expandedNodes);
    console.log('[elkAdapter] ELK graph prepared:', elkGraph);
    
    // Debug the graph structure for radial layout
    console.log('[elkAdapter] Graph structure debug:');
    console.log('  - Root ID:', elkGraph.id);
    console.log('  - Children count:', elkGraph.children?.length);
    console.log('  - Edges count:', elkGraph.edges?.length);
    console.log('  - Layout options:', elkGraph.layoutOptions);
    
    if (elkGraph.children && elkGraph.children.length > 0) {
      console.log('  - First few nodes:', elkGraph.children.slice(0, 3).map(n => ({ id: n.id, width: n.width, height: n.height })));
    }
    if (elkGraph.edges && elkGraph.edges.length > 0) {
      console.log('  - First few edges:', elkGraph.edges.slice(0, 3).map((e: any) => ({ id: e.id, source: e.source, target: e.target })));
    }
    
    const layouted = await elk.layout(elkGraph);
    console.log('[elkAdapter] ELK layout complete:', layouted);
    console.log('[elkAdapter] Layouted children count:', layouted.children?.length);
    const result = applyElkLayout(nodes, layouted);
    console.log('[elkAdapter] Applied layout to nodes:', result.length, 'nodes');
    console.log('[elkAdapter] Sample positioned nodes:', result.slice(0, 3).map(n => ({ id: n.id, pos: n.position })));
    return result;
  } catch (error: any) {
    console.error('[elkAdapter] ELK radial layout failed with error:', error);
    console.error('[elkAdapter] Error details:');
    console.error('  - Error name:', error?.name);
    console.error('  - Error message:', error?.message);
    console.error('  - Error stack:', error?.stack);
    
    // Try layered algorithm as fallback
    if (elkGraph && error.message?.includes("reading 'a'")) {
      console.log('[elkAdapter] Attempting fallback to layered algorithm...');
      try {
        // Create a new graph with layered options
        const layeredGraph: ElkNode = {
          ...elkGraph,
          layoutOptions: elkLayeredOptions,
        };
        
        const layouted = await elk.layout(layeredGraph);
        console.log('[elkAdapter] Layered layout successful');
        const result = applyElkLayout(nodes, layouted);
        return result;
      } catch (layeredError: any) {
        console.error('[elkAdapter] Layered layout also failed:', layeredError);
      }
    }
    
    // Apply simple fallback layout on error
    console.log('[elkAdapter] Applying simple fallback layout');
    return applyFallbackLayout(nodes);
  }
};