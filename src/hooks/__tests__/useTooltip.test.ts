/**
 * Tests for useTooltip hook
 *
 * Tests tooltip state management, timers, and distance-based hiding
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useTooltip } from '../useTooltip';
import type { NodeData } from '../../services/dataService-adapter';

describe('useTooltip', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  const createMockMouseEvent = (clientX: number, clientY: number): React.MouseEvent => {
    const mockElement = {
      getBoundingClientRect: () => ({
        left: clientX,
        top: clientY - 50,
        right: clientX + 100,
        bottom: clientY,
        width: 100,
        height: 50,
        x: clientX,
        y: clientY - 50,
        toJSON: () => {},
      }),
    };

    return {
      target: mockElement,
      clientX,
      clientY,
    } as unknown as React.MouseEvent;
  };

  const createMockNodeData = (): NodeData => ({
    id: 'test-node',
    label: 'Test Node',
    type: 'person',
    level: 1,
  });

  describe('Initial state', () => {
    it('should initialize with tooltip hidden', () => {
      const { result } = renderHook(() => useTooltip());

      expect(result.current.tooltipState.show).toBe(false);
      expect(result.current.tooltipState.nodeId).toBeNull();
      expect(result.current.tooltipState.data).toBeNull();
    });

    it('should have all handler functions defined', () => {
      const { result } = renderHook(() => useTooltip());

      expect(typeof result.current.handleShowTooltip).toBe('function');
      expect(typeof result.current.handleHideTooltip).toBe('function');
      expect(typeof result.current.handleTooltipMouseEnter).toBe('function');
      expect(typeof result.current.handleTooltipMouseLeave).toBe('function');
      expect(typeof result.current.hideTooltipImmediately).toBe('function');
    });
  });

  describe('handleShowTooltip', () => {
    it('should show tooltip with correct data and position', () => {
      const { result } = renderHook(() => useTooltip());
      const nodeData = createMockNodeData();
      const event = createMockMouseEvent(100, 200);

      act(() => {
        result.current.handleShowTooltip('test-node', nodeData, event);
      });

      expect(result.current.tooltipState.show).toBe(true);
      expect(result.current.tooltipState.nodeId).toBe('test-node');
      expect(result.current.tooltipState.data).toEqual(nodeData);
      expect(result.current.tooltipState.position.x).toBe(150); // left + width/2
      expect(result.current.tooltipState.position.y).toBe(210); // bottom + 10
    });

    it('should clear hide timeout when showing tooltip', () => {
      const { result } = renderHook(() => useTooltip());
      const nodeData = createMockNodeData();
      const event = createMockMouseEvent(100, 200);

      act(() => {
        result.current.handleShowTooltip('node-1', nodeData, event);
        result.current.handleHideTooltip();
        // Before timeout expires, show tooltip again
        result.current.handleShowTooltip('node-2', nodeData, event);
      });

      // Tooltip should still be visible
      expect(result.current.tooltipState.show).toBe(true);
      expect(result.current.tooltipState.nodeId).toBe('node-2');
    });
  });

  describe('handleHideTooltip', () => {
    it('should hide tooltip after delay', async () => {
      const { result } = renderHook(() => useTooltip());
      const nodeData = createMockNodeData();
      const event = createMockMouseEvent(100, 200);

      act(() => {
        result.current.handleShowTooltip('test-node', nodeData, event);
      });

      expect(result.current.tooltipState.show).toBe(true);

      act(() => {
        result.current.handleHideTooltip();
      });

      // Should still be visible immediately
      expect(result.current.tooltipState.show).toBe(true);

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Should be hidden after delay
      await waitFor(() => {
        expect(result.current.tooltipState.show).toBe(false);
      });
    });

    it('should not hide tooltip if hovering over tooltip', async () => {
      const { result } = renderHook(() => useTooltip());
      const nodeData = createMockNodeData();
      const event = createMockMouseEvent(100, 200);

      act(() => {
        result.current.handleShowTooltip('test-node', nodeData, event);
      });

      act(() => {
        result.current.handleTooltipMouseEnter();
      });

      act(() => {
        result.current.handleHideTooltip();
      });

      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Should still be visible because tooltip is hovered
      await waitFor(() => {
        expect(result.current.tooltipState.show).toBe(true);
      });
    });
  });

  describe('handleTooltipMouseEnter', () => {
    it('should clear hide timeout when entering tooltip', () => {
      const { result } = renderHook(() => useTooltip());
      const nodeData = createMockNodeData();
      const event = createMockMouseEvent(100, 200);

      act(() => {
        result.current.handleShowTooltip('test-node', nodeData, event);
        result.current.handleHideTooltip();
        // Enter tooltip before timeout
        result.current.handleTooltipMouseEnter();
      });

      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Tooltip should still be visible
      expect(result.current.tooltipState.show).toBe(true);
    });
  });

  describe('handleTooltipMouseLeave', () => {
    it('should hide tooltip immediately when leaving tooltip', () => {
      const { result } = renderHook(() => useTooltip());
      const nodeData = createMockNodeData();
      const event = createMockMouseEvent(100, 200);

      act(() => {
        result.current.handleShowTooltip('test-node', nodeData, event);
        result.current.handleTooltipMouseEnter();
      });

      expect(result.current.tooltipState.show).toBe(true);

      act(() => {
        result.current.handleTooltipMouseLeave();
      });

      // Should be hidden immediately without timeout
      expect(result.current.tooltipState.show).toBe(false);
    });
  });

  describe('hideTooltipImmediately', () => {
    it('should hide tooltip without delay', () => {
      const { result } = renderHook(() => useTooltip());
      const nodeData = createMockNodeData();
      const event = createMockMouseEvent(100, 200);

      act(() => {
        result.current.handleShowTooltip('test-node', nodeData, event);
      });

      expect(result.current.tooltipState.show).toBe(true);

      act(() => {
        result.current.hideTooltipImmediately();
      });

      // Should be hidden immediately
      expect(result.current.tooltipState.show).toBe(false);
    });

    it('should clear any pending hide timeout', () => {
      const { result } = renderHook(() => useTooltip());
      const nodeData = createMockNodeData();
      const event = createMockMouseEvent(100, 200);

      act(() => {
        result.current.handleShowTooltip('test-node', nodeData, event);
        result.current.handleHideTooltip();
        // Immediately hide before timeout
        result.current.hideTooltipImmediately();
      });

      expect(result.current.tooltipState.show).toBe(false);

      // Fast-forward timers - should not affect state
      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(result.current.tooltipState.show).toBe(false);
    });
  });

  describe('Distance-based hiding', () => {
    it('should hide tooltip when mouse moves far from anchor', async () => {
      const { result } = renderHook(() => useTooltip());
      const nodeData = createMockNodeData();
      const event = createMockMouseEvent(100, 200);

      act(() => {
        result.current.handleShowTooltip('test-node', nodeData, event);
      });

      expect(result.current.tooltipState.show).toBe(true);

      // Simulate mouse move far away (>150px)
      act(() => {
        const mouseMoveEvent = new MouseEvent('mousemove', {
          clientX: 400, // 250px away horizontally
          clientY: 200,
        });
        document.dispatchEvent(mouseMoveEvent);
      });

      await waitFor(() => {
        expect(result.current.tooltipState.show).toBe(false);
      });
    });

    it('should not hide tooltip when mouse is within threshold', async () => {
      const { result } = renderHook(() => useTooltip());
      const nodeData = createMockNodeData();
      const event = createMockMouseEvent(100, 200);

      act(() => {
        result.current.handleShowTooltip('test-node', nodeData, event);
      });

      expect(result.current.tooltipState.show).toBe(true);

      // Simulate mouse move within threshold (<150px)
      act(() => {
        const mouseMoveEvent = new MouseEvent('mousemove', {
          clientX: 200, // 50px away from anchor (150, 210)
          clientY: 210,
        });
        document.dispatchEvent(mouseMoveEvent);
      });

      // Allow time for effect to run
      act(() => {
        jest.advanceTimersByTime(50);
      });

      expect(result.current.tooltipState.show).toBe(true);
    });

    it('should not hide tooltip when hovering over it', async () => {
      const { result } = renderHook(() => useTooltip());
      const nodeData = createMockNodeData();
      const event = createMockMouseEvent(100, 200);

      act(() => {
        result.current.handleShowTooltip('test-node', nodeData, event);
        result.current.handleTooltipMouseEnter();
      });

      // Simulate mouse move far away while hovering tooltip
      act(() => {
        const mouseMoveEvent = new MouseEvent('mousemove', {
          clientX: 400,
          clientY: 200,
        });
        document.dispatchEvent(mouseMoveEvent);
      });

      // Allow time for effect to run
      act(() => {
        jest.advanceTimersByTime(50);
      });

      // Should still be visible
      expect(result.current.tooltipState.show).toBe(true);
    });
  });
});
