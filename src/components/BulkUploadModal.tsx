/**
 * Bulk Upload Modal Component
 * Allows users to upload multiple documents for AI analysis and placement
 */

import React, { useState, useCallback, useRef } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle, Loader, FileUp } from 'lucide-react';
import { documentAnalysisService, DocumentAnalysis, AnalysisError } from '../services/documentAnalysisService';
import { documentPlacementService, PlacementDecision, PlacementError } from '../services/documentPlacementService';
import { dataService } from '../services/dataService-adapter';
import { AI_CONFIG } from '../config/ai-config';

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDocumentsAdded?: (count: number) => void;
  darkMode?: boolean;
}

interface UploadedFile {
  file: File;
  status: 'pending' | 'analyzing' | 'analyzed' | 'placing' | 'complete' | 'error';
  analysis?: DocumentAnalysis;
  placement?: PlacementDecision;
  error?: string;
  nodeId?: string;
}

export const BulkUploadModal: React.FC<BulkUploadModalProps> = ({
  isOpen,
  onClose,
  onDocumentsAdded,
  darkMode = false
}) => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Check if AI services are available
  const aiAvailable = documentAnalysisService.isAvailable() && documentPlacementService.isAvailable();
  
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
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, []);
  
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFiles(files);
    }
  }, []);
  
  const handleFiles = (files: File[]) => {
    // Filter for supported file types
    const supportedFiles = files.filter(file => 
      AI_CONFIG.documentProcessing.supportedFormats.includes(file.type)
    );
    
    if (supportedFiles.length < files.length) {
      alert(`${files.length - supportedFiles.length} file(s) were skipped due to unsupported format.`);
    }
    
    // Add files to state
    const newFiles: UploadedFile[] = supportedFiles.map(file => ({
      file,
      status: 'pending' as const
    }));
    
    setUploadedFiles(prev => [...prev, ...newFiles]);
  };
  
  const processFiles = async () => {
    if (!aiAvailable) {
      alert('AI services are not configured. Please add your OpenAI API key.');
      return;
    }
    
    setIsProcessing(true);
    
    for (let i = 0; i < uploadedFiles.length; i++) {
      const uploadedFile = uploadedFiles[i];
      if (uploadedFile.status !== 'pending') continue;
      
      // Update status to analyzing
      setUploadedFiles(prev => prev.map((f, idx) => 
        idx === i ? { ...f, status: 'analyzing' as const } : f
      ));
      
      try {
        // Step 1: Analyze the document
        const analysisResult = await documentAnalysisService.analyzeDocument(uploadedFile.file);
        
        if ('error' in analysisResult) {
          throw new Error(analysisResult.error);
        }
        
        // Update with analysis results
        setUploadedFiles(prev => prev.map((f, idx) => 
          idx === i ? { ...f, status: 'analyzed' as const, analysis: analysisResult } : f
        ));
        
        // Step 2: Determine placement
        setUploadedFiles(prev => prev.map((f, idx) => 
          idx === i ? { ...f, status: 'placing' as const } : f
        ));
        
        const model = dataService.getModel();
        const placementResult = await documentPlacementService.determineDocumentPlacement(
          analysisResult,
          model
        );
        
        if ('error' in placementResult) {
          throw new Error(placementResult.error);
        }
        
        console.log('BulkUpload - Placement result for', uploadedFile.file.name, ':', placementResult);
        
        // If no parentNodeId but has suggestedPath, create intermediate folders
        if (!placementResult.parentNodeId && placementResult.suggestedPath.length > 1) {
          console.log('BulkUpload - Creating intermediate folders for path:', placementResult.suggestedPath);
          const parentPath = placementResult.suggestedPath.slice(0, -1);
          const parentId = await documentPlacementService.createIntermediateFolders(model, parentPath);
          if (parentId) {
            placementResult.parentNodeId = parentId;
            console.log('BulkUpload - Set parentNodeId to:', parentId);
          }
        }
        
        // Update with placement results
        setUploadedFiles(prev => prev.map((f, idx) => 
          idx === i ? { 
            ...f, 
            status: 'complete' as const, 
            placement: placementResult 
          } : f
        ));
        
      } catch (error) {
        console.error('Processing error:', error);
        setUploadedFiles(prev => prev.map((f, idx) => 
          idx === i ? { 
            ...f, 
            status: 'error' as const, 
            error: error instanceof Error ? error.message : 'Processing failed' 
          } : f
        ));
      }
    }
    
    setIsProcessing(false);
  };
  
  const createNodes = async () => {
    console.log('BulkUpload - createNodes called');
    console.log('BulkUpload - uploadedFiles:', uploadedFiles);
    
    const successfulFiles = uploadedFiles.filter(f => 
      f.status === 'complete' && f.analysis && f.placement
    );
    
    console.log('BulkUpload - successfulFiles:', successfulFiles);
    
    if (successfulFiles.length === 0) {
      console.log('BulkUpload - No successful files to create nodes for');
      return;
    }
    
    setIsProcessing(true);
    let createdCount = 0;
    
    for (const file of successfulFiles) {
      if (!file.analysis || !file.placement) continue;
      
      try {
        console.log('BulkUpload - Processing file:', file.file.name);
        console.log('BulkUpload - Analysis:', file.analysis);
        console.log('BulkUpload - Placement:', file.placement);
        
        // Upload to Google Drive first
        const uploadResult = await dataService.uploadDocument(file.file, {
          label: file.analysis.summary,
          type: 'document',
          description: file.analysis.summary
        });
        
        console.log('BulkUpload - Upload result:', uploadResult);
        
        if (uploadResult) {
          // Create node with all the extracted metadata
          const nodeData = {
            label: file.analysis.summary,
            type: 'document' as const,
            description: file.analysis.summary,
            documentType: file.analysis.documentType,
            parentIds: file.placement.parentNodeId ? [file.placement.parentNodeId] : undefined,
            metadata: file.analysis.extractedData, // All the flexible extracted data
            documents: [{
              id: uploadResult.fileId,
              type: 'google-drive' as const,
              location: `google-drive://${uploadResult.fileId}`,
              mimeType: file.file.type,
              fileName: file.file.name,
              provider: 'google-drive' as const,
              requiresAuth: true,
              uploadedAt: new Date().toISOString(),
              uploadedBy: 'ai-analysis',
              googleDriveMetadata: {
                fileId: uploadResult.fileId,
                driveAccount: 'current-user',
                shared: false,
                personFolder: uploadResult.personFolder,
                webViewLink: uploadResult.webViewLink,
                webContentLink: uploadResult.webContentLink
              }
            }],
            autoGenerated: true,
            analysisConfidence: file.analysis.confidence,
            placementConfidence: file.placement.confidence
          };
          
          console.log('BulkUpload - Creating node with data:', nodeData);
          
          // Add entity to the model
          const newEntity = dataService.addEntity(nodeData);
          
          console.log('BulkUpload - New entity created:', newEntity);
          
          if (newEntity) {
            createdCount++;
            // Update file with node ID
            setUploadedFiles(prev => prev.map(f => 
              f === file ? { ...f, nodeId: newEntity.id } : f
            ));
          }
        }
      } catch (error) {
        console.error('BulkUpload - Failed to create node:', error);
        console.error('BulkUpload - Error details:', {
          fileName: file.file.name,
          analysis: file.analysis,
          placement: file.placement,
          error
        });
      }
    }
    
    setIsProcessing(false);
    
    console.log('BulkUpload - Total nodes created:', createdCount);
    
    if (createdCount > 0) {
      onDocumentsAdded?.(createdCount);
      alert(`Successfully created ${createdCount} document node(s)`);
      onClose();
    } else {
      console.log('BulkUpload - No nodes were created');
    }
  };
  
  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'pending':
        return <FileText className="w-4 h-4 text-gray-400" />;
      case 'analyzing':
      case 'placing':
        return <Loader className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'analyzed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'complete':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
  };
  
  const getStatusText = (file: UploadedFile) => {
    switch (file.status) {
      case 'pending':
        return 'Waiting...';
      case 'analyzing':
        return 'Analyzing document...';
      case 'analyzed':
        return `Analyzed: ${file.analysis?.documentType}`;
      case 'placing':
        return 'Determining placement...';
      case 'complete':
        return `Ready: ${file.placement?.suggestedPath.join(' > ')}`;
      case 'error':
        return file.error || 'Error';
    }
  };
  
  const canCreateNodes = uploadedFiles.some(f => f.status === 'complete');
  const hasFiles = uploadedFiles.length > 0;
  
  if (!isOpen) return null;
  
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={`fixed inset-0 flex items-center justify-center z-50 p-4`}>
        <div className={`
          w-full max-w-3xl max-h-[90vh] rounded-lg shadow-2xl overflow-hidden
          ${darkMode ? 'bg-gray-800' : 'bg-white'}
        `}>
          {/* Header */}
          <div className={`
            flex items-center justify-between p-6 border-b
            ${darkMode ? 'border-gray-700' : 'border-gray-200'}
          `}>
            <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Bulk Document Upload
            </h2>
            <button
              onClick={onClose}
              className={`
                p-2 rounded-lg transition-colors
                ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}
              `}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {!aiAvailable && (
              <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  ⚠️ OpenAI API key not configured. Please add REACT_APP_OPENAI_API_KEY to your .env file to enable AI document analysis.
                </p>
              </div>
            )}
            
            {/* Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all
                ${isDragging 
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                  : darkMode 
                    ? 'border-gray-600 hover:border-gray-500 bg-gray-700/50' 
                    : 'border-gray-300 hover:border-gray-400 bg-gray-50'
                }
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={AI_CONFIG.documentProcessing.supportedFormats.join(',')}
                onChange={handleFileSelect}
                className="hidden"
              />
              
              <FileUp className={`w-12 h-12 mx-auto mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
              
              <p className={`text-lg mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                Drop documents here or click to browse
              </p>
              
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Supported: JPG, PNG, WebP, PDF (max {AI_CONFIG.documentProcessing.maxFileSize / 1024 / 1024}MB)
              </p>
            </div>
            
            {/* File List */}
            {hasFiles && (
              <div className="mt-6 space-y-2">
                <h3 className={`text-sm font-medium mb-3 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                  Files ({uploadedFiles.length})
                </h3>
                
                {uploadedFiles.map((file, index) => (
                  <div
                    key={index}
                    className={`
                      flex items-center justify-between p-3 rounded-lg
                      ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}
                    `}
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      {getStatusIcon(file.status)}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                          {file.file.name}
                        </p>
                        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {getStatusText(file)}
                        </p>
                        {file.analysis && (
                          <p className={`text-xs mt-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            "{file.analysis.summary}"
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {file.analysis && (
                      <div className="text-xs text-right ml-4">
                        <div className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
                          Confidence: {file.analysis.confidence}%
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className={`
            flex justify-end gap-3 p-6 border-t
            ${darkMode ? 'border-gray-700' : 'border-gray-200'}
          `}>
            <button
              onClick={onClose}
              disabled={isProcessing}
              className={`
                px-4 py-2 rounded-lg transition-colors
                ${darkMode 
                  ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              Cancel
            </button>
            
            {!canCreateNodes && hasFiles && (
              <button
                onClick={processFiles}
                disabled={isProcessing || !aiAvailable}
                className={`
                  px-4 py-2 rounded-lg transition-colors flex items-center gap-2
                  ${darkMode 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                {isProcessing ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Analyze Documents
                  </>
                )}
              </button>
            )}
            
            {canCreateNodes && (
              <button
                onClick={createNodes}
                disabled={isProcessing}
                className={`
                  px-4 py-2 rounded-lg transition-colors flex items-center gap-2
                  ${darkMode 
                    ? 'bg-green-600 hover:bg-green-700 text-white' 
                    : 'bg-green-600 hover:bg-green-700 text-white'
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                <CheckCircle className="w-4 h-4" />
                Create {uploadedFiles.filter(f => f.status === 'complete').length} Nodes
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};