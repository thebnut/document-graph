/**
 * ReactFlow Edge Types Configuration
 * Uses simple straight edges for clean radial layouts
 */

import type { EdgeTypes } from '@xyflow/react';

// No custom edge types needed - using built-in straight edges
export const edgeTypes: EdgeTypes = {};

/**
 * Default edge options for straight edges
 * Clean, direct lines for radial layouts
 */
export const defaultEdgeOptions = {
  type: 'straight',
  animated: false,
  style: {
    strokeWidth: 2,
    stroke: '#b1b1b7', // Neutral gray for light mode
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
