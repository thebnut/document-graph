import { Node, Edge } from 'reactflow';
import { DocumentGraphModel, Entity, EntityRelationship, EntityWithComputed } from '../data/model';
import sampleData from '../data/sampleData.json';

export interface NodeData extends EntityWithComputed {
  onShowTooltip?: (nodeId: string, data: NodeData, event: React.MouseEvent) => void;
  onHideTooltip?: () => void;
}

export class DataService {
  private model: DocumentGraphModel;

  constructor(model?: DocumentGraphModel) {
    this.model = model || (sampleData as DocumentGraphModel);
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
}

// Export a singleton instance for convenience
export const dataService = new DataService();