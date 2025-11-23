/**
 * Node Size Mapper
 *
 * Maps node data to Tailwind CSS size classes
 */

import type { NodeData } from '../services/dataService-adapter';

export function getNodeSize(data: NodeData): string {
  if (data.level === 0) return 'w-44 h-44'; // Family root node - largest
  if (data.level === 1) return 'w-32 h-32'; // People nodes

  switch (data.type) {
    case 'person':
      return 'w-28 h-28';
    case 'asset':
      return 'w-24 h-24';
    case 'document':
      return 'w-20 h-20';
    case 'folder':
      return 'w-22 h-22';
    case 'pet':
      return 'w-22 h-22';
    default:
      return 'w-24 h-24';
  }
}

export function getIconSize(data: NodeData): string {
  return data.type === 'person' || data.level === 1 || data.level === 0 ? 'w-8 h-8' : 'w-6 h-6';
}
