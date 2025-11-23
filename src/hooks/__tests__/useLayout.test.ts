/**
 * Tests for useLayout hook
 *
 * Tests layout engine instance management
 */

import { renderHook } from '@testing-library/react';
import { useLayout } from '../useLayout';

// Mock the D3RadialLayoutEngine to avoid d3-hierarchy ES module issues
jest.mock('../../services/d3RadialLayoutEngine', () => {
  class MockD3RadialLayoutEngine {
    calculateLayout = jest.fn();
  }
  return {
    D3RadialLayoutEngine: MockD3RadialLayoutEngine,
  };
});

describe('useLayout', () => {
  it('should create a layout engine instance', () => {
    const { result} = renderHook(() => useLayout());

    expect(result.current.layoutEngine).toBeDefined();
    expect(result.current.layoutEngine.current).toBeDefined();
    expect(result.current.layoutEngine.current).toHaveProperty('calculateLayout');
  });

  it('should return the same instance across re-renders', () => {
    const { result, rerender } = renderHook(() => useLayout());

    const firstInstance = result.current.layoutEngine.current;

    // Trigger re-render
    rerender();

    const secondInstance = result.current.layoutEngine.current;

    expect(firstInstance).toBe(secondInstance);
  });

  it('should use useRef to maintain instance stability', () => {
    const { result } = renderHook(() => useLayout());

    // Access the ref multiple times
    const instance1 = result.current.layoutEngine.current;
    const instance2 = result.current.layoutEngine.current;

    expect(instance1).toBe(instance2);
  });

  it('should return a mutable ref object', () => {
    const { result } = renderHook(() => useLayout());

    expect(result.current.layoutEngine).toHaveProperty('current');
    expect(typeof result.current.layoutEngine).toBe('object');
  });
});
