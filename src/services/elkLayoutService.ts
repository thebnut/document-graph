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
      return { nodes, edges: [] };
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
    return allNodes.filter(node => {
      const nodeData = node.data;

      // Always show virtual root
      if (nodeData.isVirtual) return true;

      // Always show level 1 and 2 (adjusted from original 1 and 2)
      if (nodeData.level <= 2) return true;

      // For other nodes, check if ALL parent nodes in the chain are expanded
      if (nodeData.parentIds) {
        // Check immediate parent first
        const immediateParentExpanded = nodeData.parentIds.some(parentId => 
          expandedNodes.has(parentId)
        );
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
    
    // Combine all edges
    const allEdges = [...edges, ...virtualEdges];
    
    // Filter visible nodes
    const visibleNodes = this.filterVisibleNodes(preparedNodes, expandedNodes);
    
    // Calculate layout
    const layoutedNodes = await calculateElkLayout(visibleNodes, allEdges, expandedNodes);
    
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