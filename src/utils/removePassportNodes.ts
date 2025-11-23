/**
 * Utility to remove existing passport nodes from the document graph
 * This helps avoid conflicts when adding new passport documents via AI
 */

import { dataService } from '../services/dataService-adapter';
import { StandaloneEntity } from '../data/standalone-model';

export const removePassportNodes = {
  /**
   * Find all passport nodes in the current data model
   */
  findPassportNodes() {
    const model = dataService.getModel();
    const allEntities = model.search({}).entities;
    
    const passportNodes = allEntities.filter((entity: StandaloneEntity) => {
      // Check various ways a passport might be identified
      const labelLower = entity.label.toLowerCase();
      const descLower = (entity.description || '').toLowerCase();
      const metadataDocType = ((entity.metadata as any)?.documentType || '').toLowerCase();
      const categoryLower = ((entity as any).category || '').toLowerCase();
      
      return (
        labelLower.includes('passport') ||
        descLower.includes('passport') ||
        metadataDocType === 'passport' ||
        categoryLower === 'passport'
      );
    });
    
    console.log('Found passport nodes:', passportNodes);
    return passportNodes;
  },
  
  /**
   * Remove passport nodes for specific people
   */
  removePassportsForPeople(peopleNames: string[]) {
    const model = dataService.getModel();
    const passportNodes = this.findPassportNodes();
    
    const nodesToRemove = passportNodes.filter((node: StandaloneEntity) => {
      // Check if this passport belongs to one of the specified people
      return peopleNames.some(name => {
        const nameLower = name.toLowerCase();
        const labelLower = node.label.toLowerCase();
        const descLower = (node.description || '').toLowerCase();
        
        return labelLower.includes(nameLower) || descLower.includes(nameLower);
      });
    });
    
    console.log(`Removing ${nodesToRemove.length} passport nodes for:`, peopleNames);
    
    // Remove each node
    nodesToRemove.forEach((node: StandaloneEntity) => {
      try {
        console.log(`Removing passport node: ${node.label} (${node.id})`);
        dataService.deleteEntity(node.id);
      } catch (error) {
        console.error(`Failed to remove node ${node.id}:`, error);
      }
    });
    
    // Save changes
    dataService.saveChanges();
    
    return nodesToRemove.length;
  },
  
  /**
   * Remove all passport nodes
   */
  removeAllPassports() {
    const passportNodes = this.findPassportNodes();
    
    console.log(`Removing all ${passportNodes.length} passport nodes`);
    
    passportNodes.forEach((node: StandaloneEntity) => {
      try {
        console.log(`Removing passport node: ${node.label} (${node.id})`);
        dataService.deleteEntity(node.id);
      } catch (error) {
        console.error(`Failed to remove node ${node.id}:`, error);
      }
    });
    
    // Save changes
    dataService.saveChanges();
    
    return passportNodes.length;
  },
  
  /**
   * List all passport nodes without removing them
   */
  listPassports() {
    const passportNodes = this.findPassportNodes();
    
    console.log('\n=== Passport Nodes Found ===');
    passportNodes.forEach((node: StandaloneEntity, index: number) => {
      console.log(`${index + 1}. ${node.label}`);
      console.log(`   ID: ${node.id}`);
      console.log(`   Type: ${node.type}`);
      console.log(`   Description: ${node.description || 'N/A'}`);
      console.log(`   Document Type: ${(node.metadata as any)?.documentType || 'N/A'}`);
      if (node.parentIds && node.parentIds.length > 0) {
        console.log(`   Parent IDs: ${node.parentIds.join(', ')}`);
      }
      console.log('');
    });
    
    return passportNodes;
  }
};

// Export for console access
if (typeof window !== 'undefined') {
  (window as any).removePassportNodes = removePassportNodes;
}