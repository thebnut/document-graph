/**
 * ReactFlow Node Types Configuration
 */

import type { NodeTypes } from 'reactflow';
import { EntityNode } from '../components/nodes/EntityNode';

export const nodeTypes: NodeTypes = {
  entity: (props: any) => (
    <EntityNode
      {...props}
      onShowTooltip={props.data.onShowTooltip}
      onHideTooltip={props.data.onHideTooltip}
    />
  ),
};
