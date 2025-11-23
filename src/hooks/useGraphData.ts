/**
 * useGraphData Hook
 *
 * Manages graph state (nodes, edges, expansion)
 */

import { useState, useCallback } from 'react';
import { useNodesState, useEdgesState } from 'reactflow';
import type { Node, Edge } from 'reactflow';
import { dataService } from '../services/dataService-adapter';
import type { NodeData } from '../services/dataService-adapter';
import type { D3RadialLayoutEngine } from '../services/d3RadialLayoutEngine';

interface UseGraphDataOptions {
  layoutEngine: React.MutableRefObject<D3RadialLayoutEngine>;
}

export function useGraphData({ layoutEngine }: UseGraphDataOptions) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [allNodesData, setAllNodesData] = useState<Node[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Get all descendant IDs recursively
  const getAllDescendantIds = useCallback((nodeId: string): string[] => {
    return dataService.getAllDescendantIds(nodeId);
  }, []);

  // Function to refresh the graph from data model
  const refreshGraphFromDataModel = useCallback(() => {
    // Convert entities to nodes
    const allNodes = dataService.entitiesToNodes();
    console.log('Refreshing graph, loaded nodes:', allNodes.length);

    // Create edges from relationships
    const edgesData = dataService.relationshipsToEdges();
    setEdges(edgesData);

    // Apply radial layout with edges
    const layoutResult = layoutEngine.current.calculateLayout(allNodes, edgesData, {
      preserveManualPositions: true, // Preserve manual positions on refresh
    });
    setAllNodesData(layoutResult.nodes);
    setEdges(layoutResult.edges);

    // Update visible nodes based on current expansion state
    const visibleNodes = layoutResult.nodes.filter((n) => {
      const nodeData = n.data as NodeData;
      // Show root, people, and categories by default
      if (nodeData.level === 0 || nodeData.level === 1 || nodeData.level === 2) {
        return true;
      }
      // Show other nodes if their parent is expanded
      if (nodeData.parentIds && nodeData.parentIds.length > 0) {
        return nodeData.parentIds.some((parentId) => expandedNodes.has(parentId));
      }
      return false;
    });

    setNodes(visibleNodes);
  }, [setNodes, setEdges, expandedNodes, layoutEngine]);

  // Update visible nodes when expansion state changes
  const updateVisibleNodes = useCallback(() => {
    const visibleNodes = allNodesData.filter((n) => {
      const nodeData = n.data as NodeData;
      // Show root, people, and categories by default
      if (nodeData.level === 0 || nodeData.level === 1 || nodeData.level === 2) {
        return true;
      }
      // Show other nodes if their parent is expanded
      if (nodeData.parentIds && nodeData.parentIds.length > 0) {
        return nodeData.parentIds.some((parentId) => expandedNodes.has(parentId));
      }
      return false;
    });

    setNodes(visibleNodes);
  }, [allNodesData, expandedNodes, setNodes]);

  return {
    nodes,
    setNodes,
    onNodesChange,
    edges,
    setEdges,
    onEdgesChange,
    allNodesData,
    setAllNodesData,
    expandedNodes,
    setExpandedNodes,
    getAllDescendantIds,
    refreshGraphFromDataModel,
    updateVisibleNodes,
  };
}
