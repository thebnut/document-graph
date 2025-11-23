/**
 * Node Color Mapper
 *
 * Maps node data to Tailwind CSS gradient classes
 */

import type { NodeData } from '../services/dataService-adapter';

export function getNodeColor(data: NodeData): string {
  // Special color for family root node
  if (data.isRootNode || data.level === 0) {
    return 'bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700';
  }

  switch (data.type) {
    case 'person':
    case 'pet':
      return 'bg-gradient-to-br from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700';
    case 'asset':
      return 'bg-gradient-to-br from-green-400 to-green-600 hover:from-green-500 hover:to-green-700';
    case 'document':
      return 'bg-gradient-to-br from-purple-400 to-purple-600 hover:from-purple-500 hover:to-purple-700';
    case 'folder':
      // Different colors for different folder types
      switch (data.subtype) {
        case 'identity':
          return 'bg-gradient-to-br from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700';
        case 'health':
          return 'bg-gradient-to-br from-red-400 to-red-600 hover:from-red-500 hover:to-red-700';
        case 'financial':
          return 'bg-gradient-to-br from-emerald-400 to-emerald-600 hover:from-emerald-500 hover:to-emerald-700';
        default:
          return 'bg-gradient-to-br from-indigo-400 to-indigo-600 hover:from-indigo-500 hover:to-indigo-700';
      }
    default:
      return 'bg-gradient-to-br from-gray-400 to-gray-600';
  }
}
