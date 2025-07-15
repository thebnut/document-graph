/**
 * Document Organizer Service
 * Manages person folder structure and document organization in Google Drive
 */

import { googleDriveService } from './googleDriveService';
import { googleAuthService } from './googleAuthService';
import { StandaloneEntity, EntityType } from '../data/standalone-model';
import { DocumentGraphModel } from '../data/standalone-model-implementation';

interface PersonFolder {
  personName: string;
  folderId: string;
  entityId: string;
}

interface FolderCache {
  documentsFolderId: string;
  personFolders: PersonFolder[];
  householdFolderId?: string;
}

export class DocumentOrganizerService {
  private static instance: DocumentOrganizerService | null = null;
  private folderCache: FolderCache | null = null;
  
  private constructor() {}
  
  static getInstance(): DocumentOrganizerService {
    if (!DocumentOrganizerService.instance) {
      DocumentOrganizerService.instance = new DocumentOrganizerService();
    }
    return DocumentOrganizerService.instance;
  }
  
  /**
   * Initialize folder structure for all people in the model
   */
  async initializeFolderStructure(model: DocumentGraphModel): Promise<FolderCache> {
    if (!googleAuthService.isAuthenticated()) {
      throw new Error('Not authenticated with Google Drive');
    }
    
    // Get base folder structure
    const folderStructure = await googleDriveService.ensureFolderStructure();
    
    // Extract all person entities
    const people = model.search({ types: ['person'] }).entities;
    console.log(`Found ${people.length} people to create folders for`);
    
    // Create person folders
    const personFolders: PersonFolder[] = [];
    
    for (const person of people) {
      const folderId = await googleDriveService.createPersonFolder(
        person.label,
        folderStructure.documentsFolderId
      );
      
      personFolders.push({
        personName: person.label,
        folderId,
        entityId: person.id
      });
      
      console.log(`Created/found folder for ${person.label}: ${folderId}`);
    }
    
    // Create household folder for shared documents
    const householdFolderId = await googleDriveService.createPersonFolder(
      'Household',
      folderStructure.documentsFolderId
    );
    
    this.folderCache = {
      documentsFolderId: folderStructure.documentsFolderId,
      personFolders,
      householdFolderId
    };
    
    return this.folderCache;
  }
  
  /**
   * Get the appropriate folder for a document based on its ownership
   */
  async getDocumentFolder(entity: StandaloneEntity, model: DocumentGraphModel): Promise<string> {
    if (!this.folderCache) {
      throw new Error('Folder structure not initialized');
    }
    
    // Find the person this document belongs to by walking up the hierarchy
    const person = this.findOwnerPerson(entity, model);
    
    if (person) {
      const personFolder = this.folderCache.personFolders.find(
        pf => pf.entityId === person.id
      );
      
      if (personFolder) {
        return personFolder.folderId;
      }
    }
    
    // Default to household folder for shared documents
    return this.folderCache.householdFolderId || this.folderCache.documentsFolderId;
  }
  
  /**
   * Find the person entity that owns this document
   */
  private findOwnerPerson(entity: StandaloneEntity, model: DocumentGraphModel): StandaloneEntity | null {
    // If this is already a person, return it
    if (entity.type === 'person') {
      return entity;
    }
    
    // Walk up the parent hierarchy to find a person
    if (entity.parentIds && entity.parentIds.length > 0) {
      for (const parentId of entity.parentIds) {
        const parent = model.getEntity(parentId);
        if (parent) {
          const person = this.findOwnerPerson(parent, model);
          if (person) {
            return person;
          }
        }
      }
    }
    
    return null;
  }
  
  /**
   * Upload a document to the appropriate person folder
   */
  async uploadDocument(
    file: File,
    entity: StandaloneEntity,
    model: DocumentGraphModel
  ): Promise<{
    fileId: string;
    webViewLink: string;
    webContentLink: string;
    personFolder: string;
  }> {
    const folderId = await this.getDocumentFolder(entity, model);
    
    // Find which person folder this is
    let personFolder = 'Household';
    if (this.folderCache) {
      const match = this.folderCache.personFolders.find(pf => pf.folderId === folderId);
      if (match) {
        personFolder = match.personName;
      }
    }
    
    // Upload the file
    const driveFile = await googleDriveService.uploadFile(file, folderId, {
      name: file.name
    });
    
    return {
      fileId: driveFile.id,
      webViewLink: driveFile.webViewLink || `https://drive.google.com/file/d/${driveFile.id}/view`,
      webContentLink: driveFile.webContentLink || `https://drive.google.com/uc?id=${driveFile.id}&export=download`,
      personFolder
    };
  }
  
  /**
   * Get folder statistics
   */
  getFolderStats(): { totalFolders: number; personFolders: string[] } | null {
    if (!this.folderCache) {
      return null;
    }
    
    return {
      totalFolders: this.folderCache.personFolders.length + 1, // +1 for household
      personFolders: this.folderCache.personFolders.map(pf => pf.personName)
    };
  }
  
  /**
   * Clear cache (e.g., on sign out)
   */
  clearCache(): void {
    this.folderCache = null;
  }
  
  /**
   * Check if folders are initialized
   */
  isInitialized(): boolean {
    return this.folderCache !== null;
  }
}

// Export singleton instance
export const documentOrganizerService = DocumentOrganizerService.getInstance();