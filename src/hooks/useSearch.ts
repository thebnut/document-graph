/**
 * useSearch Hook
 *
 * Manages search query state and node filtering
 */

import { useState, useMemo } from 'react';
import type { Node } from '@xyflow/react';
import type { NodeData } from '../services/dataService-adapter';

export function useSearch() {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter nodes based on search query
  const filterNodesBySearch = useMemo(
    () => (nodes: Node[]) => {
      if (!searchQuery.trim()) return nodes;

      const query = searchQuery.toLowerCase();
      return nodes.filter((node) => {
        const data = node.data as NodeData;
        return (
          data.label?.toLowerCase().includes(query) ||
          data.description?.toLowerCase().includes(query) ||
          data.type?.toLowerCase().includes(query)
        );
      });
    },
    [searchQuery]
  );

  return {
    searchQuery,
    setSearchQuery,
    filterNodesBySearch,
  };
}
