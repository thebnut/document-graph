import { Node, Edge } from 'reactflow';
import { NodeData } from './dataService';
import { 
  calculateElkLayout, 
  createVirtualRoot, 
  createVirtualRootEdges,
  VIRTUAL_ROOT_ID 
} from '../utils/elkAdapter';

export class ElkLayoutService {
  /**
   * Prepare nodes with virtual root for ELK layout
   */
  prepareNodesWithVirtualRoot(nodes: Node<NodeData>[]): {
    nodes: Node<NodeData>[];
    edges: Edge[];
  } {
    // Check if virtual root already exists
    const hasVirtualRoot = nodes.some(n => n.id === VIRTUAL_ROOT_ID);
    
    if (hasVirtualRoot) {
      // If virtual root exists, create edges for level 2 nodes (originally level 1)
      const level2Nodes = nodes.filter(n => n.data.level === 2 && !n.data.isVirtual);
      const virtualEdges = createVirtualRootEdges(level2Nodes);
      return { nodes, edges: virtualEdges };
    }

    // Create virtual root
    const virtualRoot = createVirtualRoot();
    
    // Adjust levels for all existing nodes
    const adjustedNodes = nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        level: node.data.level + 1,
        // Connect original level 1 nodes to virtual root
        parentIds: node.data.level === 1 
          ? [VIRTUAL_ROOT_ID] 
          : node.data.parentIds,
      },
    }));

    // Create edges from virtual root to what were level 1 nodes
    const level1Nodes = adjustedNodes.filter(n => n.data.level === 2); // Now level 2
    const virtualEdges = createVirtualRootEdges(level1Nodes);

    return {
      nodes: [virtualRoot, ...adjustedNodes],
      edges: virtualEdges,
    };
  }

  /**
   * Filter nodes based on expanded state
   */
  filterVisibleNodes(
    allNodes: Node<NodeData>[],
    expandedNodes: Set<string>
  ): Node<NodeData>[] {
    console.log('[elkLayoutService] filterVisibleNodes called with', allNodes.length, 'nodes, expandedNodes:', expandedNodes);
    return allNodes.filter(node => {
      const nodeData = node.data;

      // Always show virtual root
      if (nodeData.isVirtual) {
        console.log('[elkLayoutService] Showing virtual root');
        return true;
      }

      // Always show level 1 and 2 (virtual root and people)
      // Note: levels are adjusted +1 from original (1->2, 2->3, etc.)
      if (nodeData.level <= 2) {
        console.log('[elkLayoutService] Showing node', node.id, 'level', nodeData.level, 'hasChildren:', nodeData.hasChildren);
        return true;
      }

      // For other nodes (level 4+), check if ALL parent nodes in the chain are expanded
      console.log('[elkLayoutService] Checking node', node.id, 'level', nodeData.level, 'parents:', nodeData.parentIds);
      if (nodeData.parentIds) {
        // Check immediate parent first
        const immediateParentExpanded = nodeData.parentIds.some(parentId => 
          expandedNodes.has(parentId)
        );
        console.log('[elkLayoutService] Parent expanded check:', immediateParentExpanded, 'for parents:', nodeData.parentIds);
        if (!immediateParentExpanded) return false;

        // For level 4+ nodes, also check if grandparent is expanded
        if (nodeData.level >= 4) {
          const parent = allNodes.find(n => n.id === nodeData.parentIds![0]);
          if (parent && parent.data.parentIds) {
            const grandParentExpanded = parent.data.parentIds.some(gpId => 
              expandedNodes.has(gpId)
            );
            if (!grandParentExpanded) return false;
          }
        }

        return true;
      }

      return false;
    });
  }

  /**
   * Apply layout with ELK radial algorithm
   */
  async applyRadialLayout(
    nodes: Node<NodeData>[],
    edges: Edge[],
    expandedNodes: Set<string>,
    preserveManualPositions = true
  ): Promise<Node<NodeData>[]> {
    // Prepare nodes with virtual root
    const { nodes: preparedNodes, edges: virtualEdges } = this.prepareNodesWithVirtualRoot(nodes);
    
    // Combine virtual edges with existing edges
    const allEdges = [...edges, ...virtualEdges];
    
    // Filter edges to only include those between visible nodes
    const visibleNodeIds = new Set(preparedNodes.map(n => n.id));
    const visibleEdges = allEdges.filter(edge => 
      visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
    );
    
    // Layout ALL nodes, not just visible ones
    // This ensures all nodes have positions
    const layoutedNodes = await calculateElkLayout(preparedNodes, visibleEdges, expandedNodes);
    
    // Preserve manual positions if requested
    if (preserveManualPositions) {
      const manualPositions = new Map(
        nodes
          .filter(n => n.data.isManuallyPositioned)
          .map(n => [n.id, n.position])
      );
      
      return layoutedNodes.map(node => ({
        ...node,
        position: manualPositions.get(node.id) || node.position,
      }));
    }
    
    return layoutedNodes;
  }

  /**
   * Reset layout (remove manual positioning)
   */
  resetLayout(nodes: Node<NodeData>[]): Node<NodeData>[] {
    return nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        isManuallyPositioned: false,
      },
    }));
  }

  /**
   * Get initial visible nodes (virtual root + people/pets)
   */
  getInitialVisibleNodes(allNodes: Node<NodeData>[]): Node<NodeData>[] {
    return allNodes.filter(node => 
      node.data.isVirtual || node.data.level <= 2
    );
  }
}

// Export singleton instance
export const elkLayoutService = new ElkLayoutService();