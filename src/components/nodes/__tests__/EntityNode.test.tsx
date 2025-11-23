/**
 * Tests for EntityNode component
 *
 * Tests node rendering, tooltips, and expansion indicators
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EntityNode } from '../EntityNode';
import type { NodeData } from '../../../services/dataService-adapter';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  ChevronRight: () => <div data-testid="chevron-right">ChevronRight</div>,
  ChevronDown: () => <div data-testid="chevron-down">ChevronDown</div>,
  User: () => <div data-testid="user-icon">User</div>,
  Users: () => <div data-testid="users-icon">Users</div>,
  Trees: () => <div data-testid="trees-icon">Trees</div>,
  Folder: () => <div data-testid="folder-icon">Folder</div>,
  FileText: () => <div data-testid="file-text-icon">FileText</div>,
  Dog: () => <div data-testid="dog-icon">Dog</div>,
  Home: () => <div data-testid="home-icon">Home</div>,
  Car: () => <div data-testid="car-icon">Car</div>,
  Briefcase: () => <div data-testid="briefcase-icon">Briefcase</div>,
}));

// Mock reactflow Handle component
jest.mock('reactflow', () => ({
  Handle: ({ type, position }: { type: string; position: string }) => (
    <div data-testid={`handle-${type}-${position}`}>{type}</div>
  ),
  Position: {
    Top: 'top',
    Bottom: 'bottom',
  },
}));

describe('EntityNode', () => {
  const createMockNodeData = (overrides?: Partial<NodeData>): NodeData => ({
    id: 'test-id',
    label: 'Test Node',
    type: 'person',
    level: 1,
    childrenCount: 0,
    isExpanded: false,
    ...overrides,
  });

  const mockHandlers = {
    onShowTooltip: jest.fn(),
    onHideTooltip: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic rendering', () => {
    it('should render node with label', () => {
      const data = createMockNodeData({ label: 'John Doe' });
      render(<EntityNode data={data} id="test-1" {...mockHandlers} />);
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should render node without tooltip handlers', () => {
      const data = createMockNodeData();
      render(<EntityNode data={data} id="test-1" />);
      expect(screen.getByText('Test Node')).toBeInTheDocument();
    });
  });

  describe('Handles', () => {
    it('should not render input handle for level 0 (family root)', () => {
      const data = createMockNodeData({ level: 0 });
      const { container } = render(<EntityNode data={data} id="test-1" {...mockHandlers} />);
      expect(container.querySelector('[data-testid="handle-target-top"]')).not.toBeInTheDocument();
    });

    it('should render input handle for level > 0', () => {
      const data = createMockNodeData({ level: 1 });
      const { container } = render(<EntityNode data={data} id="test-1" {...mockHandlers} />);
      expect(container.querySelector('[data-testid="handle-target-top"]')).toBeInTheDocument();
    });

    it('should render output handle for level < 3', () => {
      const data = createMockNodeData({ level: 2 });
      const { container } = render(<EntityNode data={data} id="test-1" {...mockHandlers} />);
      expect(container.querySelector('[data-testid="handle-source-bottom"]')).toBeInTheDocument();
    });

    it('should not render output handle for level >= 3', () => {
      const data = createMockNodeData({ level: 3 });
      const { container } = render(<EntityNode data={data} id="test-1" {...mockHandlers} />);
      expect(container.querySelector('[data-testid="handle-source-bottom"]')).not.toBeInTheDocument();
    });
  });

  describe('Children count', () => {
    it('should display children count when present', () => {
      const data = createMockNodeData({ childrenCount: 5 });
      render(<EntityNode data={data} id="test-1" {...mockHandlers} />);
      expect(screen.getByText('(5)')).toBeInTheDocument();
    });

    it('should not display children count when zero', () => {
      const data = createMockNodeData({ childrenCount: 0 });
      render(<EntityNode data={data} id="test-1" {...mockHandlers} />);
      expect(screen.queryByText('(0)')).not.toBeInTheDocument();
    });

    it('should not display children count when undefined', () => {
      const data = createMockNodeData({ childrenCount: undefined });
      render(<EntityNode data={data} id="test-1" {...mockHandlers} />);
      expect(screen.queryByText(/\(\d+\)/)).not.toBeInTheDocument();
    });
  });

  describe('Expansion indicator', () => {
    it('should show expansion indicator when node has children', () => {
      const data = createMockNodeData({ childrenCount: 3 });
      const { container } = render(<EntityNode data={data} id="test-1" {...mockHandlers} />);
      expect(
        container.querySelector('[data-testid="chevron-right"]') ||
        container.querySelector('[data-testid="chevron-down"]')
      ).toBeInTheDocument();
    });

    it('should not show expansion indicator when node has no children', () => {
      const data = createMockNodeData({ childrenCount: 0 });
      const { container } = render(<EntityNode data={data} id="test-1" {...mockHandlers} />);
      expect(container.querySelector('[data-testid="chevron-right"]')).not.toBeInTheDocument();
      expect(container.querySelector('[data-testid="chevron-down"]')).not.toBeInTheDocument();
    });

    it('should show ChevronRight when node is not expanded', () => {
      const data = createMockNodeData({ childrenCount: 3, isExpanded: false });
      const { container } = render(<EntityNode data={data} id="test-1" {...mockHandlers} />);
      expect(container.querySelector('[data-testid="chevron-right"]')).toBeInTheDocument();
    });

    it('should show ChevronDown when node is expanded', () => {
      const data = createMockNodeData({ childrenCount: 3, isExpanded: true });
      const { container } = render(<EntityNode data={data} id="test-1" {...mockHandlers} />);
      expect(container.querySelector('[data-testid="chevron-down"]')).toBeInTheDocument();
    });
  });

  describe('Tooltip interactions', () => {
    it('should call onShowTooltip on mouse enter', () => {
      const data = createMockNodeData({ label: 'Test Node' });
      const { container } = render(<EntityNode data={data} id="test-1" {...mockHandlers} />);

      const node = container.querySelector('[class*="rounded-full"]');
      expect(node).toBeInTheDocument();

      if (node) {
        fireEvent.mouseEnter(node);
        expect(mockHandlers.onShowTooltip).toHaveBeenCalledTimes(1);
        expect(mockHandlers.onShowTooltip).toHaveBeenCalledWith(
          'test-1',
          data,
          expect.any(Object)
        );
      }
    });

    it('should call onHideTooltip on mouse leave', () => {
      const data = createMockNodeData();
      const { container } = render(<EntityNode data={data} id="test-1" {...mockHandlers} />);

      const node = container.querySelector('[class*="rounded-full"]');
      expect(node).toBeInTheDocument();

      if (node) {
        fireEvent.mouseLeave(node);
        expect(mockHandlers.onHideTooltip).toHaveBeenCalledTimes(1);
      }
    });

    it('should not error when tooltip handlers are not provided', () => {
      const data = createMockNodeData();
      const { container } = render(<EntityNode data={data} id="test-1" />);

      const node = container.querySelector('[class*="rounded-full"]');
      expect(node).toBeInTheDocument();

      if (node) {
        expect(() => {
          fireEvent.mouseEnter(node);
          fireEvent.mouseLeave(node);
        }).not.toThrow();
      }
    });
  });

  describe('Styling based on data', () => {
    it('should apply different styles for level 0 (family root)', () => {
      const data = createMockNodeData({ level: 0, label: 'Family Root' });
      const { container } = render(<EntityNode data={data} id="test-1" {...mockHandlers} />);

      // Level 0 should have larger text (text-base)
      const label = screen.getByText('Family Root');
      expect(label).toHaveClass('text-base');
    });

    it('should apply different styles for level 1 (people)', () => {
      const data = createMockNodeData({ level: 1, type: 'person', label: 'John Doe' });
      const { container } = render(<EntityNode data={data} id="test-1" {...mockHandlers} />);

      // Level 1 should have larger text (text-base)
      const label = screen.getByText('John Doe');
      expect(label).toHaveClass('text-base');
    });

    it('should apply different styles for person type', () => {
      const data = createMockNodeData({ level: 2, type: 'person', label: 'Test Person' });
      const { container } = render(<EntityNode data={data} id="test-1" {...mockHandlers} />);

      // Person type at level 2 should have base text size
      const label = screen.getByText('Test Person');
      expect(label).toHaveClass('text-base');
    });

    it('should apply smaller text for non-person types at level > 1', () => {
      const data = createMockNodeData({ level: 3, type: 'document', label: 'Test Doc' });
      const { container } = render(<EntityNode data={data} id="test-1" {...mockHandlers} />);

      // Other types should have smaller text (text-xs)
      const label = screen.getByText('Test Doc');
      expect(label).toHaveClass('text-xs');
    });
  });

  describe('Different node types', () => {
    it('should render person node', () => {
      const data = createMockNodeData({ type: 'person', label: 'John' });
      render(<EntityNode data={data} id="test-1" {...mockHandlers} />);
      expect(screen.getByText('John')).toBeInTheDocument();
    });

    it('should render pet node', () => {
      const data = createMockNodeData({ type: 'pet', label: 'Fluffy' });
      render(<EntityNode data={data} id="test-1" {...mockHandlers} />);
      expect(screen.getByText('Fluffy')).toBeInTheDocument();
    });

    it('should render asset node', () => {
      const data = createMockNodeData({ type: 'asset', label: 'House' });
      render(<EntityNode data={data} id="test-1" {...mockHandlers} />);
      expect(screen.getByText('House')).toBeInTheDocument();
    });

    it('should render document node', () => {
      const data = createMockNodeData({ type: 'document', label: 'Passport' });
      render(<EntityNode data={data} id="test-1" {...mockHandlers} />);
      expect(screen.getByText('Passport')).toBeInTheDocument();
    });

    it('should render folder node', () => {
      const data = createMockNodeData({ type: 'folder', label: 'Documents' });
      render(<EntityNode data={data} id="test-1" {...mockHandlers} />);
      expect(screen.getByText('Documents')).toBeInTheDocument();
    });
  });
});
