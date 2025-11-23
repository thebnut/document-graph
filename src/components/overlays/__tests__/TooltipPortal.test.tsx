/**
 * Tests for TooltipPortal component
 *
 * Tests tooltip rendering, portal behavior, and interactions
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TooltipPortal } from '../TooltipPortal';
import { dataService } from '../../../services/dataService-adapter';
import type { TooltipState } from '../../../types/tooltip';
import type { NodeData } from '../../../services/dataService-adapter';

// Mock lucide-react
jest.mock('lucide-react', () => ({
  FileText: () => <div data-testid="file-text-icon">FileText Icon</div>,
}));

// Mock dataService
jest.mock('../../../services/dataService-adapter', () => ({
  dataService: {
    getMetadataDisplay: jest.fn(),
    getEntityById: jest.fn(),
  },
}));

describe('TooltipPortal', () => {
  const mockProps = {
    onMouseEnter: jest.fn(),
    onMouseLeave: jest.fn(),
    onOpenDocument: jest.fn(),
    darkMode: false,
  };

  const createMockTooltipState = (overrides?: Partial<TooltipState>): TooltipState => ({
    show: true,
    nodeId: 'test-node',
    data: {
      id: 'test-id',
      label: 'Test Node',
      type: 'document',
      level: 1,
      description: 'Test description',
    } as NodeData,
    position: { x: 100, y: 200 },
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (dataService.getMetadataDisplay as jest.Mock).mockReturnValue([]);
  });

  describe('Visibility', () => {
    it('should not render when show is false', () => {
      const tooltipState = createMockTooltipState({ show: false });
      const { container } = render(<TooltipPortal {...mockProps} tooltipState={tooltipState} />);
      expect(container.firstChild).toBeNull();
    });

    it('should not render when data is null', () => {
      const tooltipState = createMockTooltipState({ data: null });
      const { container } = render(<TooltipPortal {...mockProps} tooltipState={tooltipState} />);
      expect(container.firstChild).toBeNull();
    });

    it('should render when show is true and data exists', () => {
      const tooltipState = createMockTooltipState();
      render(<TooltipPortal {...mockProps} tooltipState={tooltipState} />);
      expect(screen.getByText('Test Node')).toBeInTheDocument();
    });
  });

  describe('Content rendering', () => {
    it('should display node label', () => {
      const tooltipState = createMockTooltipState({
        data: {
          id: 'test',
          label: 'Custom Label',
          type: 'person',
          level: 1,
        } as NodeData,
      });
      render(<TooltipPortal {...mockProps} tooltipState={tooltipState} />);
      expect(screen.getByText('Custom Label')).toBeInTheDocument();
    });

    it('should display description when present', () => {
      const tooltipState = createMockTooltipState({
        data: {
          id: 'test',
          label: 'Test',
          type: 'document',
          level: 1,
          description: 'This is a test description',
        } as NodeData,
      });
      render(<TooltipPortal {...mockProps} tooltipState={tooltipState} />);
      expect(screen.getByText('This is a test description')).toBeInTheDocument();
    });

    it('should not render description paragraph when description is missing', () => {
      const tooltipState = createMockTooltipState({
        data: {
          id: 'test',
          label: 'Test',
          type: 'person',
          level: 1,
        } as NodeData,
      });
      render(<TooltipPortal {...mockProps} tooltipState={tooltipState} />);
      expect(screen.queryByText('This is a test description')).not.toBeInTheDocument();
    });
  });

  describe('Metadata display', () => {
    it('should display metadata from dataService', () => {
      (dataService.getMetadataDisplay as jest.Mock).mockReturnValue([
        'Owner: John Doe',
        'Created: 2024-01-01',
      ]);

      const tooltipState = createMockTooltipState();
      render(<TooltipPortal {...mockProps} tooltipState={tooltipState} />);

      expect(screen.getByText('Owner: John Doe')).toBeInTheDocument();
      expect(screen.getByText('Created: 2024-01-01')).toBeInTheDocument();
    });

    it('should not render metadata section when empty', () => {
      (dataService.getMetadataDisplay as jest.Mock).mockReturnValue([]);

      const tooltipState = createMockTooltipState();
      const { container } = render(<TooltipPortal {...mockProps} tooltipState={tooltipState} />);

      // Check that no metadata container is rendered
      const metadataElements = container.querySelectorAll('.space-y-1');
      expect(metadataElements.length).toBe(0);
    });
  });

  describe('Expiry date', () => {
    it('should display expiry date when present', () => {
      const tooltipState = createMockTooltipState({
        data: {
          id: 'test',
          label: 'Test',
          type: 'document',
          level: 1,
          expiry: '2025-12-31',
        } as NodeData,
      });
      render(<TooltipPortal {...mockProps} tooltipState={tooltipState} />);
      expect(screen.getByText('Expires: 2025-12-31')).toBeInTheDocument();
    });

    it('should not display expiry when not present', () => {
      const tooltipState = createMockTooltipState({
        data: {
          id: 'test',
          label: 'Test',
          type: 'document',
          level: 1,
        } as NodeData,
      });
      render(<TooltipPortal {...mockProps} tooltipState={tooltipState} />);
      expect(screen.queryByText(/Expires:/)).not.toBeInTheDocument();
    });
  });

  describe('Ownership', () => {
    it('should display shared asset indicator when ownership is shared', () => {
      const tooltipState = createMockTooltipState({
        data: {
          id: 'test',
          label: 'Test',
          type: 'asset',
          level: 1,
          ownership: 'shared',
        } as NodeData,
      });
      render(<TooltipPortal {...mockProps} tooltipState={tooltipState} />);
      expect(screen.getByText('Shared Asset')).toBeInTheDocument();
    });

    it('should not display shared indicator when ownership is not shared', () => {
      const tooltipState = createMockTooltipState({
        data: {
          id: 'test',
          label: 'Test',
          type: 'asset',
          level: 1,
        } as NodeData,
      });
      render(<TooltipPortal {...mockProps} tooltipState={tooltipState} />);
      expect(screen.queryByText('Shared Asset')).not.toBeInTheDocument();
    });
  });

  describe('Source', () => {
    it('should display source when present', () => {
      const tooltipState = createMockTooltipState({
        data: {
          id: 'test',
          label: 'Test',
          type: 'document',
          level: 1,
          source: 'Google Drive',
        } as NodeData,
      });
      render(<TooltipPortal {...mockProps} tooltipState={tooltipState} />);
      expect(screen.getByText('Source: Google Drive')).toBeInTheDocument();
    });

    it('should not display source when not present', () => {
      const tooltipState = createMockTooltipState({
        data: {
          id: 'test',
          label: 'Test',
          type: 'document',
          level: 1,
        } as NodeData,
      });
      render(<TooltipPortal {...mockProps} tooltipState={tooltipState} />);
      expect(screen.queryByText(/Source:/)).not.toBeInTheDocument();
    });
  });

  describe('Open Document button', () => {
    it('should render button when documentPath exists', () => {
      const tooltipState = createMockTooltipState({
        nodeId: 'doc-123',
        data: {
          id: 'test',
          label: 'Test',
          type: 'document',
          level: 1,
          documentPath: '/path/to/doc.pdf',
        } as NodeData,
      });
      render(<TooltipPortal {...mockProps} tooltipState={tooltipState} />);
      expect(screen.getByText('Open Document')).toBeInTheDocument();
    });

    it('should not render button when documentPath is missing', () => {
      const tooltipState = createMockTooltipState({
        data: {
          id: 'test',
          label: 'Test',
          type: 'document',
          level: 1,
        } as NodeData,
      });
      render(<TooltipPortal {...mockProps} tooltipState={tooltipState} />);
      expect(screen.queryByText('Open Document')).not.toBeInTheDocument();
    });

    it('should not render button when nodeId is null', () => {
      const tooltipState = createMockTooltipState({
        nodeId: null,
        data: {
          id: 'test',
          label: 'Test',
          type: 'document',
          level: 1,
          documentPath: '/path/to/doc.pdf',
        } as NodeData,
      });
      render(<TooltipPortal {...mockProps} tooltipState={tooltipState} />);
      expect(screen.queryByText('Open Document')).not.toBeInTheDocument();
    });

    it('should call onOpenDocument when button is clicked', () => {
      (dataService.getEntityById as jest.Mock).mockReturnValue({ id: 'entity-123' });

      const tooltipState = createMockTooltipState({
        nodeId: 'doc-123',
        data: {
          id: 'test',
          label: 'Test',
          type: 'document',
          level: 1,
          documentPath: '/path/to/doc.pdf',
        } as NodeData,
      });
      render(<TooltipPortal {...mockProps} tooltipState={tooltipState} />);

      const button = screen.getByText('Open Document');
      fireEvent.click(button);

      expect(dataService.getEntityById).toHaveBeenCalledWith('doc-123');
      expect(mockProps.onOpenDocument).toHaveBeenCalledWith('entity-123');
    });

    it('should not call onOpenDocument when entity is not found', () => {
      (dataService.getEntityById as jest.Mock).mockReturnValue(null);

      const tooltipState = createMockTooltipState({
        nodeId: 'doc-123',
        data: {
          id: 'test',
          label: 'Test',
          type: 'document',
          level: 1,
          documentPath: '/path/to/doc.pdf',
        } as NodeData,
      });
      render(<TooltipPortal {...mockProps} tooltipState={tooltipState} />);

      const button = screen.getByText('Open Document');
      fireEvent.click(button);

      expect(dataService.getEntityById).toHaveBeenCalledWith('doc-123');
      expect(mockProps.onOpenDocument).not.toHaveBeenCalled();
    });
  });

  describe('Mouse events', () => {
    it('should call onMouseEnter when mouse enters tooltip', () => {
      const tooltipState = createMockTooltipState();
      render(<TooltipPortal {...mockProps} tooltipState={tooltipState} />);

      const tooltip = document.body.querySelector('.fixed');
      expect(tooltip).toBeTruthy();
      if (tooltip) {
        fireEvent.mouseEnter(tooltip);
        expect(mockProps.onMouseEnter).toHaveBeenCalledTimes(1);
      }
    });

    it('should call onMouseLeave when mouse leaves tooltip', () => {
      const tooltipState = createMockTooltipState();
      render(<TooltipPortal {...mockProps} tooltipState={tooltipState} />);

      const tooltip = document.body.querySelector('.fixed');
      expect(tooltip).toBeTruthy();
      if (tooltip) {
        fireEvent.mouseLeave(tooltip);
        expect(mockProps.onMouseLeave).toHaveBeenCalledTimes(1);
      }
    });
  });

  describe('Positioning', () => {
    it('should position tooltip at specified coordinates', () => {
      const tooltipState = createMockTooltipState({
        position: { x: 300, y: 400 },
      });
      render(<TooltipPortal {...mockProps} tooltipState={tooltipState} />);

      const tooltip = document.body.querySelector('.fixed') as HTMLElement;
      expect(tooltip).toBeTruthy();
      expect(tooltip.style.left).toBe('300px');
      expect(tooltip.style.top).toBe('400px');
    });

    it('should center tooltip horizontally with transform', () => {
      const tooltipState = createMockTooltipState();
      render(<TooltipPortal {...mockProps} tooltipState={tooltipState} />);

      const tooltip = document.body.querySelector('.fixed') as HTMLElement;
      expect(tooltip).toBeTruthy();
      expect(tooltip.style.transform).toBe('translateX(-50%)');
    });
  });

  describe('Dark mode', () => {
    it('should apply dark mode classes when darkMode is true', () => {
      const tooltipState = createMockTooltipState();
      render(
        <TooltipPortal {...mockProps} tooltipState={tooltipState} darkMode={true} />
      );

      // The component uses dark: classes which are Tailwind-specific
      // We can verify the classes are present
      const tooltip = document.body.querySelector('.fixed');
      expect(tooltip).toBeTruthy();
      expect(tooltip).toHaveClass('dark:bg-gray-800');
      expect(tooltip).toHaveClass('dark:border-gray-700');
    });
  });
});
