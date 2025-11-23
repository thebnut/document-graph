/**
 * Tooltip Portal Component
 *
 * Renders a tooltip overlay using React Portal
 */

import React from 'react';
import { createPortal } from 'react-dom';
import { FileText } from 'lucide-react';
import { dataService } from '../../services/dataService-adapter';
import type { TooltipState } from '../../types/tooltip';

interface TooltipPortalProps {
  tooltipState: TooltipState;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onOpenDocument: (entityId: string) => void;
  darkMode: boolean;
}

export const TooltipPortal: React.FC<TooltipPortalProps> = ({
  tooltipState,
  onMouseEnter,
  onMouseLeave,
  onOpenDocument,
  darkMode,
}) => {
  if (!tooltipState.show || !tooltipState.data) {
    return null;
  }

  return createPortal(
    <div
      className={`fixed z-[9999] bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 min-w-[250px] border border-gray-200 dark:border-gray-700`}
      style={{
        left: `${tooltipState.position.x}px`,
        top: `${tooltipState.position.y}px`,
        transform: 'translateX(-50%)',
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Tooltip arrow */}
      <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-white dark:bg-gray-800 rotate-45 border-l border-t border-gray-200 dark:border-gray-700"></div>

      {/* Title */}
      <h4 className="font-semibold mb-2">{tooltipState.data.label}</h4>

      {/* Description */}
      {tooltipState.data.description && (
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
          {tooltipState.data.description}
        </p>
      )}

      {/* Metadata */}
      {(() => {
        const metadataDisplay = dataService.getMetadataDisplay(tooltipState.data);
        return (
          metadataDisplay.length > 0 && (
            <div className="text-sm text-gray-600 dark:text-gray-300 mb-2 space-y-1">
              {metadataDisplay.map((item, index) => (
                <p key={index}>{item}</p>
              ))}
            </div>
          )
        );
      })()}

      {/* Expiry Date */}
      {tooltipState.data.expiry && (
        <p className="text-sm text-red-600 dark:text-red-400">
          Expires: {tooltipState.data.expiry}
        </p>
      )}

      {/* Ownership */}
      {tooltipState.data.ownership === 'shared' && (
        <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">Shared Asset</p>
      )}

      {/* Source */}
      {tooltipState.data.source && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Source: {tooltipState.data.source}
        </p>
      )}

      {/* Open Document Button */}
      {tooltipState.data.documentPath && tooltipState.nodeId && (
        <button
          onClick={() => {
            const entity = dataService.getEntityById(tooltipState.nodeId!);
            if (entity) {
              onOpenDocument(entity.id);
            }
          }}
          className="mt-3 w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <FileText className="w-4 h-4" />
          Open Document
        </button>
      )}
    </div>,
    document.body
  );
};
