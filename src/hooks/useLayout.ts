/**
 * useLayout Hook
 *
 * Manages layout engine instance
 */

import { useRef } from 'react';
import { D3RadialLayoutEngine } from '../services/d3RadialLayoutEngine';

export function useLayout() {
  const layoutEngine = useRef(new D3RadialLayoutEngine());

  return {
    layoutEngine,
  };
}
