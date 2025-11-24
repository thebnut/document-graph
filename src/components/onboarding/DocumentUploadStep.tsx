/**
 * Document Upload Step
 * Second step: drag & drop or select multiple documents
 */

import React, { useState, useCallback, useRef } from 'react';
import { Upload, FileText, X, ArrowRight, ArrowLeft, AlertCircle } from 'lucide-react';
import { AI_CONFIG } from '../../config/ai-config';

interface DocumentUploadStepProps {
  familyName: string;
  onComplete: (files: File[]) => void;
  onBack: () => void;
  darkMode?: boolean;
}

export const DocumentUploadStep: React.FC<DocumentUploadStepProps> = ({
  familyName,
  onComplete,
  onBack,
  darkMode = false
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      handleFiles(selectedFiles);
    }
  }, []);

  const handleFiles = (newFiles: File[]) => {
    // Filter for supported file types
    const supportedFiles = newFiles.filter(file =>
      AI_CONFIG.documentProcessing.supportedFormats.includes(file.type)
    );

    if (supportedFiles.length < newFiles.length) {
      setError(`${newFiles.length - supportedFiles.length} file(s) skipped - unsupported format`);
      setTimeout(() => setError(''), 3000);
    }

    setFiles(prev => [...prev, ...supportedFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleContinue = () => {
    if (files.length === 0) {
      setError('Please add at least one document');
      return;
    }

    onComplete(files);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold mb-2">Upload Documents</h3>
        <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Upload documents for <span className="font-semibold">{familyName}</span>
        </p>
      </div>

      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : darkMode
            ? 'border-gray-600 hover:border-gray-500 bg-gray-700/50'
            : 'border-gray-300 hover:border-gray-400 bg-gray-50'
        }`}
      >
        <Upload
          size={48}
          className={`mx-auto mb-4 ${
            isDragging ? 'text-blue-500' : darkMode ? 'text-gray-400' : 'text-gray-400'
          }`}
        />
        <p className={`text-lg font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          Drag & drop documents here
        </p>
        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          or click to browse
        </p>
        <p className={`text-xs mt-2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          Supports: PDF, PNG, JPG, JPEG
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={AI_CONFIG.documentProcessing.supportedFormats.join(',')}
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Error Message */}
      {error && (
        <div className={`flex items-center gap-2 p-3 rounded-lg ${
          darkMode ? 'bg-red-900/20 text-red-400' : 'bg-red-50 text-red-600'
        }`}>
          <AlertCircle size={20} />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Selected Documents ({files.length})
          </h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {files.map((file, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  darkMode ? 'bg-gray-700' : 'bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <FileText size={20} className="text-blue-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {file.name}
                    </p>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors`}
                  aria-label="Remove file"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex gap-3 pt-4">
        <button
          onClick={onBack}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
            darkMode
              ? 'bg-gray-700 hover:bg-gray-600 text-white'
              : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
          }`}
        >
          <ArrowLeft size={20} />
          Back
        </button>
        <button
          onClick={handleContinue}
          disabled={files.length === 0}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
            files.length === 0
              ? 'bg-gray-400 cursor-not-allowed text-gray-200'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          Start Building
          <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
};
