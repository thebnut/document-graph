import React, { useEffect } from 'react';
import { dataService } from '../services/dataService-adapter';

export const ModelChecker: React.FC = () => {
  useEffect(() => {
    const model = dataService.getModel();
    console.log('=== Model Check ===');
    console.log('Model type:', model.constructor.name);
    console.log('Model object:', model);
    
    // Check for new model methods
    const hasNewMethods = {
      search: typeof (model as any).search === 'function',
      validate: typeof (model as any).validate === 'function',
      getStatistics: typeof (model as any).getStatistics === 'function',
      toJSON: typeof (model as any).toJSON === 'function'
    };
    
    console.log('New model methods:', hasNewMethods);
    
    // Try to get statistics (only in new model)
    try {
      const stats = (model as any).getStatistics();
      console.log('✅ Using NEW standalone model!');
      console.log('Statistics:', stats);
    } catch (e) {
      console.log('❌ Using OLD model');
    }
    
    // Check for Google Drive references
    const entities = dataService.getAllEntities();
    const docWithPath = entities.find(e => (e as any).documentPath);
    console.log('Document path format:', (docWithPath as any)?.documentPath);
    
    console.log('=== End Model Check ===');
  }, []);
  
  return null;
};