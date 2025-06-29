import { Node, Edge } from 'reactflow';
import ELK, { ElkNode, ElkExtendedEdge } from 'elkjs/lib/elk.bundled.js';
import { NodeData } from '../services/dataService';

// Initialize ELK instance
const elk = new ELK();

// ELK layout options for radial layout
export const elkRadialOptions = {
  'elk.algorithm': 'radial',
  'elk.radial.centerOnRoot': 'true',
  'elk.radial.orderId': 'inTrees',
  'elk.radial.compactor': 'WEDGE_COMPACTION',
  'elk.radial.optimizationCriteria': 'EDGE_LENGTH',
  'elk.radial.sorter': 'POLAR_COORDINATE',
  'elk.spacing.nodeNode': '80',
  'elk.radial.radius': '250', // Start people at reasonable distance from center
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
    style: { opacity: 0 }, // Hide virtual edges
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
  expandedNodes: Set<string>
): Promise<ElkNode> => {
  // Check if virtual root already exists
  const hasVirtualRoot = nodes.some(n => n.id === VIRTUAL_ROOT_ID);
  
  let elkNodes: Node<NodeData>[];
  let elkEdges: Edge[];
  
  if (!hasVirtualRoot) {
    // Add virtual root and adjust existing nodes
    const virtualRoot = createVirtualRoot();
    const adjustedNodes = nodes.map(adjustNodeLevel);
    const level1Nodes = nodes.filter(n => n.data.level === 1);
    const virtualEdges = createVirtualRootEdges(level1Nodes.map(adjustNodeLevel));
    
    elkNodes = [virtualRoot, ...adjustedNodes];
    elkEdges = [...edges, ...virtualEdges];
  } else {
    elkNodes = nodes;
    elkEdges = edges;
  }

  // Build ELK graph
  const elkGraph: ElkNode = {
    id: 'root',
    layoutOptions: elkRadialOptions,
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
 * Perform layout calculation using ELK
 */
export const calculateElkLayout = async (
  nodes: Node<NodeData>[],
  edges: Edge[],
  expandedNodes: Set<string>
): Promise<Node<NodeData>[]> => {
  try {
    const elkGraph = await convertToElkGraph(nodes, edges, expandedNodes);
    const layouted = await elk.layout(elkGraph);
    return applyElkLayout(nodes, layouted);
  } catch (error) {
    console.error('ELK layout failed:', error);
    return nodes; // Return original nodes on error
  }
};