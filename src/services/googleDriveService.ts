/**
 * Google Drive Service
 * Handles folder creation, file operations, and Drive API interactions
 */

import { gapi } from 'gapi-script';
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
  
  private constructor() {}
  
  static getInstance(): GoogleDriveService {
    if (!GoogleDriveService.instance) {
      GoogleDriveService.instance = new GoogleDriveService();
    }
    return GoogleDriveService.instance;
  }
  
  /**
   * Ensure the Drive API client is loaded
   */
  private async ensureDriveClient(): Promise<void> {
    if (!googleAuthService.isAuthenticated()) {
      throw new Error('User not authenticated');
    }
    
    // Load Drive API if not already loaded
    if (!gapi.client.drive) {
      await gapi.client.load('drive', 'v3');
    }
  }
  
  /**
   * Create a folder in Google Drive
   */
  async createFolder(name: string, parentId?: string): Promise<string> {
    await this.ensureDriveClient();
    
    const metadata: any = {
      name: name,
      mimeType: this.MIME_TYPE_FOLDER
    };
    
    if (parentId) {
      metadata.parents = [parentId];
    }
    
    try {
      const response = await gapi.client.drive.files.create({
        resource: metadata,
        fields: 'id, name'
      });
      
      console.log(`Created folder: ${name} with ID: ${response.result.id}`);
      return response.result.id!;
    } catch (error) {
      console.error(`Error creating folder ${name}:`, error);
      throw error;
    }
  }
  
  /**
   * Find a folder by name and optional parent
   */
  async findFolder(name: string, parentId?: string): Promise<string | null> {
    await this.ensureDriveClient();
    
    let query = `name='${name}' and mimeType='${this.MIME_TYPE_FOLDER}' and trashed=false`;
    
    if (parentId) {
      query += ` and '${parentId}' in parents`;
    }
    
    try {
      const response = await gapi.client.drive.files.list({
        q: query,
        fields: 'files(id, name)',
        pageSize: 10
      });
      
      const files = response.result.files || [];
      return files.length > 0 ? files[0].id! : null;
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
    await this.ensureDriveClient();
    
    const folderStructure = await this.ensureFolderStructure();
    const jsonContent = JSON.stringify(model, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    
    // Check if file already exists
    const existingFileId = await this.findFile(
      this.DATA_MODEL_FILE, 
      folderStructure.dataModelFolderId
    );
    
    const metadata: any = {
      name: this.DATA_MODEL_FILE,
      mimeType: 'application/json'
    };
    
    if (!existingFileId) {
      metadata.parents = [folderStructure.dataModelFolderId];
    }
    
    try {
      let response;
      
      if (existingFileId) {
        // Update existing file
        response = await gapi.client.request({
          path: `/upload/drive/v3/files/${existingFileId}`,
          method: 'PATCH',
          params: {
            uploadType: 'multipart',
            fields: 'id, name, modifiedTime'
          },
          headers: {
            'Content-Type': 'multipart/related; boundary=foo_bar_baz'
          },
          body: await this.createMultipartBody(metadata, blob, 'foo_bar_baz')
        });
      } else {
        // Create new file
        response = await gapi.client.request({
          path: '/upload/drive/v3/files',
          method: 'POST',
          params: {
            uploadType: 'multipart',
            fields: 'id, name, modifiedTime'
          },
          headers: {
            'Content-Type': 'multipart/related; boundary=foo_bar_baz'
          },
          body: await this.createMultipartBody(metadata, blob, 'foo_bar_baz')
        });
      }
      
      console.log('Data model saved successfully:', response.result);
    } catch (error) {
      console.error('Error saving data model:', error);
      throw error;
    }
  }
  
  /**
   * Load the data model from Google Drive
   */
  async loadDataModel(): Promise<StandaloneDocumentGraph | null> {
    await this.ensureDriveClient();
    
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
      const response = await gapi.client.drive.files.get({
        fileId: fileId,
        alt: 'media'
      });
      
      // The response.result contains the file content when using alt: 'media'
      // It could be a string or already parsed JSON
      let model: StandaloneDocumentGraph;
      
      if (typeof response.result === 'string') {
        model = JSON.parse(response.result);
      } else if (response.result && typeof response.result === 'object') {
        // If it's already an object, assume it's the parsed JSON
        model = response.result as unknown as StandaloneDocumentGraph;
      } else {
        throw new Error('Unexpected response format from Google Drive');
      }
      
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
    await this.ensureDriveClient();
    
    const query = `name='${name}' and '${parentId}' in parents and trashed=false`;
    
    try {
      const response = await gapi.client.drive.files.list({
        q: query,
        fields: 'files(id, name)',
        pageSize: 1
      });
      
      const files = response.result.files || [];
      return files.length > 0 ? files[0].id! : null;
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
    await this.ensureDriveClient();
    
    const fileMetadata: any = {
      name: metadata?.name || file.name,
      parents: [parentFolderId],
      mimeType: file.type
    };
    
    try {
      const response = await gapi.client.request({
        path: '/upload/drive/v3/files',
        method: 'POST',
        params: {
          uploadType: 'multipart',
          fields: 'id, name, mimeType, size, createdTime, modifiedTime, webViewLink, webContentLink'
        },
        headers: {
          'Content-Type': 'multipart/related; boundary=foo_bar_baz'
        },
        body: await this.createMultipartBody(fileMetadata, file, 'foo_bar_baz')
      });
      
      console.log('File uploaded successfully:', response.result);
      return response.result as DriveFile;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }
  
  /**
   * Download a file from Google Drive
   */
  async downloadFile(fileId: string): Promise<Blob> {
    await this.ensureDriveClient();
    
    try {
      const response = await gapi.client.drive.files.get({
        fileId: fileId,
        alt: 'media'
      });
      
      // Convert response to Blob
      const contentType = response.headers?.['Content-Type'] || 'application/octet-stream';
      const blob = new Blob([response.body], { 
        type: contentType
      });
      
      return blob;
    } catch (error) {
      console.error('Error downloading file:', error);
      throw error;
    }
  }
  
  /**
   * List files in a folder
   */
  async listFiles(folderId: string): Promise<DriveFile[]> {
    await this.ensureDriveClient();
    
    const query = `'${folderId}' in parents and trashed=false`;
    
    try {
      const response = await gapi.client.drive.files.list({
        q: query,
        fields: 'files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink, webContentLink)',
        pageSize: 1000,
        orderBy: 'name'
      });
      
      return (response.result.files || []) as DriveFile[];
    } catch (error) {
      console.error('Error listing files:', error);
      return [];
    }
  }
  
  /**
   * Delete a file or folder
   */
  async deleteFile(fileId: string): Promise<void> {
    await this.ensureDriveClient();
    
    try {
      await gapi.client.drive.files.delete({
        fileId: fileId
      });
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
    await this.ensureDriveClient();
    
    try {
      const response = await gapi.client.drive.files.get({
        fileId: fileId,
        fields: 'id, name, mimeType, size, createdTime, modifiedTime, webViewLink, webContentLink, parents'
      });
      
      return response.result as DriveFile;
    } catch (error) {
      console.error('Error getting file metadata:', error);
      throw error;
    }
  }
  
  /**
   * Create multipart body for file upload
   */
  private async createMultipartBody(
    metadata: any, 
    file: Blob, 
    boundary: string
  ): Promise<string> {
    const delimiter = '\r\n--' + boundary + '\r\n';
    const closeDelimiter = '\r\n--' + boundary + '--';
    
    // Convert blob to base64
    const base64 = await this.blobToBase64(file);
    const base64Data = base64.split(',')[1]; // Remove data URL prefix
    
    return delimiter +
      'Content-Type: application/json\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: ' + file.type + '\r\n' +
      'Content-Transfer-Encoding: base64\r\n\r\n' +
      base64Data +
      closeDelimiter;
  }
  
  /**
   * Convert blob to base64 string
   */
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  
  /**
   * Search for files across all folders
   */
  async searchFiles(query: string): Promise<DriveFile[]> {
    await this.ensureDriveClient();
    
    const driveQuery = `fullText contains '${query}' and trashed=false`;
    
    try {
      const response = await gapi.client.drive.files.list({
        q: driveQuery,
        fields: 'files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink, webContentLink)',
        pageSize: 100
      });
      
      return (response.result.files || []) as DriveFile[];
    } catch (error) {
      console.error('Error searching files:', error);
      return [];
    }
  }
}

export const googleDriveService = GoogleDriveService.getInstance();