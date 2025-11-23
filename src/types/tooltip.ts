/**
 * Tooltip Types
 */

import type { NodeData } from '../services/dataService-adapter';

export interface TooltipState {
  show: boolean;
  nodeId: string | null;
  data: NodeData | null;
  position: { x: number; y: number };
}
