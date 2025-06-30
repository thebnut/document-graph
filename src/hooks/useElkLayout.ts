import { useState, useCallback, useEffect, useRef } from 'react';
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
  const layoutingRef = useRef(false);

  // Initialize nodes with virtual root
  useEffect(() => {
    console.log('[useElkLayout] Initializing with nodes:', initialNodes.length);
    const { nodes: preparedNodes } = elkLayoutService.prepareNodesWithVirtualRoot(initialNodes);
    console.log('[useElkLayout] Prepared nodes with virtual root:', preparedNodes.length, preparedNodes);
    setAllNodesData(preparedNodes);
    // Start with only virtual root expanded - users will click to expand nodes
  }, [initialNodes]);

  // Filter nodes based on expansion state
  const getDisplayNodes = useCallback((nodes: Node<NodeData>[]): Node<NodeData>[] => {
    const visibleNodes = elkLayoutService.filterVisibleNodes(nodes, expandedNodes);
    console.log('[useElkLayout] getDisplayNodes: input', nodes.length, 'output', visibleNodes.length, visibleNodes);
    return visibleNodes;
  }, [expandedNodes]);

  // Apply layout whenever nodes or expansion state changes
  const applyLayout = useCallback(async (preserveManualPositions = true) => {
    console.log('[useElkLayout] applyLayout called with', allNodesData.length, 'nodes and', edges.length, 'edges');
    if (allNodesData.length === 0) return;
    
    // Prevent simultaneous layout calculations
    if (layoutingRef.current) {
      console.log('[useElkLayout] Layout already in progress, skipping');
      return;
    }
    
    layoutingRef.current = true;
    setIsLayouting(true);
    try {
      const layoutedNodes = await elkLayoutService.applyRadialLayout(
        allNodesData,
        edges,
        expandedNodes,
        preserveManualPositions
      );
      
      console.log('[useElkLayout] Layout complete, nodes with positions:', layoutedNodes.length, layoutedNodes);
      
      // Mark nodes as hidden instead of filtering them out
      const visibleNodeIds = new Set(getDisplayNodes(layoutedNodes).map(n => n.id));
      const layoutedNodesWithVisibility = layoutedNodes.map(node => ({
        ...node,
        hidden: !visibleNodeIds.has(node.id)
      }));
      
      console.log('[useElkLayout] Passing all nodes to ReactFlow with hidden property:', 
        layoutedNodesWithVisibility.length, 
        'visible:', layoutedNodesWithVisibility.filter(n => !n.hidden).length);
      
      // Use setNodes to update ReactFlow state
      if (typeof onNodesChange === 'function') {
        // If it's the setNodes function from useNodesState, call it directly
        onNodesChange(layoutedNodesWithVisibility);
      }
      
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
      layoutingRef.current = false;
    }
  }, [allNodesData, edges, expandedNodes, onNodesChange, getDisplayNodes]);

  // Handle node expansion/collapse
  const toggleNodeExpansion = useCallback((nodeId: string) => {
    console.log('[useElkLayout] toggleNodeExpansion called for:', nodeId);
    if (nodeId === VIRTUAL_ROOT_ID) return; // Virtual root always expanded
    
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      console.log('[useElkLayout] Current expandedNodes:', Array.from(prev));
      
      if (newSet.has(nodeId)) {
        // Collapsing: remove this node and all descendants
        newSet.delete(nodeId);
        console.log('[useElkLayout] Collapsing node:', nodeId);
        // TODO: Get descendants and remove them too
      } else {
        // Expanding: add this node
        newSet.add(nodeId);
        console.log('[useElkLayout] Expanding node:', nodeId);
      }
      
      console.log('[useElkLayout] New expandedNodes:', Array.from(newSet));
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

  // Apply initial layout
  useEffect(() => {
    console.log('[useElkLayout] Initial layout effect triggered - nodes:', allNodesData.length, 'edges:', edges.length);
    if (allNodesData.length > 0 && expandedNodes.size > 0 && edges.length > 0) {
      applyLayout();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allNodesData.length, edges]); // Run when nodes and edges are loaded
  
  // Apply layout when expansion changes
  useEffect(() => {
    if (allNodesData.length > 0 && expandedNodes.size > 0 && edges.length > 0) {
      applyLayout();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandedNodes]); // Re-layout when expansion changes

  return {
    nodes: allNodesData,
    expandedNodes,
    isLayouting,
    toggleNodeExpansion,
    handleNodeDragStop,
    resetLayout,
    applyLayout,
  };
};