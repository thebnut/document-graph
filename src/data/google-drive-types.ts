/**
 * Google Drive integration types for document storage
 */

// Google Drive specific document reference
export interface GoogleDriveReference {
  id: string;
  type: 'google-drive';
  
  // Google Drive identifiers
  fileId: string;                    // Google Drive file ID
  driveId?: string;                  // Shared drive ID (if applicable)
  folderId?: string;                 // Parent folder ID
  
  // File metadata
  fileName: string;
  mimeType: string;
  fileSize?: number;
  
  // Authentication
  driveAccount: string;              // User's Google account email
  requiresAuth: true;
  accessMethod: 'oauth2';
  
  // Timestamps from Google Drive
  createdTime: string;               // ISO 8601
  modifiedTime: string;              // ISO 8601
  viewedByMeTime?: string;           // ISO 8601
  
  // Permissions
  owners: GoogleDriveUser[];
  permissions?: GoogleDrivePermission[];
  shared: boolean;
  writersCanShare?: boolean;
  
  // File capabilities
  capabilities?: {
    canEdit: boolean;
    canComment: boolean;
    canShare: boolean;
    canDownload: boolean;
    canTrash: boolean;
    canRename: boolean;
    canMoveItemIntoTeamDrive: boolean;
  };
  
  // Caching
  lastAccessed?: string;             // ISO 8601
  cachedUrl?: string;                // Temporary download URL
  cacheExpiry?: string;              // ISO 8601
  thumbnailUrl?: string;             // Google Drive thumbnail
  
  // Additional metadata
  webViewLink?: string;              // Link to view in Google Drive
  webContentLink?: string;           // Direct download link
  iconLink?: string;                 // File type icon
  hasThumbnail?: boolean;
  headRevisionId?: string;           // For version tracking
  md5Checksum?: string;              // File integrity
  
  // App properties (custom metadata)
  appProperties?: {
    documentId?: string;             // Link to our entity ID
    category?: string;
    tags?: string;
    encrypted?: boolean;
  };
}

// Google Drive user representation
export interface GoogleDriveUser {
  kind: 'drive#user';
  displayName: string;
  photoLink?: string;
  me: boolean;
  permissionId: string;
  emailAddress: string;
}

// Google Drive permission
export interface GoogleDrivePermission {
  id: string;
  type: 'user' | 'group' | 'domain' | 'anyone';
  emailAddress?: string;
  domain?: string;
  role: 'owner' | 'organizer' | 'fileOrganizer' | 'writer' | 'commenter' | 'reader';
  displayName?: string;
  photoLink?: string;
  deleted?: boolean;
  pendingOwner?: boolean;
}

// Google Drive OAuth2 token
export interface GoogleDriveToken {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;                // Seconds until expiration
  refresh_token?: string;
  scope: string;
  
  // Computed fields
  expires_at?: string;               // ISO 8601 computed expiration
}

// Google Drive API configuration
export interface GoogleDriveConfig {
  clientId: string;
  apiKey: string;
  discoveryDocs: string[];
  scopes: string[];
  
  // Optional settings
  hostedDomain?: string;             // Restrict to specific domain
  loginHint?: string;                // Pre-fill email
  prompt?: 'none' | 'consent' | 'select_account';
}

// Google Drive folder structure for our app
export interface GoogleDriveFolderStructure {
  rootFolderId: string;              // Main LifeMap folder
  structure: {
    people: string;                  // People folder ID
    assets: string;                  // Assets folder ID
    documents: {
      identity: string;
      health: string;
      finance: string;
      education: string;
      work: string;
      travel: string;
      [key: string]: string;         // Additional categories
    };
  };
}

// File upload request
export interface GoogleDriveUploadRequest {
  file: File | Blob;
  metadata: {
    name: string;
    mimeType?: string;
    parents?: string[];              // Parent folder IDs
    description?: string;
    appProperties?: Record<string, string>;
  };
  
  // Upload options
  fields?: string;                   // Fields to return
  uploadType?: 'media' | 'multipart' | 'resumable';
  onProgress?: (progress: number) => void;
}

// Batch operation request
export interface GoogleDriveBatchRequest {
  requests: Array<{
    id: string;                      // Client-side request ID
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    path: string;                    // API path
    body?: any;                      // Request body
  }>;
}

// Search query builder
export interface GoogleDriveSearchQuery {
  // Basic filters
  name?: string;
  mimeType?: string | string[];
  modifiedAfter?: Date | string;
  modifiedBefore?: Date | string;
  
  // Location filters
  parents?: string[];                // Parent folder IDs
  inTrash?: boolean;
  isFolder?: boolean;
  
  // Ownership filters
  owners?: string[];                 // Email addresses
  writers?: string[];
  readers?: string[];
  
  // Full-text search
  fullText?: string;
  
  // App-specific filters
  appProperties?: Record<string, string>;
  
  // Result options
  orderBy?: string;                  // e.g., 'modifiedTime desc'
  pageSize?: number;
  pageToken?: string;
  fields?: string;                   // Fields to include in response
}

// Google Drive service interface
export interface GoogleDriveService {
  // Authentication
  authenticate(): Promise<GoogleDriveToken>;
  refreshToken(refreshToken: string): Promise<GoogleDriveToken>;
  revokeToken(token: string): Promise<void>;
  
  // File operations
  getFile(fileId: string): Promise<GoogleDriveReference>;
  uploadFile(request: GoogleDriveUploadRequest): Promise<GoogleDriveReference>;
  updateFile(fileId: string, updates: Partial<GoogleDriveReference>): Promise<GoogleDriveReference>;
  deleteFile(fileId: string): Promise<void>;
  downloadFile(fileId: string): Promise<Blob>;
  
  // Folder operations
  createFolder(name: string, parentId?: string): Promise<string>;
  ensureFolderStructure(): Promise<GoogleDriveFolderStructure>;
  
  // Search
  search(query: GoogleDriveSearchQuery): Promise<GoogleDriveReference[]>;
  
  // Permissions
  shareFile(fileId: string, permission: Partial<GoogleDrivePermission>): Promise<void>;
  updatePermission(fileId: string, permissionId: string, updates: Partial<GoogleDrivePermission>): Promise<void>;
  removePermission(fileId: string, permissionId: string): Promise<void>;
  
  // Batch operations
  batchRequest(batch: GoogleDriveBatchRequest): Promise<any[]>;
  
  // Utility
  getQuota(): Promise<{ limit: number; usage: number; usageInDrive: number }>;
  exportFile(fileId: string, mimeType: string): Promise<Blob>;
}

// Helper type to convert between our document reference and Google Drive
export type DocumentReferenceToGoogleDrive = {
  from(doc: GoogleDriveReference): {
    id: string;
    type: 'google-drive';
    location: string;                // google-drive://[fileId]
    mimeType: string;
    fileName: string;
    fileSize?: number;
    provider: 'google-drive';
    accessMethod: 'oauth2';
    requiresAuth: true;
    uploadedAt: string;
    uploadedBy: string;
    lastModified: string;
    checksum?: string;
    thumbnailUrl?: string;
    cloudMetadata: {
      driveId?: string;
      folderId?: string;
      permissions: string[];
      webViewLink?: string;
    };
  };
  
  to(ref: any): GoogleDriveReference;
};

// Constants
export const GOOGLE_DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',        // Files created by app
  'https://www.googleapis.com/auth/drive.appdata',     // App-specific data
  'https://www.googleapis.com/auth/drive.metadata',    // File metadata
  'https://www.googleapis.com/auth/drive.readonly'     // Read all files
];

export const GOOGLE_DRIVE_MIME_TYPES = {
  FOLDER: 'application/vnd.google-apps.folder',
  DOCUMENT: 'application/vnd.google-apps.document',
  SPREADSHEET: 'application/vnd.google-apps.spreadsheet',
  PRESENTATION: 'application/vnd.google-apps.presentation',
  PDF: 'application/pdf',
  IMAGE_JPEG: 'image/jpeg',
  IMAGE_PNG: 'image/png'
};

export const LIFEMAP_FOLDER_NAME = 'LifeMap Documents';
export const LIFEMAP_APP_PROPERTIES_KEY = 'lifemap-document-id';