/**
 * useTooltip Hook
 *
 * Manages tooltip state and handlers with distance-based hiding
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import type { TooltipState } from '../types/tooltip';
import type { NodeData } from '../services/dataService-adapter';

export function useTooltip() {
  const [tooltipState, setTooltipState] = useState<TooltipState>({
    show: false,
    nodeId: null,
    data: null,
    position: { x: 0, y: 0 },
  });
  const [isTooltipHovered, setIsTooltipHovered] = useState(false);
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mousePositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const tooltipAnchorRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Handle tooltip show
  const handleShowTooltip = useCallback(
    (nodeId: string, nodeData: NodeData, event: React.MouseEvent) => {
      const rect = (event.target as HTMLElement).getBoundingClientRect();
      const anchorX = rect.left + rect.width / 2;
      const anchorY = rect.bottom + 10;

      // Store anchor position
      tooltipAnchorRef.current = { x: anchorX, y: anchorY };

      // Clear any hide timeout
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
        tooltipTimeoutRef.current = null;
      }

      setTooltipState({
        show: true,
        nodeId,
        data: nodeData,
        position: {
          x: anchorX,
          y: anchorY,
        },
      });
    },
    []
  );

  // Handle tooltip hide with delay
  const handleHideTooltip = useCallback(() => {
    // Clear any existing timeout
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
    }

    // Set a delay before hiding to allow moving to tooltip
    tooltipTimeoutRef.current = setTimeout(() => {
      // Only hide if tooltip is not being hovered
      if (!isTooltipHovered) {
        setTooltipState((prev) => ({ ...prev, show: false }));
      }
    }, 100); // 100ms delay to move cursor to tooltip
  }, [isTooltipHovered]);

  // Handle tooltip mouse enter
  const handleTooltipMouseEnter = useCallback(() => {
    // Clear any hide timeout when entering tooltip
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
      tooltipTimeoutRef.current = null;
    }
    setIsTooltipHovered(true);
  }, []);

  // Handle tooltip mouse leave
  const handleTooltipMouseLeave = useCallback(() => {
    setIsTooltipHovered(false);
    // Hide tooltip when leaving
    setTooltipState((prev) => ({ ...prev, show: false }));
  }, []);

  // Hide tooltip immediately (for click events)
  const hideTooltipImmediately = useCallback(() => {
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
    }
    setTooltipState((prev) => ({ ...prev, show: false }));
  }, []);

  // Global mouse move handler for distance-based tooltip hiding
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      mousePositionRef.current = { x: e.clientX, y: e.clientY };

      // Check distance from tooltip anchor if tooltip is shown
      if (tooltipState.show && !isTooltipHovered) {
        const distance = Math.sqrt(
          Math.pow(e.clientX - tooltipAnchorRef.current.x, 2) +
            Math.pow(e.clientY - tooltipAnchorRef.current.y, 2)
        );

        // Hide tooltip if mouse is too far from anchor (150px threshold)
        if (distance > 150) {
          if (tooltipTimeoutRef.current) {
            clearTimeout(tooltipTimeoutRef.current);
          }
          setTooltipState((prev) => ({ ...prev, show: false }));
        }
      }
    };

    document.addEventListener('mousemove', handleGlobalMouseMove);
    return () => document.removeEventListener('mousemove', handleGlobalMouseMove);
  }, [tooltipState.show, isTooltipHovered]);

  return {
    tooltipState,
    handleShowTooltip,
    handleHideTooltip,
    handleTooltipMouseEnter,
    handleTooltipMouseLeave,
    hideTooltipImmediately,
  };
}
