/**
 * Google Drive Data Service
 * Extends StandaloneDataService to sync data with Google Drive
 */

import { StandaloneDataService } from './standaloneDataService';
import { StandaloneDocumentGraph } from '../data/standalone-model';
import { DocumentGraphModel } from '../data/standalone-model-implementation';
import { googleDriveService } from './googleDriveService';
import { googleAuthService } from './googleAuthService';
import { documentOrganizerService } from './documentOrganizerService';
import { config } from '../config/app-config';
import expandedSampleData from '../data/expandedSampleData.json';
import { DataMigration } from '../data/migration-utils';
import { DocumentGraphModel as OldModel } from '../data/model';

export interface SyncStatus {
  isSyncing: boolean;
  lastSyncTime: Date | null;
  syncError: string | null;
  pendingChanges: boolean;
}

interface LocalCache {
  data: StandaloneDocumentGraph;
  lastModified: string;
  lastSyncTime: string;
}

export class GoogleDriveDataService extends StandaloneDataService {
  private static instance: GoogleDriveDataService | null = null;
  private syncStatus: SyncStatus = {
    isSyncing: false,
    lastSyncTime: null,
    syncError: null,
    pendingChanges: false
  };
  private syncListeners: ((status: SyncStatus) => void)[] = [];
  private saveTimeout: NodeJS.Timeout | null = null;
  private lastSavedData: string | null = null;
  private _needsOnboarding: boolean = false;
  
  private constructor(data?: StandaloneDocumentGraph) {
    super(data, true);
  }
  
  static getInstance(): GoogleDriveDataService {
    if (!GoogleDriveDataService.instance) {
      GoogleDriveDataService.instance = new GoogleDriveDataService();
    }
    return GoogleDriveDataService.instance;
  }
  
  static resetInstance(): void {
    GoogleDriveDataService.instance = null;
  }
  
  /**
   * Initialize the service and load data
   */
  async initialize(): Promise<void> {
    if (!googleAuthService.isAuthenticated()) {
      console.log('Not authenticated, using sample data');
      return;
    }
    
    try {
      this.updateSyncStatus({ isSyncing: true });
      
      // Try to load from Google Drive
      const driveData = await this.loadFromDrive();
      
      if (driveData) {
        console.log('Loaded data from Google Drive');
        this.model = new DocumentGraphModel(driveData);
        this.cacheDataLocally(driveData);
        this._needsOnboarding = false;
      } else {
        console.log('No data in Google Drive - onboarding needed');
        this._needsOnboarding = true;
        // Don't automatically migrate - let the wizard handle it
        // User will be shown the LifemapBuilderWizard
        return;
      }
      
      // Initialize person folders
      console.log('Initializing person folders...');
      try {
        await documentOrganizerService.initializeFolderStructure(this.model);
        const stats = documentOrganizerService.getFolderStats();
        console.log('Person folders initialized:', stats);
      } catch (error) {
        console.error('Failed to initialize person folders:', error);
        // Don't fail the whole initialization if folder creation fails
      }
      
      this.updateSyncStatus({ 
        isSyncing: false, 
        lastSyncTime: new Date(),
        syncError: null 
      });
    } catch (error) {
      console.error('Failed to load from Google Drive:', error);
      
      // Try to load from local cache
      const cachedData = this.loadFromLocalCache();
      if (cachedData) {
        console.log('Loaded data from local cache');
        this.model = new DocumentGraphModel(cachedData);
      }
      
      this.updateSyncStatus({ 
        isSyncing: false, 
        syncError: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  /**
   * Load data from Google Drive
   */
  private async loadFromDrive(): Promise<StandaloneDocumentGraph | null> {
    return await googleDriveService.loadDataModel();
  }
  
  /**
   * Save data to Google Drive
   */
  private async saveToDrive(data: StandaloneDocumentGraph): Promise<void> {
    await googleDriveService.saveDataModel(data);
  }
  
  /**
   * Migrate sample data and save to Drive
   */
  private async migrateAndSaveInitialData(): Promise<void> {
    const migrationTool = new DataMigration();
    const oldData = expandedSampleData as OldModel;
    const userEmail = googleAuthService.getAuthState().userEmail || 'user@example.com';
    
    const migrationResult = await migrationTool.migrateToStandalone(oldData, userEmail);
    
    // Save to Drive
    await this.saveToDrive(migrationResult.graph);
    
    // Update local model
    this.model = new DocumentGraphModel(migrationResult.graph);
    
    // Cache locally
    this.cacheDataLocally(migrationResult.graph);
  }
  
  /**
   * Cache data locally for offline access
   */
  private cacheDataLocally(data: StandaloneDocumentGraph): void {
    if (typeof window === 'undefined') return; // Skip during webpack build

    try {
      const cache: LocalCache = {
        data,
        lastModified: new Date().toISOString(),
        lastSyncTime: new Date().toISOString()
      };

      window.localStorage.setItem('lifemap-data-cache', JSON.stringify(cache));
      this.lastSavedData = JSON.stringify(data);
    } catch (error) {
      console.error('Failed to cache data locally:', error);
    }
  }
  
  /**
   * Load data from local cache
   */
  private loadFromLocalCache(): StandaloneDocumentGraph | null {
    if (typeof window === 'undefined') return null; // Skip during webpack build

    try {
      const cached = window.localStorage.getItem('lifemap-data-cache');
      if (!cached) return null;

      const cache: LocalCache = JSON.parse(cached);
      return cache.data;
    } catch (error) {
      console.error('Failed to load from local cache:', error);
      return null;
    }
  }
  
  /**
   * Schedule auto-save
   */
  private scheduleAutoSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    
    const autoSaveInterval = config.features.autoSaveInterval;
    
    this.saveTimeout = setTimeout(() => {
      this.saveChanges();
    }, autoSaveInterval);
    
    // Mark as having pending changes
    this.updateSyncStatus({ pendingChanges: true });
  }
  
  /**
   * Save changes to Google Drive
   */
  async saveChanges(): Promise<void> {
    if (!googleAuthService.isAuthenticated()) {
      console.log('Not authenticated, skipping save');
      return;
    }
    
    // Get the model and convert to StandaloneDocumentGraph
    const model = this.getModel();
    const currentDataStr = model.toJSON();
    
    // Check if data has actually changed
    if (currentDataStr === this.lastSavedData) {
      console.log('No changes to save');
      this.updateSyncStatus({ pendingChanges: false });
      return;
    }
    
    const currentData: StandaloneDocumentGraph = JSON.parse(currentDataStr);
    
    try {
      this.updateSyncStatus({ isSyncing: true, pendingChanges: false });
      
      // Update modified timestamp
      if (currentData.metadata) {
        currentData.metadata.modified = new Date().toISOString();
        currentData.metadata.modifiedBy = googleAuthService.getAuthState().userEmail || 'unknown';
      }
      
      await this.saveToDrive(currentData);
      this.cacheDataLocally(currentData);
      this.lastSavedData = currentDataStr;
      
      this.updateSyncStatus({ 
        isSyncing: false, 
        lastSyncTime: new Date(),
        syncError: null
      });
      
      console.log('Changes saved to Google Drive');
    } catch (error) {
      console.error('Failed to save changes:', error);
      this.updateSyncStatus({ 
        isSyncing: false,
        syncError: error instanceof Error ? error.message : 'Unknown error',
        pendingChanges: true
      });
    }
  }
  
  /**
   * Update sync status and notify listeners
   */
  private updateSyncStatus(updates: Partial<SyncStatus>): void {
    this.syncStatus = { ...this.syncStatus, ...updates };
    this.notifySyncListeners();
  }
  
  /**
   * Subscribe to sync status changes
   */
  onSyncStatusChange(callback: (status: SyncStatus) => void): () => void {
    this.syncListeners.push(callback);
    
    // Immediately call with current status
    callback(this.syncStatus);
    
    // Return unsubscribe function
    return () => {
      this.syncListeners = this.syncListeners.filter(listener => listener !== callback);
    };
  }
  
  /**
   * Notify sync status listeners
   */
  private notifySyncListeners(): void {
    this.syncListeners.forEach(listener => {
      try {
        listener(this.syncStatus);
      } catch (error) {
        console.error('Error in sync status listener:', error);
      }
    });
  }
  
  /**
   * Get current sync status
   */
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  /**
   * Check if user needs to go through onboarding
   */
  needsOnboarding(): boolean {
    return this._needsOnboarding;
  }

  /**
   * Complete onboarding by saving the family name and model
   */
  async completeOnboarding(familyName: string): Promise<void> {
    // Update the metadata with family name
    const data = this.model.getData();
    data.metadata.familyName = familyName;
    data.metadata.modifiedBy = googleAuthService.getAuthState().userEmail || 'user';
    data.metadata.modified = new Date().toISOString();

    // Save to Drive
    await this.saveToDrive(data);

    // Cache locally
    this.cacheDataLocally(data);

    // Mark onboarding as complete
    this._needsOnboarding = false;

    console.log(`Onboarding completed for ${familyName}`);
  }

  // Override methods that modify data to trigger auto-save
  
  addEntity(entity: Partial<any>): any {
    const result = super.addEntity(entity);
    this.scheduleAutoSave();
    return result;
  }
  
  updateEntity(id: string, updates: Partial<any>): any {
    const result = super.updateEntity(id, updates);
    if (result) {
      this.scheduleAutoSave();
    }
    return result;
  }
  
  deleteEntity(id: string): boolean {
    const result = super.deleteEntity(id);
    if (result) {
      this.scheduleAutoSave();
    }
    return result;
  }
  
  updateUIHints(entityId: string, hints: any): void {
    const entity = this.getEntityById(entityId);
    if (entity) {
      this.updateEntity(entityId, {
        uiHints: { ...entity.uiHints, ...hints }
      });
    }
  }
  
  /**
   * Upload a document to Google Drive
   */
  async uploadDocument(
    file: File,
    entity: any
  ): Promise<{
    fileId: string;
    webViewLink: string;
    webContentLink: string;
    personFolder: string;
  }> {
    if (!googleAuthService.isAuthenticated()) {
      throw new Error('Not authenticated with Google Drive');
    }
    
    if (!documentOrganizerService.isInitialized()) {
      // Initialize if not already done
      await documentOrganizerService.initializeFolderStructure(this.model);
    }
    
    return await documentOrganizerService.uploadDocument(file, entity, this.model);
  }
}