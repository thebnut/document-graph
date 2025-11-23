/**
 * Tests for iconMapper utility
 *
 * Tests icon selection logic based on node data properties
 */

import React from 'react';
import { getNodeIcon } from '../iconMapper';
import { createMockEntity } from '../../test-utils/mockFactories';
import type { NodeData } from '../../services/dataService-adapter';
import {
  Trees,
  User,
  Car,
  Home,
  FileText,
  Folder,
  IdCard,
  HeartPulse,
  Banknote,
  Plane,
  Baby,
  Heart,
  Shield,
  DollarSign,
  Hospital,
  Sparkles,
} from 'lucide-react';

describe('iconMapper', () => {
  describe('getNodeIcon', () => {
    it('should return Trees icon for level 0 (family root)', () => {
      const data: NodeData = {
        ...createMockEntity(),
        level: 0,
        type: 'person',
        label: 'Family Root',
      };

      const icon = getNodeIcon(data);

      expect(icon.type).toBe(Trees);
    });

    describe('folder types', () => {
      it('should return IdCard icon for identity folder', () => {
        const data: NodeData = {
          ...createMockEntity(),
          type: 'folder',
          subtype: 'identity',
          label: 'Identity',
          level: 2,
        };

        const icon = getNodeIcon(data);

        expect(icon.type).toBe(IdCard);
      });

      it('should return HeartPulse icon for health folder', () => {
        const data: NodeData = {
          ...createMockEntity(),
          type: 'folder',
          subtype: 'health',
          label: 'Health',
          level: 2,
        };

        const icon = getNodeIcon(data);

        expect(icon.type).toBe(HeartPulse);
      });

      it('should return Banknote icon for financial folder', () => {
        const data: NodeData = {
          ...createMockEntity(),
          type: 'folder',
          subtype: 'financial',
          label: 'Financial',
          level: 2,
        };

        const icon = getNodeIcon(data);

        expect(icon.type).toBe(Banknote);
      });

      it('should return generic Folder icon for unspecified folder', () => {
        const data: NodeData = {
          ...createMockEntity(),
          type: 'folder',
          label: 'Documents',
          level: 2,
        };

        const icon = getNodeIcon(data);

        expect(icon.type).toBe(Folder);
      });
    });

    describe('document categories', () => {
      it('should return Plane icon for passport category', () => {
        const data: NodeData = {
          ...createMockEntity(),
          type: 'document',
          category: 'passport',
          label: 'Passport',
          level: 3,
        };

        const icon = getNodeIcon(data);

        expect(icon.type).toBe(Plane);
      });

      it('should return Car icon for drivers-licence category', () => {
        const data: NodeData = {
          ...createMockEntity(),
          type: 'document',
          category: 'drivers-licence',
          label: "Driver's License",
          level: 3,
        };

        const icon = getNodeIcon(data);

        expect(icon.type).toBe(Car);
      });

      it('should return Baby icon for birth-certificate category', () => {
        const data: NodeData = {
          ...createMockEntity(),
          type: 'document',
          category: 'birth-certificate',
          label: 'Birth Certificate',
          level: 3,
        };

        const icon = getNodeIcon(data);

        expect(icon.type).toBe(Baby);
      });

      it('should return Plane icon for visa category', () => {
        const data: NodeData = {
          ...createMockEntity(),
          type: 'document',
          category: 'visa',
          label: 'Visa',
          level: 3,
        };

        const icon = getNodeIcon(data);

        expect(icon.type).toBe(Plane);
      });

      it('should return Heart icon for medicare category', () => {
        const data: NodeData = {
          ...createMockEntity(),
          type: 'document',
          category: 'medicare',
          label: 'Medicare Card',
          level: 3,
        };

        const icon = getNodeIcon(data);

        expect(icon.type).toBe(Heart);
      });

      it('should return Heart icon for private health insurance', () => {
        const data: NodeData = {
          ...createMockEntity(),
          type: 'document',
          category: 'private-health-insurance',
          label: 'Health Insurance',
          level: 3,
        };

        const icon = getNodeIcon(data);

        expect(icon.type).toBe(Heart);
      });

      it('should return Shield icon for car insurance', () => {
        const data: NodeData = {
          ...createMockEntity(),
          type: 'document',
          category: 'car-insurance',
          label: 'Car Insurance',
          level: 3,
        };

        const icon = getNodeIcon(data);

        expect(icon.type).toBe(Shield);
      });

      it('should return Shield icon for generic insurance', () => {
        const data: NodeData = {
          ...createMockEntity(),
          type: 'document',
          category: 'insurance',
          label: 'Insurance Policy',
          level: 3,
        };

        const icon = getNodeIcon(data);

        expect(icon.type).toBe(Shield);
      });

      it('should return DollarSign icon for financial categories', () => {
        const categories = ['bank-accounts', 'credit-cards', 'superannuation'];

        categories.forEach((category) => {
          const data: NodeData = {
            ...createMockEntity(),
            type: 'document',
            category: category as any,
            label: category,
            level: 3,
          };

          const icon = getNodeIcon(data);

          expect(icon.type).toBe(DollarSign);
        });
      });

      it('should return Hospital icon for health-related categories', () => {
        const categories = ['gp', 'hospital-visits', 'imaging-reports'];

        categories.forEach((category) => {
          const data: NodeData = {
            ...createMockEntity(),
            type: 'document',
            category: category as any,
            label: category,
            level: 3,
          };

          const icon = getNodeIcon(data);

          expect(icon.type).toBe(Hospital);
        });
      });
    });

    describe('label-based icon selection', () => {
      it('should return Sparkles icon for label containing "cleaner"', () => {
        const data: NodeData = {
          ...createMockEntity(),
          type: 'document',
          label: 'House Cleaner Contact',
          level: 3,
        };

        const icon = getNodeIcon(data);

        expect(icon.type).toBe(Sparkles);
      });

      it('should return Trees icon for label containing "gardener"', () => {
        const data: NodeData = {
          ...createMockEntity(),
          type: 'document',
          label: 'Gardener Details',
          level: 3,
        };

        const icon = getNodeIcon(data);

        expect(icon.type).toBe(Trees);
      });

      it('should be case-insensitive for label matching', () => {
        const data: NodeData = {
          ...createMockEntity(),
          type: 'document',
          label: 'CLEANER Contact',
          level: 3,
        };

        const icon = getNodeIcon(data);

        expect(icon.type).toBe(Sparkles);
      });
    });

    describe('type-based icon selection', () => {
      it('should return User icon for person type', () => {
        const data: NodeData = {
          ...createMockEntity(),
          type: 'person',
          label: 'John Doe',
          level: 1,
        };

        const icon = getNodeIcon(data);

        expect(icon.type).toBe(User);
      });

      it('should return User icon for pet type', () => {
        const data: NodeData = {
          ...createMockEntity(),
          type: 'pet',
          label: 'Fluffy',
          level: 2,
        };

        const icon = getNodeIcon(data);

        expect(icon.type).toBe(User);
      });

      it('should return Car icon for vehicle asset', () => {
        const data: NodeData = {
          ...createMockEntity(),
          type: 'asset',
          subtype: 'vehicle',
          label: 'Car',
          level: 2,
        };

        const icon = getNodeIcon(data);

        expect(icon.type).toBe(Car);
      });

      it('should return Home icon for non-vehicle asset', () => {
        const data: NodeData = {
          ...createMockEntity(),
          type: 'asset',
          label: 'House',
          level: 2,
        };

        const icon = getNodeIcon(data);

        expect(icon.type).toBe(Home);
      });

      it('should return FileText icon as default fallback', () => {
        const data: NodeData = {
          ...createMockEntity(),
          type: 'document',
          label: 'Random File',
          level: 3,
        };

        const icon = getNodeIcon(data);

        expect(icon.type).toBe(FileText);
      });
    });

    describe('icon customization', () => {
      it('should apply custom icon class', () => {
        const data: NodeData = {
          ...createMockEntity(),
          type: 'person',
          label: 'John',
          level: 1,
        };

        const icon = getNodeIcon(data, 'w-10 h-10');

        expect(icon.props.className).toBe('w-10 h-10');
      });

      it('should use default w-6 h-6 class when not specified', () => {
        const data: NodeData = {
          ...createMockEntity(),
          type: 'person',
          label: 'John',
          level: 1,
        };

        const icon = getNodeIcon(data);

        expect(icon.props.className).toBe('w-6 h-6');
      });
    });

    it('should prioritize level 0 over all other conditions', () => {
      const data: NodeData = {
        ...createMockEntity(),
        level: 0,
        type: 'document',
        category: 'passport',
        label: 'passport',
      };

      const icon = getNodeIcon(data);

      expect(icon.type).toBe(Trees); // Level 0 takes precedence
    });

    it('should prioritize folder type over category', () => {
      const data: NodeData = {
        ...createMockEntity(),
        type: 'folder',
        subtype: 'health',
        category: 'passport' as any,
        label: 'Health',
        level: 2,
      };

      const icon = getNodeIcon(data);

      expect(icon.type).toBe(HeartPulse); // Folder subtype takes precedence
    });

    it('should prioritize category over label keywords', () => {
      const data: NodeData = {
        ...createMockEntity(),
        type: 'document',
        category: 'passport',
        label: 'cleaner passport', // Has "cleaner" keyword
        level: 3,
      };

      const icon = getNodeIcon(data);

      expect(icon.type).toBe(Plane); // Category takes precedence
    });
  });
});
