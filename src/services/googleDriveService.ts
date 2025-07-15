/**
 * Google Drive Service
 * Handles folder creation, file operations, and Drive API interactions
 */

import { googleAuthService } from './googleAuthService';
import type { StandaloneDocumentGraph } from '../data/standalone-model';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  parents?: string[];
  createdTime?: string;
  modifiedTime?: string;
  size?: string;
  webViewLink?: string;
  webContentLink?: string;
}

export interface FolderStructure {
  rootFolderId: string;
  dataModelFolderId: string;
  documentsFolderId: string;
  personFolders: Record<string, string>; // person name -> folder ID
}

class GoogleDriveService {
  private static instance: GoogleDriveService;
  private readonly MIME_TYPE_FOLDER = 'application/vnd.google-apps.folder';
  private readonly ROOT_FOLDER_NAME = 'lifemap-data';
  private readonly DATA_MODEL_FOLDER = 'data-model';
  private readonly DOCUMENTS_FOLDER = 'documents';
  private readonly DATA_MODEL_FILE = 'document-graph.json';
  private readonly DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
  private readonly DRIVE_UPLOAD_API_BASE = 'https://www.googleapis.com/upload/drive/v3';
  
  private constructor() {}
  
  static getInstance(): GoogleDriveService {
    if (!GoogleDriveService.instance) {
      GoogleDriveService.instance = new GoogleDriveService();
    }
    return GoogleDriveService.instance;
  }
  
  /**
   * Get authorization headers for API requests
   */
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = googleAuthService.getAccessToken();
    if (!token) {
      throw new Error('Not authenticated');
    }
    
    // Check if token needs refresh
    if (googleAuthService.needsTokenRefresh()) {
      await googleAuthService.refreshToken();
      const newToken = googleAuthService.getAccessToken();
      if (!newToken) {
        throw new Error('Failed to refresh token');
      }
      return {
        'Authorization': `Bearer ${newToken}`,
        'Content-Type': 'application/json'
      };
    }
    
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }
  
  /**
   * Create a folder in Google Drive
   */
  async createFolder(name: string, parentId?: string): Promise<string> {
    const headers = await this.getAuthHeaders();
    
    const metadata: any = {
      name: name,
      mimeType: this.MIME_TYPE_FOLDER
    };
    
    if (parentId) {
      metadata.parents = [parentId];
    }
    
    try {
      const response = await fetch(`${this.DRIVE_API_BASE}/files`, {
        method: 'POST',
        headers,
        body: JSON.stringify(metadata)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create folder: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log(`Created folder: ${name} with ID: ${result.id}`);
      return result.id;
    } catch (error) {
      console.error(`Error creating folder ${name}:`, error);
      throw error;
    }
  }
  
  /**
   * Find a folder by name and optional parent
   */
  async findFolder(name: string, parentId?: string): Promise<string | null> {
    const headers = await this.getAuthHeaders();
    
    let query = `name='${name}' and mimeType='${this.MIME_TYPE_FOLDER}' and trashed=false`;
    
    if (parentId) {
      query += ` and '${parentId}' in parents`;
    }
    
    try {
      const response = await fetch(
        `${this.DRIVE_API_BASE}/files?` + new URLSearchParams({
          q: query,
          fields: 'files(id, name)',
          pageSize: '10'
        }),
        { headers }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to search for folder: ${response.statusText}`);
      }
      
      const result = await response.json();
      const files = result.files || [];
      return files.length > 0 ? files[0].id : null;
    } catch (error) {
      console.error(`Error finding folder ${name}:`, error);
      return null;
    }
  }
  
  /**
   * Ensure the complete folder structure exists
   */
  async ensureFolderStructure(): Promise<FolderStructure> {
    console.log('Ensuring folder structure...');
    
    // Find or create root folder
    let rootFolderId = await this.findFolder(this.ROOT_FOLDER_NAME);
    if (!rootFolderId) {
      rootFolderId = await this.createFolder(this.ROOT_FOLDER_NAME);
    }
    
    // Find or create data-model folder
    let dataModelFolderId = await this.findFolder(this.DATA_MODEL_FOLDER, rootFolderId);
    if (!dataModelFolderId) {
      dataModelFolderId = await this.createFolder(this.DATA_MODEL_FOLDER, rootFolderId);
    }
    
    // Find or create documents folder
    let documentsFolderId = await this.findFolder(this.DOCUMENTS_FOLDER, rootFolderId);
    if (!documentsFolderId) {
      documentsFolderId = await this.createFolder(this.DOCUMENTS_FOLDER, rootFolderId);
    }
    
    return {
      rootFolderId,
      dataModelFolderId,
      documentsFolderId,
      personFolders: {} // Will be populated as needed
    };
  }
  
  /**
   * Create a person-specific folder
   */
  async createPersonFolder(personName: string, documentsFolderId: string): Promise<string> {
    const existingId = await this.findFolder(personName, documentsFolderId);
    if (existingId) {
      return existingId;
    }
    
    return await this.createFolder(personName, documentsFolderId);
  }
  
  /**
   * Save the data model to Google Drive
   */
  async saveDataModel(model: StandaloneDocumentGraph): Promise<void> {
    const headers = await this.getAuthHeaders();
    const folderStructure = await this.ensureFolderStructure();
    const jsonContent = JSON.stringify(model, null, 2);
    
    // Check if file already exists
    const existingFileId = await this.findFile(
      this.DATA_MODEL_FILE, 
      folderStructure.dataModelFolderId
    );
    
    try {
      if (existingFileId) {
        // Update existing file using simple media upload with PATCH
        const response = await fetch(
          `${this.DRIVE_UPLOAD_API_BASE}/files/${existingFileId}?uploadType=media`,
          {
            method: 'PATCH',
            headers: {
              'Authorization': headers['Authorization'] as string,
              'Content-Type': 'application/json'
            },
            body: jsonContent
          }
        );
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Drive API error (update):', errorText);
          throw new Error(`Failed to update data model: ${response.statusText} - ${errorText}`);
        }
        
        console.log('Data model updated successfully');
      } else {
        // Create new file using two-step approach to avoid multipart issues
        
        // Step 1: Create empty file with metadata only
        const metadata = {
          name: this.DATA_MODEL_FILE,
          mimeType: 'application/json',
          parents: [folderStructure.dataModelFolderId]
        };
        
        const createResponse = await fetch(
          `${this.DRIVE_API_BASE}/files`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify(metadata)
          }
        );
        
        if (!createResponse.ok) {
          const errorText = await createResponse.text();
          console.error('Drive API error (create metadata):', errorText);
          throw new Error(`Failed to create data model file: ${createResponse.statusText} - ${errorText}`);
        }
        
        const fileData = await createResponse.json();
        const fileId = fileData.id;
        console.log('Created empty file with ID:', fileId);
        
        // Step 2: Update the file with content using PATCH
        const updateResponse = await fetch(
          `${this.DRIVE_UPLOAD_API_BASE}/files/${fileId}?uploadType=media`,
          {
            method: 'PATCH',
            headers: {
              'Authorization': headers['Authorization'] as string,
              'Content-Type': 'application/json'
            },
            body: jsonContent
          }
        );
        
        if (!updateResponse.ok) {
          const errorText = await updateResponse.text();
          console.error('Drive API error (update content):', errorText);
          throw new Error(`Failed to update data model content: ${updateResponse.statusText} - ${errorText}`);
        }
        
        // Log the response to verify the update
        const updateResult = await updateResponse.json();
        console.log('Update response:', updateResult);
        console.log('Data model created and content added successfully');
      }
    } catch (error) {
      console.error('Error saving data model:', error);
      throw error;
    }
  }
  
  /**
   * Load the data model from Google Drive
   */
  async loadDataModel(): Promise<StandaloneDocumentGraph | null> {
    const headers = await this.getAuthHeaders();
    const folderStructure = await this.ensureFolderStructure();
    const fileId = await this.findFile(
      this.DATA_MODEL_FILE, 
      folderStructure.dataModelFolderId
    );
    
    if (!fileId) {
      console.log('No data model found in Google Drive');
      return null;
    }
    
    try {
      const response = await fetch(`${this.DRIVE_API_BASE}/files/${fileId}?alt=media`, {
        headers: {
          'Authorization': headers['Authorization'] as string
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to load data model: ${response.statusText}`);
      }
      
      // First check if we have content
      const text = await response.text();
      console.log('Loaded file content length:', text.length);
      
      if (!text || text.length === 0) {
        console.error('File is empty!');
        return null;
      }
      
      // Parse the JSON content
      const model = JSON.parse(text);
      console.log('Data model loaded successfully');
      return model;
    } catch (error) {
      console.error('Error loading data model:', error);
      return null;
    }
  }
  
  /**
   * Find a file by name in a specific folder
   */
  private async findFile(name: string, parentId: string): Promise<string | null> {
    const headers = await this.getAuthHeaders();
    
    const query = `name='${name}' and '${parentId}' in parents and trashed=false`;
    
    try {
      const response = await fetch(
        `${this.DRIVE_API_BASE}/files?` + new URLSearchParams({
          q: query,
          fields: 'files(id, name)',
          pageSize: '1'
        }),
        { headers }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to search for file: ${response.statusText}`);
      }
      
      const result = await response.json();
      const files = result.files || [];
      return files.length > 0 ? files[0].id : null;
    } catch (error) {
      console.error(`Error finding file ${name}:`, error);
      return null;
    }
  }
  
  /**
   * Upload a file to Google Drive
   */
  async uploadFile(
    file: File, 
    parentFolderId: string, 
    metadata?: Partial<DriveFile>
  ): Promise<DriveFile> {
    const headers = await this.getAuthHeaders();
    
    const fileMetadata = {
      name: metadata?.name || file.name,
      parents: [parentFolderId]
    };
    
    try {
      // Use resumable upload for larger files
      const boundary = '314159265358979323846';
      const delimiter = "--" + boundary + "\r\n";
      const closeDelimiter = "\r\n--" + boundary + "--";
      
      const reader = new FileReader();
      const fileContent = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      
      const base64Data = fileContent.split(',')[1];
      
      const multipartBody = 
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(fileMetadata) +
        "\r\n" + delimiter +
        'Content-Type: ' + file.type + '\r\n' +
        'Content-Transfer-Encoding: base64\r\n\r\n' +
        base64Data +
        closeDelimiter;
      
      const response = await fetch(`${this.DRIVE_API_BASE}/files?uploadType=multipart`, {
        method: 'POST',
        headers: {
          'Authorization': headers['Authorization'] as string,
          'Content-Type': 'multipart/related; boundary=' + boundary
        },
        body: multipartBody
      });
      
      if (!response.ok) {
        throw new Error(`Failed to upload file: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('File uploaded successfully:', result);
      return result as DriveFile;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }
  
  /**
   * Download a file from Google Drive
   */
  async downloadFile(fileId: string): Promise<Blob> {
    const headers = await this.getAuthHeaders();
    
    try {
      const response = await fetch(`${this.DRIVE_API_BASE}/files/${fileId}?alt=media`, {
        headers: {
          'Authorization': headers['Authorization'] as string
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`);
      }
      
      return await response.blob();
    } catch (error) {
      console.error('Error downloading file:', error);
      throw error;
    }
  }
  
  /**
   * List files in a folder
   */
  async listFiles(folderId: string): Promise<DriveFile[]> {
    const headers = await this.getAuthHeaders();
    
    const query = `'${folderId}' in parents and trashed=false`;
    
    try {
      const response = await fetch(
        `${this.DRIVE_API_BASE}/files?` + new URLSearchParams({
          q: query,
          fields: 'files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink, webContentLink)',
          pageSize: '1000',
          orderBy: 'name'
        }),
        { headers }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to list files: ${response.statusText}`);
      }
      
      const result = await response.json();
      return (result.files || []) as DriveFile[];
    } catch (error) {
      console.error('Error listing files:', error);
      return [];
    }
  }
  
  /**
   * Delete a file or folder
   */
  async deleteFile(fileId: string): Promise<void> {
    const headers = await this.getAuthHeaders();
    
    try {
      const response = await fetch(`${this.DRIVE_API_BASE}/files/${fileId}`, {
        method: 'DELETE',
        headers
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete file: ${response.statusText}`);
      }
      
      console.log(`Deleted file/folder: ${fileId}`);
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }
  
  /**
   * Get file metadata
   */
  async getFileMetadata(fileId: string): Promise<DriveFile> {
    const headers = await this.getAuthHeaders();
    
    try {
      const response = await fetch(
        `${this.DRIVE_API_BASE}/files/${fileId}?` + new URLSearchParams({
          fields: 'id, name, mimeType, size, createdTime, modifiedTime, webViewLink, webContentLink, parents'
        }),
        { headers }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to get file metadata: ${response.statusText}`);
      }
      
      return await response.json() as DriveFile;
    } catch (error) {
      console.error('Error getting file metadata:', error);
      throw error;
    }
  }
  
  /**
   * Search for files across all folders
   */
  async searchFiles(query: string): Promise<DriveFile[]> {
    const headers = await this.getAuthHeaders();
    
    const driveQuery = `fullText contains '${query}' and trashed=false`;
    
    try {
      const response = await fetch(
        `${this.DRIVE_API_BASE}/files?` + new URLSearchParams({
          q: driveQuery,
          fields: 'files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink, webContentLink)',
          pageSize: '100'
        }),
        { headers }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to search files: ${response.statusText}`);
      }
      
      const result = await response.json();
      return (result.files || []) as DriveFile[];
    } catch (error) {
      console.error('Error searching files:', error);
      return [];
    }
  }
}

export const googleDriveService = GoogleDriveService.getInstance();