/**
 * Tests for sizeMapper utility
 *
 * Tests node and icon sizing logic based on node type and level
 */

import { getNodeSize, getIconSize } from '../sizeMapper';
import { createMockEntity } from '../../test-utils/mockFactories';
import type { NodeData } from '../../services/dataService-adapter';

describe('sizeMapper', () => {
  describe('getNodeSize', () => {
    it('should return w-44 h-44 for level 0 (family root)', () => {
      const data: NodeData = {
        ...createMockEntity(),
        level: 0,
        type: 'person',
      };

      const result = getNodeSize(data);

      expect(result).toBe('w-44 h-44');
    });

    it('should return w-32 h-32 for level 1 (people)', () => {
      const data: NodeData = {
        ...createMockEntity(),
        level: 1,
        type: 'person',
      };

      const result = getNodeSize(data);

      expect(result).toBe('w-32 h-32');
    });

    it('should return w-28 h-28 for person type (other levels)', () => {
      const data: NodeData = {
        ...createMockEntity(),
        type: 'person',
        level: 2,
      };

      const result = getNodeSize(data);

      expect(result).toBe('w-28 h-28');
    });

    it('should return w-24 h-24 for asset type', () => {
      const data: NodeData = {
        ...createMockEntity(),
        type: 'asset',
        level: 2,
      };

      const result = getNodeSize(data);

      expect(result).toBe('w-24 h-24');
    });

    it('should return w-20 h-20 for document type', () => {
      const data: NodeData = {
        ...createMockEntity(),
        type: 'document',
        level: 3,
      };

      const result = getNodeSize(data);

      expect(result).toBe('w-20 h-20');
    });

    it('should return w-22 h-22 for folder type', () => {
      const data: NodeData = {
        ...createMockEntity(),
        type: 'folder',
        level: 2,
      };

      const result = getNodeSize(data);

      expect(result).toBe('w-22 h-22');
    });

    it('should return w-22 h-22 for pet type', () => {
      const data: NodeData = {
        ...createMockEntity(),
        type: 'pet',
        level: 2,
      };

      const result = getNodeSize(data);

      expect(result).toBe('w-22 h-22');
    });

    it('should return w-24 h-24 for unknown type', () => {
      const data: NodeData = {
        ...createMockEntity(),
        type: 'unknown' as any,
        level: 2,
      };

      const result = getNodeSize(data);

      expect(result).toBe('w-24 h-24');
    });

    it('should prioritize level 0 over type', () => {
      const data: NodeData = {
        ...createMockEntity(),
        level: 0,
        type: 'document', // Even though it's a document
      };

      const result = getNodeSize(data);

      expect(result).toBe('w-44 h-44'); // Should return level 0 size
    });

    it('should prioritize level 1 over type', () => {
      const data: NodeData = {
        ...createMockEntity(),
        level: 1,
        type: 'asset', // Even though it's an asset
      };

      const result = getNodeSize(data);

      expect(result).toBe('w-32 h-32'); // Should return level 1 size
    });
  });

  describe('getIconSize', () => {
    it('should return w-8 h-8 for level 0', () => {
      const data: NodeData = {
        ...createMockEntity(),
        level: 0,
        type: 'person',
      };

      const result = getIconSize(data);

      expect(result).toBe('w-8 h-8');
    });

    it('should return w-8 h-8 for level 1', () => {
      const data: NodeData = {
        ...createMockEntity(),
        level: 1,
        type: 'person',
      };

      const result = getIconSize(data);

      expect(result).toBe('w-8 h-8');
    });

    it('should return w-8 h-8 for person type', () => {
      const data: NodeData = {
        ...createMockEntity(),
        type: 'person',
        level: 2,
      };

      const result = getIconSize(data);

      expect(result).toBe('w-8 h-8');
    });

    it('should return w-6 h-6 for document type', () => {
      const data: NodeData = {
        ...createMockEntity(),
        type: 'document',
        level: 3,
      };

      const result = getIconSize(data);

      expect(result).toBe('w-6 h-6');
    });

    it('should return w-6 h-6 for asset type at level 2', () => {
      const data: NodeData = {
        ...createMockEntity(),
        type: 'asset',
        level: 2,
      };

      const result = getIconSize(data);

      expect(result).toBe('w-6 h-6');
    });

    it('should return w-6 h-6 for folder type', () => {
      const data: NodeData = {
        ...createMockEntity(),
        type: 'folder',
        level: 2,
      };

      const result = getIconSize(data);

      expect(result).toBe('w-6 h-6');
    });
  });
});
