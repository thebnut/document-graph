import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, Download, Loader } from 'lucide-react';
import { useDocumentViewer } from '../contexts/DocumentViewerContext';
import { googleDriveService } from '../services/googleDriveService';
import { googleAuthService } from '../services/googleAuthService';

interface DocumentViewerProps {
  darkMode: boolean;
}

// Custom hook for fetching documents as blobs
const useDocumentBlob = (documentPath: string | undefined, isOpen: boolean, entity: any) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!documentPath || !isOpen) {
      return;
    }

    let cancelled = false;
    const fetchDocument = async () => {
      setLoading(true);
      setError(null);
      
      try {
        let blob: Blob;
        
        // Check if this is a Google Drive document
        if (documentPath.startsWith('google-drive://')) {
          // Extract file ID from google-drive://fileId format
          const fileId = documentPath.replace('google-drive://', '');
          
          // Check authentication
          if (!googleAuthService.isAuthenticated()) {
            throw new Error('Google Drive authentication required');
          }
          
          // Download from Google Drive
          blob = await googleDriveService.downloadFile(fileId);
        } else if (entity?.documents?.[0]?.googleDriveMetadata?.fileId) {
          // Alternative: check if entity has Google Drive metadata
          const fileId = entity.documents[0].googleDriveMetadata.fileId;
          
          // Check authentication
          if (!googleAuthService.isAuthenticated()) {
            throw new Error('Google Drive authentication required');
          }
          
          // Download from Google Drive
          blob = await googleDriveService.downloadFile(fileId);
        } else {
          // Regular HTTP fetch for local files
          const response = await fetch(documentPath);
          
          if (!response.ok) {
            throw new Error(`Failed to fetch document: ${response.statusText}`);
          }
          
          blob = await response.blob();
        }
        
        if (!cancelled) {
          const url = URL.createObjectURL(blob);
          setBlobUrl(url);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load document');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchDocument();

    return () => {
      cancelled = true;
    };
  }, [documentPath, isOpen, entity]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [blobUrl]);

  return { blobUrl, loading, error };
};

export const DocumentViewer: React.FC<DocumentViewerProps> = ({ 
  darkMode 
}) => {
  const { isOpen, currentEntity: entity, closeDocument: onClose } = useDocumentViewer();
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [imageError, setImageError] = useState(false);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  
  // Fetch document as blob
  const { blobUrl, loading: documentLoading, error: documentError } = useDocumentBlob(entity?.documentPath, isOpen, entity);

  // Reset state when entity changes
  useEffect(() => {
    setZoom(100);
    setRotation(0);
    setImageError(false);
  }, [entity]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-') {
        handleZoomOut();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 300));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 25));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleDownload = useCallback(() => {
    if (blobUrl && entity) {
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = entity.documentMetadata?.fileName || entity.label || 'document';
      link.click();
    }
  }, [blobUrl, entity]);

  const renderDocumentContent = () => {
    if (!entity?.documentPath) {
      return (
        <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
          No document available
        </div>
      );
    }

    // Show loading state
    if (documentLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
          <Loader className="w-8 h-8 animate-spin mb-2" />
          Loading document...
        </div>
      );
    }

    // Show error state
    if (documentError || imageError) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-red-500 dark:text-red-400">
          <p className="mb-2">Failed to load document</p>
          <p className="text-sm">{documentError || 'Unknown error'}</p>
        </div>
      );
    }

    // Show content when blob URL is ready
    if (!blobUrl) {
      return null;
    }

    if (entity.documentType === 'image') {
      return (
        <div 
          ref={imageContainerRef}
          className="relative w-full h-full overflow-auto bg-gray-100 dark:bg-gray-900"
        >
          <div className="flex items-center justify-center min-h-full p-8">
            <img
              src={blobUrl}
              alt={entity.label}
              className="max-w-full h-auto shadow-xl"
              style={{
                transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                transition: 'transform 0.3s ease',
                transformOrigin: 'center'
              }}
              onError={() => setImageError(true)}
            />
          </div>
        </div>
      );
    }

    if (entity.documentType === 'pdf') {
      return (
        <div className="w-full h-full bg-gray-100 dark:bg-gray-900">
          <iframe
            src={blobUrl}
            title={entity.label}
            className="w-full h-full border-0"
            style={{ minHeight: '600px' }}
          />
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
        Unsupported document type
      </div>
    );
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black transition-opacity duration-300 z-40 ${
          isOpen ? 'bg-opacity-50' : 'bg-opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Slide-out panel */}
      <div
        className={`fixed top-0 right-0 h-full bg-white dark:bg-gray-800 shadow-2xl transition-transform duration-300 z-50 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ width: '60%', minWidth: '400px', maxWidth: '800px' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {entity?.label || 'Document Viewer'}
            </h2>
            {entity?.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {entity.description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close document viewer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        {entity && blobUrl && !documentError && !imageError && (
          <div className="flex items-center gap-2 p-4 border-b border-gray-200 dark:border-gray-700">
            {entity.documentType === 'image' && (
              <>
                <button
                  onClick={handleZoomIn}
                  className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  aria-label="Zoom in"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={handleZoomOut}
                  className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  aria-label="Zoom out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 rounded">
                  {zoom}%
                </span>
                <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2" />
                <button
                  onClick={handleRotate}
                  className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  aria-label="Rotate"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              onClick={handleDownload}
              className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Download"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Document content */}
        <div className="h-full pb-20 overflow-hidden">
          {renderDocumentContent()}
        </div>

        {/* Footer with metadata */}
        {entity?.documentMetadata && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {entity.documentMetadata.fileName && (
                <p>File: {entity.documentMetadata.fileName}</p>
              )}
              {entity.expiry && (
                <p className="text-red-600 dark:text-red-400">Expires: {entity.expiry}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};