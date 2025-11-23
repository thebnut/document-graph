/**
 * Document Analysis Service
 * Uses OpenAI's multimodal LLM to analyze documents and extract metadata
 */

import OpenAI from 'openai';
import { AI_CONFIG } from '../config/ai-config';

export interface DocumentAnalysis {
  summary: string; // Single sentence starting with "The"
  documentType: string; // passport, insurance, medical, etc.
  extractedData: Record<string, any>; // Flexible JSON with all extracted info
  confidence: number; // 0-100
}

export interface AnalysisError {
  error: string;
  details?: any;
}

export class DocumentAnalysisService {
  private static instance: DocumentAnalysisService | null = null;
  private openai: OpenAI | null = null;
  
  private constructor() {
    if (AI_CONFIG.openai.apiKey) {
      this.openai = new OpenAI({
        apiKey: AI_CONFIG.openai.apiKey,
        dangerouslyAllowBrowser: true // Required for browser usage
      });
    }
  }
  
  static getInstance(): DocumentAnalysisService {
    if (!DocumentAnalysisService.instance) {
      DocumentAnalysisService.instance = new DocumentAnalysisService();
    }
    return DocumentAnalysisService.instance;
  }
  
  /**
   * Check if the service is available (API key configured)
   */
  isAvailable(): boolean {
    return this.openai !== null;
  }
  
  /**
   * Analyze a document using multimodal LLM
   */
  async analyzeDocument(file: File): Promise<DocumentAnalysis | AnalysisError> {
    if (!this.isAvailable()) {
      return { error: 'OpenAI API key not configured' };
    }
    
    try {
      // Validate file
      if (!this.isFileSupported(file)) {
        return { error: `Unsupported file type: ${file.type}` };
      }
      
      if (file.size > AI_CONFIG.documentProcessing.maxFileSize) {
        return { error: `File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB (max: ${AI_CONFIG.documentProcessing.maxFileSize / 1024 / 1024}MB)` };
      }
      
      // Convert file to base64
      const base64 = await this.fileToBase64(file);
      
      // Create the analysis prompt
      const prompt = AI_CONFIG.prompts.documentAnalysis;
      
      if (AI_CONFIG.debug) {
        console.log('Document Analysis - Using prompt:', prompt);
        console.log('Document Analysis - File info:', {
          name: file.name,
          type: file.type,
          size: file.size
        });
      }
      
      // Call OpenAI Vision API
      const response = await this.openai!.chat.completions.create({
        model: AI_CONFIG.openai.visionModel,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { 
              type: 'image_url', 
              image_url: { 
                url: `data:${file.type};base64,${base64}`,
                detail: 'high' // High detail for better extraction
              }
            }
          ]
        }],
        max_tokens: AI_CONFIG.openai.maxTokens,
        temperature: AI_CONFIG.openai.temperature
      });
      
      // Parse the response
      const content = response.choices[0]?.message?.content;
      
      if (AI_CONFIG.debug) {
        console.log('Document Analysis - Raw AI response:', content);
      }
      
      if (!content) {
        return { error: 'No response from AI model' };
      }
      
      try {
        // Clean the response before parsing
        const cleanedContent = this.cleanAIResponse(content);
        const analysis = JSON.parse(cleanedContent) as DocumentAnalysis;
        
        // Validate the response structure
        if (!analysis.summary || !analysis.documentType || !analysis.extractedData) {
          return { error: 'Invalid response structure from AI model', details: analysis };
        }
        
        // Ensure confidence is within 0-100
        analysis.confidence = Math.max(0, Math.min(100, analysis.confidence || 0));
        
        if (AI_CONFIG.debug) {
          console.log('Document Analysis - Parsed analysis:', analysis);
        }
        
        return analysis;
      } catch (parseError) {
        console.error('Document Analysis - Parse error:', parseError);
        console.error('Document Analysis - Failed to parse content:', content);
        return { error: 'Failed to parse AI response', details: content };
      }
      
    } catch (error) {
      console.error('Document analysis error:', error);
      
      if (error instanceof Error) {
        // Handle specific OpenAI errors
        if (error.message.includes('rate limit')) {
          return { error: 'Rate limit exceeded. Please try again later.' };
        }
        if (error.message.includes('context length')) {
          return { error: 'Document too complex for analysis.' };
        }
        
        return { error: `Analysis failed: ${error.message}` };
      }
      
      return { error: 'Unknown error during document analysis' };
    }
  }
  
  
  /**
   * Convert file to base64
   */
  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data URL prefix to get just the base64 string
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
  
  /**
   * Clean AI response by removing markdown formatting and other artifacts
   */
  private cleanAIResponse(response: string): string {
    // Remove markdown code blocks
    let cleaned = response.trim();
    
    // Remove ```json and ``` markers
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.substring(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.substring(3);
    }
    
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.substring(0, cleaned.length - 3);
    }
    
    // Trim again after removing markers
    cleaned = cleaned.trim();
    
    if (AI_CONFIG.debug) {
      console.log('Document Analysis - Cleaned response:', cleaned);
    }
    
    return cleaned;
  }
  
  /**
   * Check if file type is supported
   */
  private isFileSupported(file: File): boolean {
    return AI_CONFIG.documentProcessing.supportedFormats.includes(file.type);
  }
  
  /**
   * Get supported file formats
   */
  getSupportedFormats(): string[] {
    return AI_CONFIG.documentProcessing.supportedFormats;
  }
  
  /**
   * Get confidence level interpretation
   */
  getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
    const levels = AI_CONFIG.documentProcessing.confidenceLevels;
    if (confidence >= levels.high) return 'high';
    if (confidence >= levels.medium) return 'medium';
    return 'low';
  }
}

// Export singleton instance
export const documentAnalysisService = DocumentAnalysisService.getInstance();