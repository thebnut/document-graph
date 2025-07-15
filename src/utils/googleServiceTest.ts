/**
 * Test utility for Google Drive services
 * This file provides functions to test the authentication and drive services
 */

import { googleAuthService } from '../services/googleAuthService';
import { googleDriveService } from '../services/googleDriveService';
import type { StandaloneDocumentGraph } from '../data/standalone-model';

export const testGoogleServices = {
  /**
   * Test authentication flow
   */
  async testAuth() {
    console.log('🔐 Testing Google Authentication...');
    
    try {
      // Initialize
      console.log('Initializing Google API...');
      await googleAuthService.initialize();
      console.log('✅ Google API initialized');
      
      // Check auth state
      const isAuth = googleAuthService.isAuthenticated();
      console.log(`Authentication status: ${isAuth ? '✅ Authenticated' : '❌ Not authenticated'}`);
      
      if (!isAuth) {
        console.log('🔄 Starting sign-in flow...');
        const user = await googleAuthService.signIn();
        console.log('✅ Sign-in successful:', user.getBasicProfile().getEmail());
      }
      
      // Get access token
      const token = googleAuthService.getAccessToken();
      console.log(`Access token: ${token ? '✅ Available' : '❌ Not available'}`);
      
      return true;
    } catch (error) {
      console.error('❌ Auth test failed:', error);
      return false;
    }
  },
  
  /**
   * Test folder structure creation
   */
  async testFolderStructure() {
    console.log('📁 Testing Folder Structure...');
    
    try {
      const structure = await googleDriveService.ensureFolderStructure();
      console.log('✅ Folder structure created:', structure);
      
      // Test creating person folder
      const personName = 'Test Person';
      const personFolderId = await googleDriveService.createPersonFolder(
        personName, 
        structure.documentsFolderId
      );
      console.log(`✅ Person folder created: ${personName} (${personFolderId})`);
      
      return true;
    } catch (error) {
      console.error('❌ Folder structure test failed:', error);
      return false;
    }
  },
  
  /**
   * Test data model save/load
   */
  async testDataModel() {
    console.log('💾 Testing Data Model Save/Load...');
    
    try {
      // Create test data
      const currentTime = new Date().toISOString();
      const testModel: StandaloneDocumentGraph = {
        id: 'test-graph-' + Date.now(),
        version: '2.0.0',
        schema: 'https://lifemap.app/schemas/document-graph/v2.0.0',
        metadata: {
          title: 'Test Document Graph',
          description: 'Test graph for Google Drive integration',
          created: currentTime,
          modified: currentTime,
          createdBy: 'test-user@example.com',
          modifiedBy: 'test-user@example.com',
          tenant: 'test-family'
        },
        entities: [{
          id: 'test-1',
          type: 'person' as const,
          label: 'Test Person',
          description: 'Test description',
          level: 1,
          created: currentTime,
          modified: currentTime,
          createdBy: 'test-user@example.com',
          modifiedBy: 'test-user@example.com',
          tags: ['test'],
          metadata: {},
          documents: [],
          uiHints: {
            icon: 'user'
          }
        }],
        relationships: [],
        permissions: {
          owners: ['test-user@example.com'],
          editors: [],
          viewers: [],
          publicRead: false
        }
      };
      
      // Save
      console.log('Saving test model...');
      await googleDriveService.saveDataModel(testModel);
      console.log('✅ Model saved successfully');
      
      // Load
      console.log('Loading model from Drive...');
      const loaded = await googleDriveService.loadDataModel();
      console.log('✅ Model loaded:', loaded);
      
      return true;
    } catch (error) {
      console.error('❌ Data model test failed:', error);
      return false;
    }
  },
  
  /**
   * Run all tests
   */
  async runAll() {
    console.log('🧪 Running all Google Service tests...\n');
    
    const results = {
      auth: false,
      folders: false,
      dataModel: false
    };
    
    // Test auth first (required for other tests)
    results.auth = await this.testAuth();
    
    if (results.auth) {
      // Only run other tests if auth succeeded
      results.folders = await this.testFolderStructure();
      results.dataModel = await this.testDataModel();
    }
    
    console.log('\n📊 Test Results:');
    console.log(`Authentication: ${results.auth ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Folder Structure: ${results.folders ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Data Model: ${results.dataModel ? '✅ PASSED' : '❌ FAILED'}`);
    
    return results;
  }
};

// Export for use in browser console
if (typeof window !== 'undefined') {
  (window as any).testGoogleServices = testGoogleServices;
  console.log('💡 Google service tests available. Run: testGoogleServices.runAll()');
}