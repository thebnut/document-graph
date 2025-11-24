import { Node, Edge } from '@xyflow/react';
import { hierarchy, tree, stratify, HierarchyNode } from 'd3-hierarchy';
import { NodeData } from '../services/dataService';
import { EntityType } from '../data/model';

interface LayoutOptions {
  preserveManualPositions?: boolean;
  animationDuration?: number;
  fitViewAfterLayout?: boolean;
}

interface NodeDimensions {
  width: number;
  height: number;
}

interface LayoutResult {
  nodes: Node<Record<string, unknown>>[];
  edges: Edge[];
}

export class D3RadialLayoutEngine {
  private centerX = 400;
  private centerY = 300;
  private maxRadius = 600;

  public calculateLayout(
    nodes: Node<Record<string, unknown>>[],
    edges: Edge[],
    options: LayoutOptions = {}
  ): LayoutResult {
    // Step 0: Inject family root if not present
    const hasRootNode = nodes.some(n => n.id === 'family-root');
    let processedData = { nodes, edges };
    
    if (!hasRootNode) {
      processedData = this.injectFamilyRootNode(nodes, edges);
    }
    
    // Step 1: Convert to hierarchy
    const hierarchyRoot = this.createHierarchy(processedData.nodes, processedData.edges);
    
    // Step 2: Configure radial layout with enhanced separation
    const treeLayout = tree<Node<Record<string, unknown>>>()
      .size([2 * Math.PI, this.maxRadius])
      .separation(this.enhancedRadialSeparation.bind(this));
    
    // Step 3: Apply layout (sets x as angle, y as radius)
    const root = treeLayout(hierarchyRoot);
    
    // Step 4: Convert to ReactFlow nodes with cartesian coords
    let layoutedNodes: Node<Record<string, unknown>>[] = root.descendants().map(d => {
      // Special handling for root node (centered)
      if (d.depth === 0) {
        return {
          ...processedData.nodes.find(n => n.id === d.data.id)!,
          position: { x: this.centerX, y: this.centerY },
          data: {
            ...d.data.data,
            layoutAngle: 0,
            layoutRadius: 0,
            layoutDepth: d.depth
          }
        } as Node<Record<string, unknown>>;
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
      } as Node<Record<string, unknown>>;
    });
    
    // Step 5: Preserve manual positions if requested
    if (options.preserveManualPositions) {
      layoutedNodes = this.preserveManualPositions(layoutedNodes, nodes);
    }
    
    return {
      nodes: layoutedNodes,
      edges: processedData.edges
    };
  }

  private injectFamilyRootNode(
    nodes: Node<Record<string, unknown>>[],
    edges: Edge[]
  ): { nodes: Node<Record<string, unknown>>[], edges: Edge[] } {
    // Create the family root node
    const familyNode: Node<Record<string, unknown>> = {
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
      type: 'smart',
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
  }

  private createHierarchy(nodes: Node<Record<string, unknown>>[], edges: Edge[]): HierarchyNode<Node<Record<string, unknown>>> {
    // Create parent mapping from edges
    const parentMap = new Map<string, string>();
    edges.forEach(edge => {
      parentMap.set(edge.target, edge.source);
    });

    // Ensure we have a family root node
    const rootNode = nodes.find(n => n.id === 'family-root' || (n.data as any).level === 0);
    if (!rootNode) {
      throw new Error('No root node found in hierarchy');
    }

    // Use d3.stratify to build hierarchy
    try {
      const stratifyFunc = stratify<Node<Record<string, unknown>>>()
        .id(d => d.id)
        .parentId(d => {
          // For ReactFlow nodes, get parent from edge mapping
          const parentId = parentMap.get(d.id);
          // Only return parent if it exists in the current node set
          if (parentId && nodes.some(n => n.id === parentId)) {
            return parentId;
          }
          return null;
        });

      return stratifyFunc(nodes);
    } catch (error) {
      console.error('Error creating hierarchy:', error);
      // If stratify fails, create a simple hierarchy with just the root
      return hierarchy({
        id: rootNode.id,
        data: rootNode,
        children: []
      } as any);
    }
  }

  private getNodeDimensions(node: any): NodeDimensions {
    const data = node.data?.data as NodeData;
    if (!data) return { width: 80, height: 80 };
    
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
  }

  private enhancedRadialSeparation(a: any, b: any): number {
    // Base separation using D3's recommended formula
    const baseSeparation = (a.parent === b.parent ? 1 : 2) / a.depth;
    
    // Get node dimensions
    const aSize = this.getNodeDimensions(a);
    const bSize = this.getNodeDimensions(b);
    
    // Calculate required angular separation based on node sizes
    // This prevents overlapping by ensuring enough arc length between nodes
    const avgRadius = (a.y + b.y) / 2 || 300; // Use average radius
    const requiredArcLength = (aSize.width + bSize.width) / 2 + 20; // 20px padding
    const requiredAngle = requiredArcLength / avgRadius;
    
    // Return the larger of base separation or size-based separation
    return Math.max(baseSeparation, requiredAngle);
  }

  private preserveManualPositions(
    layoutedNodes: Node<Record<string, unknown>>[],
    originalNodes: Node<Record<string, unknown>>[]
  ): Node<Record<string, unknown>>[] {
    const manualPositionMap = new Map<string, { x: number; y: number }>();

    // Collect manually positioned nodes
    originalNodes.forEach(node => {
      if ((node.data as any).isManuallyPositioned) {
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
        } as Node<Record<string, unknown>>;
      }
      return node;
    });
  }
}