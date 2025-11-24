/**
 * useNodeActions Hook
 *
 * Manages node interactions (click, drag, add, reset)
 */

import { useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import { dataService } from '../services/dataService-adapter';
import type { NodeData } from '../services/dataService-adapter';
import type { D3RadialLayoutEngine } from '../services/d3RadialLayoutEngine';

interface UseNodeActionsOptions {
  allNodesData: Node[];
  setAllNodesData: (nodes: Node[] | ((prev: Node[]) => Node[])) => void;
  edges: Edge[];
  setEdges: (edges: Edge[] | ((prev: Edge[]) => Edge[])) => void;
  expandedNodes: Set<string>;
  setExpandedNodes: (nodes: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  getAllDescendantIds: (nodeId: string) => string[];
  layoutEngine: React.MutableRefObject<D3RadialLayoutEngine>;
  hideTooltipImmediately: () => void;
}

export function useNodeActions({
  allNodesData,
  setAllNodesData,
  edges,
  setEdges,
  expandedNodes,
  setExpandedNodes,
  getAllDescendantIds,
  layoutEngine,
  hideTooltipImmediately,
}: UseNodeActionsOptions) {
  const reactFlowInstance = useReactFlow();

  // Handle node drag to mark as manually positioned
  const handleNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setAllNodesData((prev) =>
        prev.map((n) =>
          n.id === node.id ? { ...n, data: { ...n.data, isManuallyPositioned: true } } : n
        )
      );

      // Save position to Google Drive if available
      if (dataService.isUsingGoogleDrive()) {
        dataService.updateUIHints(node.id, {
          position: node.position,
          isManuallyPositioned: true,
        });
      }
    },
    [setAllNodesData]
  );

  // Handle node click to expand/collapse
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      // Hide tooltip immediately on click
      hideTooltipImmediately();

      const nodeData = node.data as NodeData;
      if (nodeData.hasChildren) {
        setExpandedNodes((prev) => {
          const newSet = new Set(prev);
          if (newSet.has(node.id)) {
            // Collapsing: remove this node and all descendants
            newSet.delete(node.id);
            const descendants = getAllDescendantIds(node.id);
            descendants.forEach((id) => newSet.delete(id));

            // Focus on the collapsed node
            setTimeout(() => {
              reactFlowInstance.fitView({
                nodes: [{ id: node.id }],
                duration: 800,
                padding: 2,
              });
            }, 100);
          } else {
            // Expanding: add this node
            newSet.add(node.id);

            // Apply layout to new children while preserving manual positions
            setTimeout(() => {
              const layoutResult = layoutEngine.current.calculateLayout(allNodesData, edges, {
                preserveManualPositions: true,
              });
              setAllNodesData(layoutResult.nodes);
              setEdges(layoutResult.edges);

              const children = layoutResult.nodes.filter((n) =>
                (n.data as NodeData).parentIds?.includes(node.id)
              );
              const nodesToFit = [node, ...children];
              reactFlowInstance.fitView({
                nodes: nodesToFit,
                duration: 800,
                padding: 0.5,
              });
            }, 100);
          }

          // Save expansion state to Google Drive if available
          if (dataService.isUsingGoogleDrive()) {
            dataService.updateUIHints(node.id, {
              expanded: !newSet.has(node.id),
            });
          }

          return newSet;
        });
      }
    },
    [
      allNodesData,
      edges,
      setEdges,
      reactFlowInstance,
      getAllDescendantIds,
      setExpandedNodes,
      setAllNodesData,
      layoutEngine,
      hideTooltipImmediately,
    ]
  );

  // Handle reset canvas
  const handleResetCanvas = useCallback(() => {
    // Clear all expanded nodes
    setExpandedNodes(new Set());

    // Reset manual positioning for all nodes
    const resetNodes = allNodesData.map((node) => ({
      ...node,
      data: {
        ...node.data,
        isManuallyPositioned: false,
      },
    }));

    // Apply radial layout
    const layoutResult = layoutEngine.current.calculateLayout(resetNodes, edges, {
      preserveManualPositions: false,
    });
    setAllNodesData(layoutResult.nodes);

    // Focus on the center with family root, level 1 and 2 nodes
    setTimeout(() => {
      const centerNodes = layoutResult.nodes.filter((n) => {
        const nodeData = n.data as NodeData;
        return nodeData.level === 0 || nodeData.level === 1 || nodeData.level === 2;
      });

      if (centerNodes.length > 0) {
        reactFlowInstance.fitView({
          nodes: centerNodes,
          duration: 800,
          padding: 0.5,
        });
      }
    }, 100);
  }, [allNodesData, edges, setExpandedNodes, setAllNodesData, layoutEngine, reactFlowInstance]);

  // Add new node
  const addNode = useCallback(
    (nodeData: Partial<NodeData>) => {
      if (!nodeData.label) return;

      const newNode: Node = {
        id: `${Date.now()}`,
        type: 'entity',
        position: { x: Math.random() * 500, y: Math.random() * 500 },
        data: nodeData as NodeData,
      };

      setAllNodesData((nds) => [...nds, newNode]);
    },
    [setAllNodesData]
  );

  return {
    handleNodeDragStop,
    onNodeClick,
    handleResetCanvas,
    addNode,
  };
}
