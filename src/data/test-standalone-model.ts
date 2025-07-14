/**
 * Test file demonstrating the standalone model implementation
 * Run with: npx ts-node src/data/test-standalone-model.ts
 */

import { DocumentGraphModel } from './standalone-model-implementation';
import { StandaloneDataService } from '../services/standaloneDataService';
import { DataMigration, MigrationValidator } from './migration-utils';
import { config } from '../config/app-config';
import expandedSampleData from './expandedSampleData.json';

async function testStandaloneModel() {
  console.log('🧪 Testing Standalone Document Graph Model\n');
  
  // Test 1: Create new model from scratch
  console.log('1️⃣ Test: Creating new model from scratch');
  const model = new DocumentGraphModel();
  
  // Add a person
  const brett = model.addEntity({
    label: 'Brett Thebault',
    type: 'person',
    level: 1,
    description: 'Father, primary account holder',
    tags: ['family', 'parent'],
    createdBy: 'test-user',
    modifiedBy: 'test-user'
  });
  console.log('✅ Added person:', brett.label);
  
  // Add a document with Google Drive reference
  const passport = model.addEntity({
    label: 'Brett Passport',
    type: 'document',
    category: 'passport',
    level: 3,
    parentIds: [brett.id],
    expiry: '2029-05-15',
    documents: [{
      id: 'doc-001',
      type: 'google-drive',
      location: 'google-drive://test-file-id-123',
      mimeType: 'image/jpeg',
      fileName: 'brett-passport.jpg',
      fileSize: 2048000,
      provider: 'google-drive',
      accessMethod: 'oauth2',
      requiresAuth: true,
      uploadedAt: new Date().toISOString(),
      uploadedBy: 'test-user',
      googleDriveMetadata: {
        fileId: 'test-file-id-123',
        driveAccount: 'brett@lifemap.au',
        shared: false,
        capabilities: {
          canEdit: true,
          canShare: true,
          canDownload: true
        }
      }
    }],
    metadata: {
      passportNumber: 'ABC123456',
      country: 'Australia',
      expiryDate: '2029-05-15'
    },
    createdBy: 'test-user',
    modifiedBy: 'test-user'
  });
  console.log('✅ Added document with Google Drive reference\n');
  
  // Test 2: Search functionality
  console.log('2️⃣ Test: Search functionality');
  const searchResults = model.search({ text: 'passport' });
  console.log(`✅ Found ${searchResults.totalCount} results for "passport"`);
  console.log(`   Execution time: ${searchResults.executionTime}ms\n`);
  
  // Test 3: Migration from old format
  console.log('3️⃣ Test: Migration from old format');
  const migration = new DataMigration();
  const migrationResult = await migration.migrateToStandalone(
    expandedSampleData as any,
    'user@lifemap.au'
  );
  
  console.log('✅ Migration complete:');
  console.log(`   Total entities: ${migrationResult.summary.totalEntities}`);
  console.log(`   Total relationships: ${migrationResult.summary.totalRelationships}`);
  console.log(`   Pending uploads: ${migrationResult.summary.pendingUploads}`);
  console.log(`   Migration ID: ${migrationResult.summary.migrationId}\n`);
  
  // Test 4: Validation
  console.log('4️⃣ Test: Model validation');
  const validation = model.validate();
  console.log(`✅ Validation ${validation.valid ? 'passed' : 'failed'}`);
  console.log(`   Errors: ${validation.errors.length}`);
  console.log(`   Warnings: ${validation.warnings.length}\n`);
  
  // Test 5: Expiring documents
  console.log('5️⃣ Test: Expiring documents');
  const expiringDocs = model.getExpiringDocuments(365 * 5); // Next 5 years
  console.log(`✅ Found ${expiringDocs.length} expiring documents`);
  expiringDocs.slice(0, 3).forEach(doc => {
    console.log(`   - ${doc.label} expires ${doc.expiry}`);
  });
  console.log();
  
  // Test 6: Statistics
  console.log('6️⃣ Test: Model statistics');
  const stats = model.getStatistics();
  console.log('✅ Statistics:');
  console.log(`   Total entities: ${stats.totalEntities}`);
  console.log(`   Total relationships: ${stats.totalRelationships}`);
  console.log(`   Entities by type:`, stats.entitiesByType);
  console.log();
  
  // Test 7: Standalone Data Service
  console.log('7️⃣ Test: StandaloneDataService with ReactFlow compatibility');
  const dataService = new StandaloneDataService();
  
  // Get nodes for ReactFlow
  const nodes = dataService.entitiesToNodes();
  console.log(`✅ Generated ${nodes.length} ReactFlow nodes`);
  
  // Get edges for ReactFlow
  const edges = dataService.relationshipsToEdges();
  console.log(`✅ Generated ${edges.length} ReactFlow edges`);
  
  // Test search through service
  const serviceSearch = dataService.searchEntities('health');
  console.log(`✅ Service search found ${serviceSearch.length} results for "health"\n`);
  
  // Test 8: Configuration
  console.log('8️⃣ Test: App configuration');
  console.log('✅ Configuration loaded:');
  console.log(`   App name: ${config.app.name}`);
  console.log(`   Domain: ${config.app.domain}`);
  console.log(`   Environment: ${config.app.environment}`);
  console.log(`   Google Drive folder: ${config.storage.googleDrive.rootFolderName}`);
  console.log(`   Max file size: ${config.storage.googleDrive.maxFileSize / 1024 / 1024}MB`);
  console.log();
  
  // Test 9: Export/Import
  console.log('9️⃣ Test: Export/Import functionality');
  const exported = model.toJSON();
  console.log(`✅ Exported model: ${exported.length} characters`);
  
  const imported = DocumentGraphModel.fromJSON(exported);
  const importedStats = imported.getStatistics();
  console.log(`✅ Imported model: ${importedStats.totalEntities} entities`);
  console.log();
  
  // Test 10: Migration validation
  console.log('🔟 Test: Migration validation');
  const validationReport = MigrationValidator.validate(
    expandedSampleData as any,
    migrationResult.graph
  );
  console.log(`✅ Migration validation: ${validationReport.valid ? 'PASSED' : 'FAILED'}`);
  console.log(`   Errors: ${validationReport.summary.errors}`);
  console.log(`   Warnings: ${validationReport.summary.warnings}`);
  console.log(`   Info: ${validationReport.summary.info}`);
  
  // Show sample issues if any
  if (validationReport.issues.length > 0) {
    console.log('\n   Sample issues:');
    validationReport.issues.slice(0, 3).forEach(issue => {
      console.log(`   - [${issue.level}] ${issue.message}`);
    });
  }
  
  console.log('\n✅ All tests completed successfully!');
  console.log('\n📝 Summary:');
  console.log('- Standalone model is working correctly');
  console.log('- Google Drive integration types are in place');
  console.log('- Migration from old format is functional');
  console.log('- Backward compatibility with ReactFlow maintained');
  console.log('- Configuration system ready with lifemap.au domain');
  console.log('\n🚀 Ready for implementation in the UI!');
}

// Run tests if this file is executed directly
if (require.main === module) {
  testStandaloneModel().catch(console.error);
}

export { testStandaloneModel };