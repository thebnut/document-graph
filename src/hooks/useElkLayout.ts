import { useState, useCallback, useEffect } from 'react';
import { Node, Edge, useReactFlow } from 'reactflow';
import { NodeData } from '../services/dataService';
import { elkLayoutService } from '../services/elkLayoutService';
import { VIRTUAL_ROOT_ID } from '../utils/elkAdapter';

interface UseElkLayoutProps {
  initialNodes: Node<NodeData>[];
  edges: Edge[];
  onNodesChange: (nodes: Node<NodeData>[]) => void;
}

export const useElkLayout = ({ 
  initialNodes, 
  edges, 
  onNodesChange 
}: UseElkLayoutProps) => {
  const reactFlowInstance = useReactFlow();
  const [isLayouting, setIsLayouting] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set([VIRTUAL_ROOT_ID]));
  const [allNodesData, setAllNodesData] = useState<Node<NodeData>[]>([]);

  // Initialize nodes with virtual root
  useEffect(() => {
    const { nodes: preparedNodes } = elkLayoutService.prepareNodesWithVirtualRoot(initialNodes);
    setAllNodesData(preparedNodes);
  }, [initialNodes]);

  // Apply layout whenever nodes or expansion state changes
  const applyLayout = useCallback(async (preserveManualPositions = true) => {
    if (allNodesData.length === 0) return;
    
    setIsLayouting(true);
    try {
      const layoutedNodes = await elkLayoutService.applyRadialLayout(
        allNodesData,
        edges,
        expandedNodes,
        preserveManualPositions
      );
      
      onNodesChange(layoutedNodes);
      
      // Update internal state
      setAllNodesData(prev => {
        const positionMap = new Map(layoutedNodes.map(n => [n.id, n.position]));
        return prev.map(node => ({
          ...node,
          position: positionMap.get(node.id) || node.position,
        }));
      });
    } catch (error) {
      console.error('Layout failed:', error);
    } finally {
      setIsLayouting(false);
    }
  }, [allNodesData, edges, expandedNodes, onNodesChange]);

  // Handle node expansion/collapse
  const toggleNodeExpansion = useCallback((nodeId: string) => {
    if (nodeId === VIRTUAL_ROOT_ID) return; // Virtual root always expanded
    
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        // Collapsing: remove this node and all descendants
        newSet.delete(nodeId);
        // TODO: Get descendants and remove them too
      } else {
        // Expanding: add this node
        newSet.add(nodeId);
      }
      return newSet;
    });
  }, []);

  // Handle node drag
  const handleNodeDragStop = useCallback((event: React.MouseEvent, node: Node) => {
    setAllNodesData(prev => prev.map(n => 
      n.id === node.id 
        ? { ...n, position: node.position, data: { ...n.data, isManuallyPositioned: true } }
        : n
    ));
  }, []);

  // Reset layout
  const resetLayout = useCallback(async () => {
    // Clear expanded nodes except virtual root
    setExpandedNodes(new Set([VIRTUAL_ROOT_ID]));
    
    // Reset manual positioning
    const resetNodes = elkLayoutService.resetLayout(allNodesData);
    setAllNodesData(resetNodes);
    
    // Apply fresh layout
    await applyLayout(false);
    
    // Fit view to initial nodes
    setTimeout(() => {
      const visibleNodes = elkLayoutService.getInitialVisibleNodes(resetNodes);
      reactFlowInstance.fitView({
        nodes: visibleNodes.filter((n: Node<NodeData>) => !n.data.isVirtual), // Don't include virtual root in fit
        duration: 800,
        padding: 0.5,
      });
    }, 100);
  }, [allNodesData, applyLayout, reactFlowInstance]);

  // Filter nodes for display (hide virtual root if configured)
  const getDisplayNodes = useCallback((nodes: Node<NodeData>[]): Node<NodeData>[] => {
    return nodes.map(node => {
      if (node.data.isVirtual && node.data.hideInView) {
        // Make virtual root invisible but keep it in the layout
        return {
          ...node,
          hidden: true,
          style: { opacity: 0, pointerEvents: 'none' },
        };
      }
      return node;
    });
  }, []);

  // Apply initial layout
  useEffect(() => {
    if (allNodesData.length > 0) {
      applyLayout();
    }
  }, [expandedNodes, allNodesData.length, applyLayout]); // Re-layout when expansion changes

  return {
    nodes: allNodesData,
    displayNodes: getDisplayNodes(allNodesData),
    expandedNodes,
    isLayouting,
    toggleNodeExpansion,
    handleNodeDragStop,
    resetLayout,
    applyLayout,
  };
};