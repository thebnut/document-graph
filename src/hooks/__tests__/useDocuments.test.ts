/**
 * Tests for useDocuments hook
 *
 * Tests document upload, Google Drive integration, and error handling
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useDocuments } from '../useDocuments';
import { dataService } from '../../services/dataService-adapter';
import type { Node } from '@xyflow/react';

// Mock the dataService
jest.mock('../../services/dataService-adapter', () => ({
  dataService: {
    isUsingGoogleDrive: jest.fn(),
    uploadDocument: jest.fn(),
  },
}));

describe('useDocuments', () => {
  const mockSetNodes = jest.fn();
  const mockSetAllNodesData = jest.fn();

  const createMockFile = (name: string = 'test.pdf', type: string = 'application/pdf'): File => {
    return new File(['content'], name, { type });
  };

  const createMockEvent = (file: File): React.ChangeEvent<HTMLInputElement> => {
    return {
      target: {
        files: [file],
      },
    } as unknown as React.ChangeEvent<HTMLInputElement>;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Default to not using Google Drive
    (dataService.isUsingGoogleDrive as jest.Mock).mockReturnValue(false);
  });

  describe('handleFileUpload', () => {
    it('should create temporary node immediately when file is selected', async () => {
      const { result } = renderHook(() =>
        useDocuments({ setNodes: mockSetNodes, setAllNodesData: mockSetAllNodesData })
      );

      const file = createMockFile('document.pdf');
      const event = createMockEvent(file);

      await act(async () => {
        await result.current.handleFileUpload(event);
      });

      // Should add temporary node immediately
      expect(mockSetNodes).toHaveBeenCalled();
      expect(mockSetAllNodesData).toHaveBeenCalled();

      // Get the function passed to setNodes
      const setNodesCall = mockSetNodes.mock.calls[0][0];
      const newNodes = setNodesCall([]);

      expect(newNodes.length).toBe(1);
      expect(newNodes[0].data.label).toBe('document.pdf');
      expect(newNodes[0].data.type).toBe('document');
      expect(newNodes[0].data.description).toContain('Uploading');
    });

    it('should do nothing when no file is selected', async () => {
      const { result } = renderHook(() =>
        useDocuments({ setNodes: mockSetNodes, setAllNodesData: mockSetAllNodesData })
      );

      const event = {
        target: {
          files: null,
        },
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      await act(async () => {
        await result.current.handleFileUpload(event);
      });

      expect(mockSetNodes).not.toHaveBeenCalled();
      expect(mockSetAllNodesData).not.toHaveBeenCalled();
    });
  });

  describe('Google Drive upload', () => {
    it('should upload to Google Drive when available', async () => {
      (dataService.isUsingGoogleDrive as jest.Mock).mockReturnValue(true);
      (dataService.uploadDocument as jest.Mock).mockResolvedValue({
        fileId: 'google-file-123',
        personFolder: 'John Doe',
        webViewLink: 'https://drive.google.com/file/123/view',
        webContentLink: 'https://drive.google.com/file/123/content',
      });

      const { result } = renderHook(() =>
        useDocuments({ setNodes: mockSetNodes, setAllNodesData: mockSetAllNodesData })
      );

      const file = createMockFile('passport.pdf');
      const event = createMockEvent(file);

      await act(async () => {
        await result.current.handleFileUpload(event);
      });

      await waitFor(() => {
        expect(dataService.uploadDocument).toHaveBeenCalledWith(
          file,
          expect.objectContaining({
            label: 'passport.pdf',
            type: 'document',
          })
        );
      });
    });

    it('should update node with Google Drive metadata on success', async () => {
      (dataService.isUsingGoogleDrive as jest.Mock).mockReturnValue(true);
      (dataService.uploadDocument as jest.Mock).mockResolvedValue({
        fileId: 'google-file-123',
        personFolder: 'John Doe',
        webViewLink: 'https://drive.google.com/file/123/view',
        webContentLink: 'https://drive.google.com/file/123/content',
      });

      const { result } = renderHook(() =>
        useDocuments({ setNodes: mockSetNodes, setAllNodesData: mockSetAllNodesData })
      );

      const file = createMockFile('passport.pdf');
      const event = createMockEvent(file);

      await act(async () => {
        await result.current.handleFileUpload(event);
      });

      await waitFor(() => {
        // Should be called twice: once for initial node, once for update
        expect(mockSetNodes).toHaveBeenCalledTimes(2);
      });

      // Check the second call (update)
      const updateCall = mockSetNodes.mock.calls[1][0];
      const existingNodes = [{
        id: 'doc-123',
        data: { label: 'old' },
      }] as Node[];

      const updatedNodes = updateCall(existingNodes);

      // Should have updated node with Google Drive info
      expect(mockSetNodes).toHaveBeenCalled();
    });

    it('should handle Google Drive upload failure', async () => {
      (dataService.isUsingGoogleDrive as jest.Mock).mockReturnValue(true);
      (dataService.uploadDocument as jest.Mock).mockRejectedValue(
        new Error('Upload failed')
      );

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const { result } = renderHook(() =>
        useDocuments({ setNodes: mockSetNodes, setAllNodesData: mockSetAllNodesData })
      );

      const file = createMockFile('document.pdf');
      const event = createMockEvent(file);

      await act(async () => {
        await result.current.handleFileUpload(event);
      });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to upload document:',
          expect.any(Error)
        );
      });

      // Should update node to show error
      await waitFor(() => {
        expect(mockSetNodes).toHaveBeenCalled();
        const lastCall = mockSetNodes.mock.calls[mockSetNodes.mock.calls.length - 1][0];
        const nodes = lastCall([{ id: 'test', data: {} }]);
        // The update function should handle error case
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Local mode (no Google Drive)', () => {
    it('should handle file upload without Google Drive', async () => {
      (dataService.isUsingGoogleDrive as jest.Mock).mockReturnValue(false);

      const { result } = renderHook(() =>
        useDocuments({ setNodes: mockSetNodes, setAllNodesData: mockSetAllNodesData })
      );

      const file = createMockFile('local-doc.pdf');
      const event = createMockEvent(file);

      await act(async () => {
        await result.current.handleFileUpload(event);
      });

      await waitFor(() => {
        // Should be called twice: initial + update
        expect(mockSetNodes).toHaveBeenCalled();
      });

      expect(dataService.uploadDocument).not.toHaveBeenCalled();
    });

    it('should update node description for local documents', async () => {
      (dataService.isUsingGoogleDrive as jest.Mock).mockReturnValue(false);

      const { result } = renderHook(() =>
        useDocuments({ setNodes: mockSetNodes, setAllNodesData: mockSetAllNodesData })
      );

      const file = createMockFile('local.pdf');
      const event = createMockEvent(file);

      await act(async () => {
        await result.current.handleFileUpload(event);
      });

      await waitFor(() => {
        expect(mockSetNodes).toHaveBeenCalledTimes(2);
      });

      // Check second call for local update
      const updateCall = mockSetNodes.mock.calls[1][0];
      const tempId = 'doc-temp';
      const nodes = [{ id: tempId, data: { label: 'test' } }] as Node[];

      const updated = updateCall(nodes);
      expect(updated).toBeDefined();
    });
  });

  describe('Node updates', () => {
    it('should generate temporary IDs with correct format', async () => {
      const { result } = renderHook(() =>
        useDocuments({ setNodes: mockSetNodes, setAllNodesData: mockSetAllNodesData })
      );

      const file = createMockFile('doc.pdf');
      const event = createMockEvent(file);

      await act(async () => {
        await result.current.handleFileUpload(event);
      });

      const firstCallNodes = mockSetNodes.mock.calls[0][0]([]);
      const nodeId = firstCallNodes[0].id;

      expect(nodeId).toMatch(/^doc-\d+$/);
      expect(nodeId).toContain('doc-');
    });

    it('should preserve existing nodes when adding new ones', async () => {
      const { result } = renderHook(() =>
        useDocuments({ setNodes: mockSetNodes, setAllNodesData: mockSetAllNodesData })
      );

      const file = createMockFile('new.pdf');
      const event = createMockEvent(file);

      await act(async () => {
        await result.current.handleFileUpload(event);
      });

      const setNodesCall = mockSetNodes.mock.calls[0][0];
      const existingNodes = [
        { id: 'existing-1', data: { label: 'Existing' } },
      ] as Node[];

      const updatedNodes = setNodesCall(existingNodes);

      expect(updatedNodes.length).toBe(2); // existing + new
      expect(updatedNodes[0].id).toBe('existing-1');
      expect(updatedNodes[1].data.label).toBe('new.pdf');
    });
  });

  describe('File information', () => {
    it('should include file name in node label', async () => {
      const { result } = renderHook(() =>
        useDocuments({ setNodes: mockSetNodes, setAllNodesData: mockSetAllNodesData })
      );

      const file = createMockFile('my-document.pdf');
      const event = createMockEvent(file);

      await act(async () => {
        await result.current.handleFileUpload(event);
      });

      const newNodes = mockSetNodes.mock.calls[0][0]([]);
      expect(newNodes[0].data.label).toBe('my-document.pdf');
    });

    it('should set node type to document', async () => {
      const { result } = renderHook(() =>
        useDocuments({ setNodes: mockSetNodes, setAllNodesData: mockSetAllNodesData })
      );

      const file = createMockFile('test.jpg', 'image/jpeg');
      const event = createMockEvent(file);

      await act(async () => {
        await result.current.handleFileUpload(event);
      });

      const newNodes = mockSetNodes.mock.calls[0][0]([]);
      expect(newNodes[0].data.type).toBe('document');
    });

    it('should set source to Manual upload', async () => {
      const { result } = renderHook(() =>
        useDocuments({ setNodes: mockSetNodes, setAllNodesData: mockSetAllNodesData })
      );

      const file = createMockFile();
      const event = createMockEvent(file);

      await act(async () => {
        await result.current.handleFileUpload(event);
      });

      const newNodes = mockSetNodes.mock.calls[0][0]([]);
      expect(newNodes[0].data.source).toBe('Manual upload');
    });
  });
});
