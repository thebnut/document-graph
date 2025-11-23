/**
 * useDocuments Hook
 *
 * Manages document upload and file handling
 */

import { useCallback } from 'react';
import type { Node } from 'reactflow';
import { dataService } from '../services/dataService-adapter';

interface UseDocumentsOptions {
  setNodes: (nodes: Node[] | ((prev: Node[]) => Node[])) => void;
  setAllNodesData: (nodes: Node[] | ((prev: Node[]) => Node[])) => void;
}

export function useDocuments({ setNodes, setAllNodesData }: UseDocumentsOptions) {
  // Handle file upload
  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        // Create initial node data
        const tempId = `doc-${Date.now()}`;
        const documentNode: Node = {
          id: tempId,
          type: 'entity',
          position: { x: Math.random() * 500, y: Math.random() * 500 },
          data: {
            label: file.name,
            type: 'document',
            description: `Uploading: ${file.name}...`,
            source: 'Manual upload',
          },
        };

        // Add node immediately to show upload progress
        setNodes((nds) => [...nds, documentNode]);
        setAllNodesData((nds) => [...nds, documentNode]);

        try {
          // Upload to Google Drive if available
          if (dataService.isUsingGoogleDrive()) {
            const uploadResult = await dataService.uploadDocument(file, documentNode.data);

            if (uploadResult) {
              // Update node with Google Drive information
              const updatedNode: Node = {
                ...documentNode,
                data: {
                  ...documentNode.data,
                  description: `Uploaded to ${uploadResult.personFolder} folder`,
                  documentPath: uploadResult.webContentLink,
                  source: uploadResult.webViewLink,
                  documents: [
                    {
                      id: uploadResult.fileId,
                      type: 'google-drive',
                      location: `google-drive://${uploadResult.fileId}`,
                      mimeType: file.type,
                      fileName: file.name,
                      provider: 'google-drive',
                      requiresAuth: true,
                      uploadedAt: new Date().toISOString(),
                      uploadedBy: 'current-user',
                      googleDriveMetadata: {
                        fileId: uploadResult.fileId,
                        driveAccount: 'current-user',
                        shared: false,
                        personFolder: uploadResult.personFolder,
                        webViewLink: uploadResult.webViewLink,
                        webContentLink: uploadResult.webContentLink,
                      },
                    },
                  ],
                },
              };

              // Update the node
              setNodes((nds) => nds.map((n) => (n.id === tempId ? updatedNode : n)));
              setAllNodesData((nds) => nds.map((n) => (n.id === tempId ? updatedNode : n)));

              console.log('Document uploaded successfully:', uploadResult);
            }
          } else {
            // No Google Drive - just update description
            setNodes((nds) =>
              nds.map((n) =>
                n.id === tempId
                  ? { ...n, data: { ...n.data, description: `Local document: ${file.name}` } }
                  : n
              )
            );
            setAllNodesData((nds) =>
              nds.map((n) =>
                n.id === tempId
                  ? { ...n, data: { ...n.data, description: `Local document: ${file.name}` } }
                  : n
              )
            );
          }
        } catch (error) {
          console.error('Failed to upload document:', error);
          // Update node to show error
          setNodes((nds) =>
            nds.map((n) =>
              n.id === tempId
                ? { ...n, data: { ...n.data, description: `Upload failed: ${file.name}` } }
                : n
            )
          );
          setAllNodesData((nds) =>
            nds.map((n) =>
              n.id === tempId
                ? { ...n, data: { ...n.data, description: `Upload failed: ${file.name}` } }
                : n
            )
          );
        }
      }
    },
    [setNodes, setAllNodesData]
  );

  return {
    handleFileUpload,
  };
}
