/**
 * Quick test to verify the new model is being used
 */

import { dataService } from './dataService-adapter';

// Test that we're using the new model
const model = dataService.getModel();
console.log('Model type:', model.constructor.name);
console.log('Has search method?', typeof (model as any).search === 'function');
console.log('Has validate method?', typeof (model as any).validate === 'function');

// Get some entities
const entities = dataService.getAllEntities();
console.log('\nTotal entities:', entities.length);

// Check for Google Drive references
const firstDoc = entities.find(e => e.documentPath);
console.log('\nFirst document found:', firstDoc?.label);
console.log('Document path format:', firstDoc?.documentPath);

// Search test
const searchResults = dataService.searchEntities('passport');
console.log('\nSearch results for "passport":', searchResults.length);

// Statistics (only available in new model)
try {
  const stats = (model as any).getStatistics();
  console.log('\nStatistics available:', stats);
  console.log('Using NEW standalone model! ✅');
} catch (e) {
  console.log('\nStatistics not available - using OLD model ❌');
}

export {};