/**
 * Test utilities for AI services
 * Use in browser console to test document analysis
 */

import { documentAnalysisService } from '../services/documentAnalysisService';
import { documentPlacementService } from '../services/documentPlacementService';
import { dataService } from '../services/dataService-adapter';

interface TestAIServices {
  analyzeFile: (file: File) => Promise<void>;
  testWithSampleImage: () => Promise<void>;
  isConfigured: () => boolean;
}

const testAIServices: TestAIServices = {
  /**
   * Analyze a file and show results
   */
  analyzeFile: async (file: File) => {
    console.log('🔍 Analyzing file:', file.name);
    
    // Test document analysis
    const analysis = await documentAnalysisService.analyzeDocument(file);
    
    if ('error' in analysis) {
      console.error('❌ Analysis failed:', analysis.error);
      return;
    }
    
    console.log('✅ Analysis result:', analysis);
    console.log('   Summary:', analysis.summary);
    console.log('   Type:', analysis.documentType);
    console.log('   Confidence:', analysis.confidence + '%');
    console.log('   Extracted data:', analysis.extractedData);
    
    // Test placement decision
    const model = dataService.getModel();
    const placement = await documentPlacementService.determineDocumentPlacement(analysis, model);
    
    if ('error' in placement) {
      console.error('❌ Placement failed:', placement.error);
      return;
    }
    
    console.log('📍 Placement decision:', placement);
    console.log('   Path:', placement.suggestedPath.join(' > '));
    console.log('   Parent ID:', placement.parentNodeId);
    console.log('   Confidence:', placement.confidence + '%');
    console.log('   Reasoning:', placement.reasoning);
  },
  
  /**
   * Test with a sample image URL
   */
  testWithSampleImage: async () => {
    console.log('🎯 Testing with sample image...');
    
    // Create a sample image file
    const response = await fetch('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=');
    const blob = await response.blob();
    const file = new File([blob], 'test-document.png', { type: 'image/png' });
    
    await testAIServices.analyzeFile(file);
  },
  
  /**
   * Check if AI services are configured
   */
  isConfigured: () => {
    const analysisAvailable = documentAnalysisService.isAvailable();
    const placementAvailable = documentPlacementService.isAvailable();
    
    console.log('🔧 AI Services Configuration:');
    console.log('   Analysis service:', analysisAvailable ? '✅ Available' : '❌ Not configured');
    console.log('   Placement service:', placementAvailable ? '✅ Available' : '❌ Not configured');
    
    if (!analysisAvailable || !placementAvailable) {
      console.log('⚠️  Add REACT_APP_OPENAI_API_KEY to your .env file');
    }
    
    return analysisAvailable && placementAvailable;
  }
};

// Attach to window for console access
if (typeof window !== 'undefined') {
  (window as any).testAIServices = testAIServices;
  console.log('🤖 AI test utilities loaded. Available commands:');
  console.log('   testAIServices.isConfigured() - Check configuration');
  console.log('   testAIServices.analyzeFile(file) - Analyze a file');
  console.log('   testAIServices.testWithSampleImage() - Test with sample');
}

export default testAIServices;