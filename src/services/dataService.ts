import { Node, Edge } from 'reactflow';
import { DocumentGraphModel, Entity, EntityRelationship, EntityWithComputed } from '../data/model';
import sampleData from '../data/sampleData.json';
import expandedSampleData from '../data/expandedSampleData.json';

export interface NodeData extends EntityWithComputed {
  onShowTooltip?: (nodeId: string, data: NodeData, event: React.MouseEvent) => void;
  onHideTooltip?: () => void;
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
    
    return entitiesToConvert.map(entity => ({
      id: entity.id,
      type: 'entity',
      position: { x: 0, y: 0 }, // Will be calculated by layout algorithm
      data: {
        ...entity,
        isExpanded: false,
        isManuallyPositioned: false
      } as NodeData
    }));
  }

  /**
   * Convert relationships to ReactFlow edges
   */
  relationshipsToEdges(relationships?: EntityRelationship[]): Edge[] {
    const relationshipsToConvert = relationships || this.model.relationships;
    
    return relationshipsToConvert.map(rel => ({
      id: rel.id,
      source: rel.source,
      target: rel.target,
      type: rel.type || 'straight',
      animated: false,
      label: rel.label
    }));
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
   * Get metadata display string for an entity
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

  /**
   * Check if entity is a folder
   */
  isFolder(entity: Entity): boolean {
    return entity.type === 'folder';
  }

  /**
   * Get all folders for a person
   */
  getPersonFolders(personId: string): Entity[] {
    return this.model.entities.filter(e => 
      e.type === 'folder' && 
      e.parentIds?.includes(personId)
    );
  }

  /**
   * Get all documents in a folder
   */
  getFolderDocuments(folderId: string): Entity[] {
    return this.model.entities.filter(e => 
      e.type === 'document' && 
      e.parentIds?.includes(folderId)
    );
  }
}

// Export a singleton instance for convenience
export const dataService = new DataService();