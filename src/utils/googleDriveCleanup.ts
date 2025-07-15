/**
 * Cleanup utilities for Google Drive testing
 */

import { googleDriveService } from '../services/googleDriveService';

export const googleDriveCleanup = {
  /**
   * Delete all test files and folders
   */
  async cleanupTestData() {
    console.log('🧹 Cleaning up test data from Google Drive...');
    
    try {
      // Find the lifemap-data folder
      const rootFolderId = await (googleDriveService as any).findFolder('lifemap-data');
      
      if (rootFolderId) {
        console.log('Found lifemap-data folder:', rootFolderId);
        console.log('Deleting folder and all contents...');
        
        await googleDriveService.deleteFile(rootFolderId);
        console.log('✅ Deleted lifemap-data folder and all contents');
      } else {
        console.log('No lifemap-data folder found');
      }
      
      return true;
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
      return false;
    }
  },
  
  /**
   * List all files in lifemap-data folder
   */
  async listFiles() {
    console.log('📋 Listing files in Google Drive...');
    
    try {
      const rootFolderId = await (googleDriveService as any).findFolder('lifemap-data');
      
      if (!rootFolderId) {
        console.log('No lifemap-data folder found');
        return;
      }
      
      console.log('Found lifemap-data folder:', rootFolderId);
      
      // List files in root
      const rootFiles = await googleDriveService.listFiles(rootFolderId);
      console.log('\nFiles in lifemap-data:', rootFiles);
      
      // Find and list files in subdirectories
      for (const file of rootFiles) {
        if (file.mimeType === 'application/vnd.google-apps.folder') {
          console.log(`\nFiles in ${file.name}:`);
          const subFiles = await googleDriveService.listFiles(file.id);
          console.log(subFiles);
        }
      }
    } catch (error) {
      console.error('❌ List files failed:', error);
    }
  }
};

// Export to window for console access
if (typeof window !== 'undefined') {
  (window as any).googleDriveCleanup = googleDriveCleanup;
  console.log('🧹 Cleanup utilities available:');
  console.log('   googleDriveCleanup.cleanupTestData() - Delete all test data');
  console.log('   googleDriveCleanup.listFiles() - List all files in lifemap-data');
}