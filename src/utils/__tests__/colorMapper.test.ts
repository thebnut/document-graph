/**
 * Tests for colorMapper utility
 *
 * Tests node color gradient mappings based on node type, level, and properties
 */

import { getNodeColor } from '../colorMapper';
import { createMockEntity } from '../../test-utils/mockFactories';
import type { NodeData } from '../../services/dataService-adapter';

describe('colorMapper', () => {
  describe('getNodeColor', () => {
    it('should return purple gradient for family root node (level 0)', () => {
      const data: NodeData = {
        ...createMockEntity(),
        level: 0,
        type: 'person',
      };

      const result = getNodeColor(data);

      expect(result).toContain('indigo-500');
      expect(result).toContain('purple-600');
      expect(result).toContain('bg-gradient-to-br');
    });

    it('should return purple gradient for node with isRootNode flag', () => {
      const data: NodeData = {
        ...createMockEntity(),
        level: 1,
        type: 'person',
        isRootNode: true,
      };

      const result = getNodeColor(data);

      expect(result).toContain('indigo-500');
      expect(result).toContain('purple-600');
    });

    it('should return blue gradient for person type', () => {
      const data: NodeData = {
        ...createMockEntity(),
        type: 'person',
        level: 1,
      };

      const result = getNodeColor(data);

      expect(result).toContain('blue-400');
      expect(result).toContain('blue-600');
      expect(result).toContain('hover:from-blue-500');
    });

    it('should return blue gradient for pet type', () => {
      const data: NodeData = {
        ...createMockEntity(),
        type: 'pet',
        level: 2,
      };

      const result = getNodeColor(data);

      expect(result).toContain('blue-400');
      expect(result).toContain('blue-600');
    });

    it('should return green gradient for asset type', () => {
      const data: NodeData = {
        ...createMockEntity(),
        type: 'asset',
        level: 2,
      };

      const result = getNodeColor(data);

      expect(result).toContain('green-400');
      expect(result).toContain('green-600');
    });

    it('should return purple gradient for document type', () => {
      const data: NodeData = {
        ...createMockEntity(),
        type: 'document',
        level: 3,
      };

      const result = getNodeColor(data);

      expect(result).toContain('purple-400');
      expect(result).toContain('purple-600');
    });

    describe('folder types', () => {
      it('should return amber gradient for identity folder', () => {
        const data: NodeData = {
          ...createMockEntity(),
          type: 'folder',
          subtype: 'identity',
          level: 2,
        };

        const result = getNodeColor(data);

        expect(result).toContain('amber-400');
        expect(result).toContain('amber-600');
      });

      it('should return red gradient for health folder', () => {
        const data: NodeData = {
          ...createMockEntity(),
          type: 'folder',
          subtype: 'health',
          level: 2,
        };

        const result = getNodeColor(data);

        expect(result).toContain('red-400');
        expect(result).toContain('red-600');
      });

      it('should return emerald gradient for financial folder', () => {
        const data: NodeData = {
          ...createMockEntity(),
          type: 'folder',
          subtype: 'financial',
          level: 2,
        };

        const result = getNodeColor(data);

        expect(result).toContain('emerald-400');
        expect(result).toContain('emerald-600');
      });

      it('should return indigo gradient for generic folder', () => {
        const data: NodeData = {
          ...createMockEntity(),
          type: 'folder',
          level: 2,
        };

        const result = getNodeColor(data);

        expect(result).toContain('indigo-400');
        expect(result).toContain('indigo-600');
      });
    });

    it('should return gray gradient for unknown type', () => {
      const data: NodeData = {
        ...createMockEntity(),
        type: 'unknown' as any,
        level: 2,
      };

      const result = getNodeColor(data);

      expect(result).toContain('gray-400');
      expect(result).toContain('gray-600');
    });

    it('should include hover classes in gradient strings', () => {
      const data: NodeData = {
        ...createMockEntity(),
        type: 'person',
        level: 1,
      };

      const result = getNodeColor(data);

      expect(result).toMatch(/hover:from-.*hover:to-/);
    });
  });
});
