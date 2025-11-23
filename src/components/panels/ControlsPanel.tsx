/**
 * Controls Panel Component
 *
 * Top control panel with search, actions, and theme toggle
 */

import React from 'react';
import { Panel } from 'reactflow';
import { Search, Upload, FileText, RotateCcw, Sun, Moon } from 'lucide-react';

interface ControlsPanelProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onAddNode: () => void;
  onUploadDocument: () => void;
  onBulkUpload: () => void;
  onResetCanvas: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export const ControlsPanel: React.FC<ControlsPanelProps> = ({
  searchQuery,
  onSearchChange,
  onAddNode,
  onUploadDocument,
  onBulkUpload,
  onResetCanvas,
  darkMode,
  onToggleDarkMode,
  fileInputRef,
  onFileChange,
}) => {
  return (
    <Panel position="top-left" className="flex gap-2">
      {/* Search Box */}
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-lg p-2 flex items-center gap-2">
        <Search className="w-5 h-5 text-gray-500" />
        <input
          type="text"
          placeholder="Search nodes..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="bg-transparent outline-none w-48 text-sm"
        />
      </div>

      {/* Add Node Button */}
      <button
        onClick={onAddNode}
        className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg px-4 py-2 flex items-center gap-2 transition-colors shadow-lg"
      >
        <Upload className="w-5 h-5" />
        Add Node
      </button>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={onFileChange}
        className="hidden"
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
      />

      {/* Upload Document Button */}
      <button
        onClick={onUploadDocument}
        className="bg-purple-500 hover:bg-purple-600 text-white rounded-lg px-4 py-2 flex items-center gap-2 transition-colors shadow-lg"
      >
        <FileText className="w-5 h-5" />
        Upload Document
      </button>

      {/* Bulk Upload Button */}
      <button
        onClick={onBulkUpload}
        className="bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg px-4 py-2 flex items-center gap-2 transition-colors shadow-lg"
      >
        <Upload className="w-5 h-5" />
        Bulk Upload
      </button>

      {/* Reset Canvas Button */}
      <button
        onClick={onResetCanvas}
        className="bg-orange-500 hover:bg-orange-600 text-white rounded-lg px-4 py-2 flex items-center gap-2 transition-colors shadow-lg"
        title="Reset Canvas"
      >
        <RotateCcw className="w-5 h-5" />
        Reset Canvas
      </button>

      {/* Dark Mode Toggle */}
      <button
        onClick={onToggleDarkMode}
        className="bg-gray-200 dark:bg-gray-700 rounded-lg p-2 transition-colors shadow-lg"
      >
        {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>
    </Panel>
  );
};
