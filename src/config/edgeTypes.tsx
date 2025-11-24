/**
 * ReactFlow Edge Types Configuration
 * Uses smart edges with A* pathfinding to avoid node collisions
 */

import type { EdgeTypes } from '@xyflow/react';
import { SmartStepEdge } from '@tisoap/react-flow-smart-edge';

export const edgeTypes: EdgeTypes = {
  // Smart edge that routes around nodes using A* pathfinding
  smart: SmartStepEdge,
};

/**
 * Default edge options for smart edges
 * These ensure smooth, collision-free routing
 */
export const defaultEdgeOptions = {
  type: 'smart',
  animated: false,
  style: {
    strokeWidth: 2,
    stroke: '#b1b1b7', // Neutral gray for light mode
  },
  // Smart edge specific options
  options: {
    drawEdge: true,
    generatePath: undefined, // Uses default A* pathfinding
    nodePadding: 10, // Padding around nodes for pathfinding
  },
};

/**
 * Get edge options with dark mode support
 */
export const getEdgeOptions = (darkMode: boolean) => ({
  ...defaultEdgeOptions,
  style: {
    ...defaultEdgeOptions.style,
    stroke: darkMode ? '#6b7280' : '#b1b1b7', // Darker gray for dark mode
  },
});
