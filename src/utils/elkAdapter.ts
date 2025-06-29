import { Node, Edge } from 'reactflow';
import ELK, { ElkNode, ElkExtendedEdge } from 'elkjs/lib/elk.bundled.js';
import { NodeData } from '../services/dataService';

// Initialize ELK instance
const elk = new ELK();

// ELK layout options - using radial algorithm for circular layout
export const elkLayoutOptions = {
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
const toElkNode = (node: Node<NodeData>): ElkNode => {
  const { width, height } = getNodeSize(node.data);
  
  return {
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
};

/**
 * Convert ReactFlow edge to ELK edge format
 */
const toElkEdge = (edge: Edge): ElkExtendedEdge => ({
  id: edge.id,
  sources: [edge.source],
  targets: [edge.target],
});

/**
 * Convert nodes and edges to ELK graph format
 */
export const convertToElkGraph = async (
  nodes: Node<NodeData>[], 
  edges: Edge[],
  _expandedNodes: Set<string>
): Promise<ElkNode> => {
  // Skip virtual root completely - use nodes as-is
  const elkNodes = nodes;
  const elkEdges = edges;

  // Build ELK graph
  const elkGraph: ElkNode = {
    id: 'root',
    layoutOptions: elkLayoutOptions,
    children: elkNodes.map(toElkNode),
    edges: elkEdges.map(toElkEdge),
  };

  return elkGraph;
};

/**
 * Apply ELK layout results back to ReactFlow nodes
 */
export const applyElkLayout = (
  originalNodes: Node<NodeData>[],
  elkLayouted: ElkNode
): Node<NodeData>[] => {
  const nodeMap = new Map(originalNodes.map(n => [n.id, n]));
  
  return elkLayouted.children?.map(elkNode => {
    const originalNode = nodeMap.get(elkNode.id);
    if (!originalNode) return null;
    
    return {
      ...originalNode,
      position: {
        x: elkNode.x || 0,
        y: elkNode.y || 0,
      },
    };
  }).filter(Boolean) as Node<NodeData>[] || [];
};

/**
 * Apply a simple circular fallback layout
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
  try {
    const elkGraph = await convertToElkGraph(nodes, edges, expandedNodes);
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
      console.log('  - First few edges:', elkGraph.edges.slice(0, 3).map(e => ({ id: e.id, sources: e.sources, targets: e.targets })));
    }
    
    const layouted = await elk.layout(elkGraph);
    console.log('[elkAdapter] ELK layout complete:', layouted);
    const result = applyElkLayout(nodes, layouted);
    console.log('[elkAdapter] Applied layout to nodes:', result);
    return result;
  } catch (error) {
    console.error('[elkAdapter] ELK layout failed, using fallback:', error);
    // Apply fallback layout on error
    return applyFallbackLayout(nodes);
  }
};