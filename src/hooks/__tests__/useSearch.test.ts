/**
 * Tests for useSearch hook
 *
 * Tests search query state and node filtering logic
 */

import { renderHook, act } from '@testing-library/react';
import { useSearch } from '../useSearch';
import type { Node } from 'reactflow';
import { createMockEntity } from '../../test-utils/mockFactories';

describe('useSearch', () => {
  const createMockNode = (id: string, label: string, description?: string, type?: string): Node => ({
    id,
    type: 'entity',
    position: { x: 0, y: 0 },
    data: {
      ...createMockEntity(),
      label,
      description,
      type: type || 'person',
    },
  });

  describe('initialization', () => {
    it('should initialize with empty search query', () => {
      const { result } = renderHook(() => useSearch());

      expect(result.current.searchQuery).toBe('');
    });
  });

  describe('setSearchQuery', () => {
    it('should update search query', () => {
      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.setSearchQuery('test');
      });

      expect(result.current.searchQuery).toBe('test');
    });

    it('should handle multiple updates', () => {
      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.setSearchQuery('first');
      });

      expect(result.current.searchQuery).toBe('first');

      act(() => {
        result.current.setSearchQuery('second');
      });

      expect(result.current.searchQuery).toBe('second');
    });
  });

  describe('filterNodesBySearch', () => {
    const mockNodes: Node[] = [
      createMockNode('1', 'John Doe', 'Software Engineer'),
      createMockNode('2', 'Jane Smith', 'Designer', 'person'),
      createMockNode('3', 'Passport', 'Travel document', 'document'),
      createMockNode('4', 'Car Insurance', 'Vehicle coverage', 'document'),
      createMockNode('5', 'House', 'Property asset', 'asset'),
    ];

    it('should return all nodes when query is empty', () => {
      const { result } = renderHook(() => useSearch());

      const filtered = result.current.filterNodesBySearch(mockNodes);

      expect(filtered).toEqual(mockNodes);
      expect(filtered.length).toBe(5);
    });

    it('should return all nodes when query is only whitespace', () => {
      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.setSearchQuery('   ');
      });

      const filtered = result.current.filterNodesBySearch(mockNodes);

      expect(filtered).toEqual(mockNodes);
    });

    it('should filter nodes by label (case-insensitive)', () => {
      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.setSearchQuery('john');
      });

      const filtered = result.current.filterNodesBySearch(mockNodes);

      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('1');
    });

    it('should filter nodes by description (case-insensitive)', () => {
      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.setSearchQuery('engineer');
      });

      const filtered = result.current.filterNodesBySearch(mockNodes);

      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('1');
    });

    it('should filter nodes by type (case-insensitive)', () => {
      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.setSearchQuery('document');
      });

      const filtered = result.current.filterNodesBySearch(mockNodes);

      expect(filtered.length).toBe(2);
      expect(filtered.map((n) => n.id)).toEqual(['3', '4']);
    });

    it('should handle case-insensitive matching', () => {
      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.setSearchQuery('PASSPORT');
      });

      const filtered = result.current.filterNodesBySearch(mockNodes);

      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('3');
    });

    it('should handle partial matches', () => {
      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.setSearchQuery('Insu');
      });

      const filtered = result.current.filterNodesBySearch(mockNodes);

      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('4');
    });

    it('should return empty array when no matches found', () => {
      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.setSearchQuery('nonexistent');
      });

      const filtered = result.current.filterNodesBySearch(mockNodes);

      expect(filtered).toEqual([]);
    });

    it('should handle nodes with undefined description', () => {
      const nodesWithUndefinedDesc: Node[] = [
        createMockNode('1', 'Test', undefined),
        createMockNode('2', 'Another', 'Has description'),
      ];

      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.setSearchQuery('desc');
      });

      const filtered = result.current.filterNodesBySearch(nodesWithUndefinedDesc);

      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('2');
    });
  });

  describe('memoization', () => {
    it('should memoize filterNodesBySearch function', () => {
      const { result, rerender } = renderHook(() => useSearch());

      const firstFilter = result.current.filterNodesBySearch;

      // Rerender without changing search query
      rerender();

      const secondFilter = result.current.filterNodesBySearch;

      expect(firstFilter).toBe(secondFilter);
    });

    it('should create new filterNodesBySearch when search query changes', () => {
      const { result } = renderHook(() => useSearch());

      const firstFilter = result.current.filterNodesBySearch;

      act(() => {
        result.current.setSearchQuery('test');
      });

      const secondFilter = result.current.filterNodesBySearch;

      expect(firstFilter).not.toBe(secondFilter);
    });
  });
});
