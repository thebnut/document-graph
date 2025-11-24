/**
 * Document Placement Service
 * Uses OpenAI to determine where a document should be placed in the document tree
 *
 * REFACTORED: Now uses serverless API endpoints instead of direct OpenAI calls
 * for improved security (API key is server-side only)
 */

import { AI_CONFIG } from '../config/ai-config';
import { DocumentAnalysis } from './documentAnalysisService';
import { StandaloneEntity } from '../data/standalone-model';
import { DocumentGraphModel } from '../data/standalone-model-implementation';
import * as apiClient from './apiClient';
import { APIClientError } from './apiClient';

export interface PlacementDecision {
  parentNodeId: string | null;
  suggestedPath: string[]; // e.g., ["Brett Thebault", "Identity", "Passports"]
  confidence: number; // 0-100
  reasoning: string;
  createNewParent?: {
    label: string;
    type: string;
    level: number;
  };
}

export interface PlacementError {
  error: string;
  details?: any;
}

export class DocumentPlacementService {
  private static instance: DocumentPlacementService | null = null;

  private constructor() {
    // No OpenAI client initialization - uses serverless API
  }

  static getInstance(): DocumentPlacementService {
    if (!DocumentPlacementService.instance) {
      DocumentPlacementService.instance = new DocumentPlacementService();
    }
    return DocumentPlacementService.instance;
  }

  /**
   * Check if the service is available
   * Always returns true since API endpoints handle authentication
   */
  isAvailable(): boolean {
    return true;
  }
  
  /**
   * Determine where to place a document in the tree
   * NOW USES: Serverless API endpoint (/api/determine-placement)
   */
  async determineDocumentPlacement(
    analysis: DocumentAnalysis,
    model: DocumentGraphModel
  ): Promise<PlacementDecision | PlacementError> {
    try {
      // Get a simplified view of the tree structure
      const treeStructure = this.buildTreeStructure(model);

      if (AI_CONFIG.debug) {
        console.log('Document Placement - Analysis:', analysis);
        console.log('Document Placement - Tree structure:', treeStructure);
      }

      // Call serverless API endpoint
      const decision = await apiClient.determinePlacement(analysis, treeStructure);

      // Ensure confidence is within 0-100
      decision.confidence = Math.max(0, Math.min(100, decision.confidence || 0));

      // Validate the parent node exists (if specified)
      if (decision.parentNodeId && !model.getEntity(decision.parentNodeId)) {
        // Try to find a suitable parent based on the path
        const suggestedParent = this.findNodeByPath(
          model,
          decision.suggestedPath.slice(0, -1)
        );
        if (suggestedParent) {
          decision.parentNodeId = suggestedParent.id;
        } else {
          decision.parentNodeId = null;
          decision.confidence = Math.min(decision.confidence, 50); // Lower confidence
        }
      }

      if (AI_CONFIG.debug) {
        console.log('Document Placement - Final decision:', decision);
      }

      return decision;
    } catch (error) {
      console.error('Document placement error:', error);

      // Handle API client errors
      if (error instanceof APIClientError) {
        return { error: error.message, details: error.details };
      }

      if (error instanceof Error) {
        return { error: `Placement failed: ${error.message}` };
      }

      return { error: 'Unknown error during document placement' };
    }
  }
  
  /**
   * Build a simplified tree structure for the prompt
   */
  private buildTreeStructure(model: DocumentGraphModel): string {
    const entities = model.search({}).entities;
    const tree: any = {};
    
    // Build hierarchy
    entities.forEach(entity => {
      if (!entity.parentIds || entity.parentIds.length === 0) {
        // Root level
        tree[entity.label] = this.buildSubtree(entity, entities);
      }
    });
    
    return JSON.stringify(tree, null, 2);
  }
  
  /**
   * Recursively build subtree
   */
  private buildSubtree(parent: StandaloneEntity, allEntities: StandaloneEntity[]): any {
    const children: any = {};
    
    allEntities.forEach(entity => {
      if (entity.parentIds?.includes(parent.id)) {
        children[entity.label] = {
          id: entity.id,
          type: entity.type,
          ...this.buildSubtree(entity, allEntities)
        };
      }
    });
    
    return {
      id: parent.id,
      type: parent.type,
      ...(Object.keys(children).length > 0 ? { children } : {})
    };
  }
  
  
  /**
   * Find a node by path
   */
  private findNodeByPath(model: DocumentGraphModel, path: string[]): StandaloneEntity | null {
    if (path.length === 0) return null;
    
    const entities = model.search({}).entities;
    let current: StandaloneEntity | null = null;
    
    for (const segment of path) {
      const found = entities.find(e => {
        const matchesLabel = e.label === segment;
        const isChild = !current || e.parentIds?.includes(current.id);
        const isRoot = !current && (!e.parentIds || e.parentIds.length === 0);
        return matchesLabel && (isChild || isRoot);
      });
      
      if (!found) return null;
      current = found;
    }
    
    return current;
  }
  
  /**
   * Create intermediate folders if needed
   */
  async createIntermediateFolders(
    model: DocumentGraphModel,
    path: string[]
  ): Promise<string | null> {
    let parentId: string | null = null;
    
    for (let i = 0; i < path.length - 1; i++) {
      const segment = path[i];
      const partialPath = path.slice(0, i + 1);
      
      // Try to find existing node
      let node = this.findNodeByPath(model, partialPath);
      
      if (!node) {
        // Create folder
        const newFolder = {
          label: segment,
          type: i === 0 ? 'person' as const : 'folder' as const,
          parentIds: parentId ? [parentId] : undefined,
          level: i + 1,
          createdBy: 'ai-placement-service',
          modifiedBy: 'ai-placement-service'
        };
        
        node = model.addEntity(newFolder);
      }
      
      parentId = node.id;
    }
    
    return parentId;
  }
  
}

// Export singleton instance
export const documentPlacementService = DocumentPlacementService.getInstance();