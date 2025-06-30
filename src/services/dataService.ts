import { Node, Edge } from 'reactflow';
import { DocumentGraphModel, Entity, EntityRelationship, EntityWithComputed } from '../data/model';
import sampleData from '../data/sampleData.json';
import expandedSampleData from '../data/expandedSampleData.json';

export interface NodeData extends EntityWithComputed {
  onShowTooltip?: (nodeId: string, data: NodeData, event: React.MouseEvent) => void;
  onHideTooltip?: () => void;
  originalId?: string; // For duplicated nodes, reference to original entity
  isShared?: boolean; // Indicates this is a shared asset
  sharedWith?: string[]; // Other parents this asset is shared with
}

export class DataService {
  private model: DocumentGraphModel;
  private useExpandedData: boolean;

  constructor(model?: DocumentGraphModel, useExpandedData: boolean = true) {
    if (model) {
      this.model = model;
    } else {
      this.model = useExpandedData ? (expandedSampleData as DocumentGraphModel) : (sampleData as DocumentGraphModel);
    }
    this.useExpandedData = useExpandedData;
  }

  /**
   * Get the current data model
   */
  getModel(): DocumentGraphModel {
    return this.model;
  }

  /**
   * Set a new data model
   */
  setModel(model: DocumentGraphModel): void {
    this.model = model;
  }

  /**
   * Convert entities to ReactFlow nodes
   */
  entitiesToNodes(entities?: Entity[]): Node<NodeData>[] {
    const entitiesToConvert = entities || this.model.entities;
    const processedNodes: Node<NodeData>[] = [];
    
    entitiesToConvert.forEach(entity => {
      // Check if entity has multiple parents (shared asset)
      if (entity.parentIds && entity.parentIds.length > 1) {
        // Create a duplicate node for each parent to maintain tree structure
        entity.parentIds.forEach((parentId, index) => {
          processedNodes.push({
            id: `${entity.id}-${parentId}`, // Unique ID for each duplicate
            type: 'entity',
            position: { x: 0, y: 0 },
            data: {
              ...entity,
              id: `${entity.id}-${parentId}`, // Update the data ID too
              parentIds: [parentId], // Single parent for tree structure
              originalId: entity.id, // Keep reference to original
              isShared: true, // Mark as shared asset
              sharedWith: entity.parentIds?.filter(p => p !== parentId) || [], // Other parents
              isExpanded: false,
              isManuallyPositioned: false
            } as NodeData
          });
        });
      } else {
        // Regular node with single or no parent
        processedNodes.push({
          id: entity.id,
          type: 'entity',
          position: { x: 0, y: 0 },
          data: {
            ...entity,
            isExpanded: false,
            isManuallyPositioned: false
          } as NodeData
        });
      }
    });
    
    return processedNodes;
  }

  /**
   * Convert relationships to ReactFlow edges
   */
  relationshipsToEdges(relationships?: EntityRelationship[]): Edge[] {
    const relationshipsToConvert = relationships || this.model.relationships;
    const processedEdges: Edge[] = [];
    
    relationshipsToConvert.forEach(rel => {
      // Check if the target has multiple parents (was duplicated)
      const targetEntity = this.model.entities.find(e => e.id === rel.target);
      
      if (targetEntity && targetEntity.parentIds && targetEntity.parentIds.length > 1) {
        // Create edge to the appropriate duplicate based on source
        const duplicateTargetId = `${rel.target}-${rel.source}`;
        processedEdges.push({
          id: `${rel.id}-duplicate`,
          source: rel.source,
          target: duplicateTargetId,
          type: rel.type || 'straight',
          animated: false,
          label: rel.label
        });
      } else {
        // Regular edge
        processedEdges.push({
          id: rel.id,
          source: rel.source,
          target: rel.target,
          type: rel.type || 'straight',
          animated: false,
          label: rel.label
        });
      }
    });
    
    return processedEdges;
  }

  /**
   * Get all entities
   */
  getAllEntities(): Entity[] {
    return this.model.entities;
  }

  /**
   * Get entities by level
   */
  getEntitiesByLevel(level: number): Entity[] {
    return this.model.entities.filter(entity => entity.level === level);
  }

  /**
   * Get children of an entity
   */
  getChildren(entityId: string): Entity[] {
    return this.model.entities.filter(entity => 
      entity.parentIds?.includes(entityId)
    );
  }

  /**
   * Get entity by ID
   */
  getEntityById(id: string): Entity | undefined {
    return this.model.entities.find(entity => entity.id === id);
  }

  /**
   * Get all relationships
   */
  getAllRelationships(): EntityRelationship[] {
    return this.model.relationships;
  }

  /**
   * Get relationships for an entity
   */
  getEntityRelationships(entityId: string): EntityRelationship[] {
    return this.model.relationships.filter(rel => 
      rel.source === entityId || rel.target === entityId
    );
  }

  /**
   * Check if entity has children
   */
  hasChildren(entityId: string): boolean {
    return this.getChildren(entityId).length > 0;
  }

  /**
   * Get all descendant IDs recursively
   */
  getAllDescendantIds(entityId: string): string[] {
    const descendants: string[] = [];
    const children = this.getChildren(entityId);
    
    children.forEach(child => {
      descendants.push(child.id);
      descendants.push(...this.getAllDescendantIds(child.id));
    });
    
    return descendants;
  }

  /**
   * Search entities by label or description
   */
  searchEntities(query: string): Entity[] {
    const lowerQuery = query.toLowerCase();
    return this.model.entities.filter(entity =>
      entity.label.toLowerCase().includes(lowerQuery) ||
      entity.description?.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get visible entities based on expanded nodes
   */
  getVisibleEntities(expandedNodeIds: Set<string>): Entity[] {
    return this.model.entities.filter(entity => {
      // Always show level 1 and 2
      if (entity.level === 1 || entity.level === 2) return true;

      // For other nodes, check if ALL parent nodes in the chain are expanded
      if (entity.parentIds) {
        // Check immediate parent first
        const immediateParentExpanded = entity.parentIds.some(parentId => 
          expandedNodeIds.has(parentId)
        );
        if (!immediateParentExpanded) return false;

        // For level 4 nodes, also check if grandparent is expanded
        if (entity.level === 4) {
          const parent = this.getEntityById(entity.parentIds[0]);
          if (parent && parent.parentIds) {
            const grandParentExpanded = parent.parentIds.some(gpId => 
              expandedNodeIds.has(gpId)
            );
            if (!grandParentExpanded) return false;
          }
        }

        return true;
      }

      return false;
    });
  }

  /**
   * Get formatted metadata display strings for an entity
   */
  getMetadataDisplay(entity: Entity): string[] {
    const displays: string[] = [];
    
    if (!entity.metadata) return displays;
    
    // Handle different metadata types
    if (entity.category === 'passport' && 'passportNumber' in entity.metadata) {
      displays.push(`Passport: ${entity.metadata.passportNumber}`);
      if (entity.metadata.expiryDate) {
        displays.push(`Expires: ${entity.metadata.expiryDate}`);
      }
    } else if (entity.category === 'drivers-licence' && 'licenceNumber' in entity.metadata) {
      displays.push(`Licence: ${entity.metadata.licenceNumber}`);
      if (entity.metadata.expiryDate) {
        displays.push(`Expires: ${entity.metadata.expiryDate}`);
      }
    } else if (entity.category === 'bank-accounts' && 'bank' in entity.metadata) {
      displays.push(`Bank: ${entity.metadata.bank}`);
      if (entity.metadata.accountType) {
        displays.push(`Type: ${entity.metadata.accountType}`);
      }
    } else if ((entity.category === 'car-insurance' || entity.category === 'insurance') && 'policyNumber' in entity.metadata) {
      displays.push(`Policy: ${entity.metadata.policyNumber}`);
      if (entity.metadata.provider) {
        displays.push(`Provider: ${entity.metadata.provider}`);
      }
    } else if (entity.subtype === 'vehicle' && 'make' in entity.metadata) {
      displays.push(`${entity.metadata.year || ''} ${entity.metadata.make} ${entity.metadata.model}`.trim());
    }
    
    return displays;
  }
}

// Export a singleton instance for convenience
export const dataService = new DataService();