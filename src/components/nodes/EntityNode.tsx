/**
 * Entity Node Component
 *
 * Custom ReactFlow node component for rendering entities in the document graph
 */

import React from 'react';
import { Handle, Position } from 'reactflow';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { getNodeSize, getIconSize } from '../../utils/sizeMapper';
import { getNodeColor } from '../../utils/colorMapper';
import { getNodeIcon } from '../../utils/iconMapper';
import type { NodeData } from '../../services/dataService-adapter';

interface EntityNodeProps {
  data: NodeData;
  id: string;
  onShowTooltip?: (nodeId: string, data: NodeData, event: React.MouseEvent) => void;
  onHideTooltip?: () => void;
}

export const EntityNode: React.FC<EntityNodeProps> = ({ data, id, onShowTooltip, onHideTooltip }) => {
  const nodeSize = getNodeSize(data);
  const iconSize = getIconSize(data);
  const nodeColor = getNodeColor(data);
  const icon = getNodeIcon(data, iconSize);

  const hasChildren = data.childrenCount && data.childrenCount > 0;
  const isExpanded = data.isExpanded || false;

  return (
    <div className="relative">
      {/* Input handle - top */}
      {data.level > 0 && <Handle type="target" position={Position.Top} className="w-2 h-2" />}

      {/* Main node */}
      <div
        className={`${nodeSize} ${nodeColor} rounded-full shadow-lg flex flex-col items-center justify-center cursor-pointer transform transition-all duration-200 hover:scale-110 backdrop-blur-sm bg-opacity-90 relative`}
        onMouseEnter={(e) => onShowTooltip?.(id, data, e)}
        onMouseLeave={() => onHideTooltip?.()}
      >
        {/* Expansion indicator for nodes with children */}
        {hasChildren && (
          <div className="absolute -top-1 -right-1 bg-white dark:bg-gray-800 rounded-full p-0.5 shadow-md">
            {isExpanded ? (
              <ChevronDown className="w-3 h-3 text-blue-600" />
            ) : (
              <ChevronRight className="w-3 h-3 text-blue-600" />
            )}
          </div>
        )}

        {/* Icon */}
        <div className="text-white mb-1">{icon}</div>

        {/* Label */}
        <div className="text-white text-center px-2">
          <div
            className={`font-semibold leading-tight ${
              data.type === 'person' || data.level === 1 || data.level === 0
                ? 'text-base'
                : 'text-xs'
            }`}
          >
            {data.label}
          </div>
          {data.childrenCount !== undefined && data.childrenCount > 0 && (
            <div className="text-xs opacity-75 mt-0.5">({data.childrenCount})</div>
          )}
        </div>
      </div>

      {/* Output handle - bottom */}
      {data.level < 3 && <Handle type="source" position={Position.Bottom} className="w-2 h-2" />}
    </div>
  );
};
