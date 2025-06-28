import { Node, Edge } from 'reactflow';
import * as d3 from 'd3-force';
import { quadtree } from 'd3-quadtree';
import { NodeData } from '../services/dataService';

// Extended node type for simulation
export interface SimulationNode extends d3.SimulationNodeDatum {
  id: string;
  data: NodeData;
  position: { x: number; y: number };
}

export interface ForceLayoutOptions {
  strength?: number;
  distance?: number;
  nodeRepulsion?: number;
  alphaDecay?: number;
  velocityDecay?: number;
  iterations?: number;
  centerX?: number;
  centerY?: number;
  levelSeparation?: number;
  collisionPadding?: number;
}

const defaultOptions: Required<ForceLayoutOptions> = {
  strength: -300, // Reduced for gentler link force
  distance: 150,
  nodeRepulsion: -800, // Reduced for less chaotic repulsion
  alphaDecay: 0.08, // Further increased for faster stabilization
  velocityDecay: 0.7, // Further increased for more dampening
  iterations: 300,
  centerX: 600,
  centerY: 400,
  levelSeparation: 250, // Increased for better radial separation
  collisionPadding: 35, // Increased to prevent overlaps
};

// Custom collision force for rectangular nodes with enhanced overlap prevention
function rectangleCollide(padding: number = 10) {
  let nodes: SimulationNode[];

  function force(alpha: number) {
    const qt = quadtree<SimulationNode>(
      nodes,
      (d) => d.x!,
      (d) => d.y!
    );

    for (const node of nodes) {
      const nodeData = node.data as NodeData;
      // Extra padding for level 1 nodes
      const extraPadding = nodeData.level === 1 ? 15 : 0;
      const width = getNodeWidth(nodeData) + padding + extraPadding;
      const height = getNodeHeight(nodeData) + padding + extraPadding;
      const nx1 = node.x! - width / 2;
      const nx2 = node.x! + width / 2;
      const ny1 = node.y! - height / 2;
      const ny2 = node.y! + height / 2;

      qt.visit((quad: any, x1, y1, x2, y2) => {
        if (!quad.length) {
          do {
            if (quad.data && quad.data !== node) {
              const otherData = quad.data.data as NodeData;
              const otherWidth = getNodeWidth(otherData) + padding;
              const otherHeight = getNodeHeight(otherData) + padding;
              const ox1 = quad.data.x! - otherWidth / 2;
              const ox2 = quad.data.x! + otherWidth / 2;
              const oy1 = quad.data.y! - otherHeight / 2;
              const oy2 = quad.data.y! + otherHeight / 2;

              // Check for collision
              if (nx1 < ox2 && nx2 > ox1 && ny1 < oy2 && ny2 > oy1) {
                // Calculate overlap
                const xOverlap = Math.min(nx2, ox2) - Math.max(nx1, ox1);
                const yOverlap = Math.min(ny2, oy2) - Math.max(ny1, oy1);

                // Stronger push to prevent overlaps
                const pushStrength = 0.8; // Increased from 0.5
                
                // Move nodes apart
                if (xOverlap < yOverlap) {
                  const xDir = node.x! < quad.data.x! ? -1 : 1;
                  const push = xOverlap * pushStrength * alpha;
                  node.vx = (node.vx || 0) + xDir * push;
                  quad.data.vx = (quad.data.vx || 0) - xDir * push;
                } else {
                  const yDir = node.y! < quad.data.y! ? -1 : 1;
                  const push = yOverlap * pushStrength * alpha;
                  node.vy = (node.vy || 0) + yDir * push;
                  quad.data.vy = (quad.data.vy || 0) - yDir * push;
                }
              }
            }
          } while ((quad = quad.next));
        }
        return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
      });
    }
  }

  force.initialize = function (_: SimulationNode[]) {
    nodes = _;
  };

  return force as d3.Force<SimulationNode, undefined>;
}

// Get node dimensions based on level and type
function getNodeWidth(nodeData: NodeData): number {
  if (nodeData.level === 1) return 128; // w-32
  switch (nodeData.type) {
    case 'person':
      return 112; // w-28
    case 'asset':
      return 96; // w-24
    case 'document':
      return 80; // w-20
    case 'pet':
      return 88; // w-22
    default:
      return 96; // w-24
  }
}

function getNodeHeight(nodeData: NodeData): number {
  // All nodes are square in the current design
  return getNodeWidth(nodeData);
}

// Parent-aware radial force to create concentric circles with sectoral arrangement
function radialForce(centerX: number, centerY: number) {
  let nodes: SimulationNode[];
  let parentAngles: Map<string, number>;

  function force(alpha: number) {
    // First, calculate current angles of level 1 nodes
    if (!parentAngles || alpha > 0.9) {
      parentAngles = new Map();
      const level1Nodes = nodes.filter(n => (n.data as NodeData).level === 1);
      
      level1Nodes.forEach(node => {
        const dx = node.x! - centerX;
        const dy = node.y! - centerY;
        const angle = Math.atan2(dy, dx);
        parentAngles.set(node.id, angle);
      });
    }

    for (const node of nodes) {
      const nodeData = node.data as NodeData;
      
      // Define target radius based on level
      let targetRadius: number;
      if (nodeData.level === 1) {
        // Level 1 nodes stay in a small circle
        targetRadius = 80; // Increased from 0 for better separation
      } else if (nodeData.level === 2) {
        // Level 2 nodes form a circle around center
        targetRadius = 280; // Slightly increased
      } else {
        // Higher levels go further out
        targetRadius = 280 + (nodeData.level - 2) * 150;
      }
      
      // Calculate current position
      const dx = node.x! - centerX;
      const dy = node.y! - centerY;
      const currentRadius = Math.sqrt(dx * dx + dy * dy) || 1;
      const currentAngle = Math.atan2(dy, dx);
      
      if (nodeData.level === 1) {
        // Level 1: attract to small circle around center
        const radiusDiff = targetRadius - currentRadius;
        const radialForce = radiusDiff * alpha * 0.3;
        
        node.vx = (node.vx || 0) + (dx / currentRadius) * radialForce;
        node.vy = (node.vy || 0) + (dy / currentRadius) * radialForce;
      } else if (nodeData.level === 2 && nodeData.parentIds && nodeData.parentIds.length > 0) {
        // Level 2: position based on parent angle
        const parentId = nodeData.parentIds[0];
        const parentAngle = parentAngles.get(parentId);
        
        if (parentAngle !== undefined) {
          // Calculate target position in parent's angular direction
          const targetX = centerX + Math.cos(parentAngle) * targetRadius;
          const targetY = centerY + Math.sin(parentAngle) * targetRadius;
          
          // Apply force toward target position
          const forceDx = targetX - node.x!;
          const forceDy = targetY - node.y!;
          
          node.vx = (node.vx || 0) + forceDx * alpha * 0.4;
          node.vy = (node.vy || 0) + forceDy * alpha * 0.4;
        }
      } else {
        // Other levels: standard radial force
        const radiusDiff = targetRadius - currentRadius;
        const radialForce = radiusDiff * alpha * 0.4;
        
        node.vx = (node.vx || 0) + (dx / currentRadius) * radialForce;
        node.vy = (node.vy || 0) + (dy / currentRadius) * radialForce;
      }
    }
  }

  force.initialize = function (_: SimulationNode[]) {
    nodes = _;
    parentAngles = new Map();
  };

  return force as d3.Force<SimulationNode, undefined>;
}

// Level-specific charge/repulsion force
function levelChargeForce(baseStrength: number) {
  const theta = 0.9;
  const distanceMax = 500;
  let nodes: SimulationNode[];

  function force(alpha: number) {
    const tree = quadtree<SimulationNode>(
      nodes,
      (d) => d.x!,
      (d) => d.y!
    );

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const nodeData = node.data as NodeData;
      
      // Determine strength based on level
      let nodeStrength: number;
      if (nodeData.level === 1) {
        // Increased repulsion for level 1 to prevent overlaps while staying clustered
        nodeStrength = baseStrength * 0.6;
      } else if (nodeData.level === 2) {
        // Moderate repulsion for level 2
        nodeStrength = baseStrength * 0.8;
      } else {
        nodeStrength = baseStrength;
      }

      tree.visit((quad: any, x1, y1, x2, y2) => {
        if (!quad.length) {
          do {
            if (quad.data && quad.data !== node) {
              const dx = node.x! - quad.data.x!;
              const dy = node.y! - quad.data.y!;
              const distance = Math.sqrt(dx * dx + dy * dy) || 1;
              
              if (distance < distanceMax) {
                const otherData = quad.data.data as NodeData;
                let otherStrength: number;
                
                if (otherData.level === 1) {
                  otherStrength = baseStrength * 0.6;
                } else if (otherData.level === 2) {
                  otherStrength = baseStrength * 0.8;
                } else {
                  otherStrength = baseStrength;
                }
                
                // Average the strengths for mutual repulsion
                const strength = (nodeStrength + otherStrength) / 2;
                const force = strength * alpha / (distance * distance);
                
                node.vx = (node.vx || 0) + dx * force;
                node.vy = (node.vy || 0) + dy * force;
              }
            }
          } while ((quad = quad.next));
        }
        
        return false; // Continue visiting
      });
    }
  }

  force.initialize = function (_: SimulationNode[]) {
    nodes = _;
  };

  return force as d3.Force<SimulationNode, undefined>;
}

export function applyForceLayout(
  nodes: Node[],
  edges: Edge[],
  options: ForceLayoutOptions = {},
  onTick?: (nodes: SimulationNode[]) => void,
  onEnd?: (nodes: SimulationNode[]) => void
): d3.Simulation<SimulationNode, undefined> {
  const opts = { ...defaultOptions, ...options };
  console.log('applyForceLayout called:', { 
    nodesCount: nodes.length, 
    edgesCount: edges.length,
    firstEdge: edges[0],
    edgeSourceType: edges[0] ? typeof edges[0].source : 'no edges',
    edgeTargetType: edges[0] ? typeof edges[0].target : 'no edges'
  });

  // Convert ReactFlow nodes to simulation nodes
  const simNodes: SimulationNode[] = nodes.map(node => ({
    ...node,
    x: node.position.x,
    y: node.position.y,
    vx: 0,
    vy: 0,
    // Fix position if manually positioned
    fx: (node.data as NodeData).isManuallyPositioned ? node.position.x : undefined,
    fy: (node.data as NodeData).isManuallyPositioned ? node.position.y : undefined
  }));

  // Initialize simulation with improved forces
  const simulation = d3.forceSimulation<SimulationNode>(simNodes)
    .force('levelCharge', levelChargeForce(opts.nodeRepulsion))
    .force('radial', radialForce(opts.centerX, opts.centerY))
    .force('collision', rectangleCollide(opts.collisionPadding))
    .alphaDecay(opts.alphaDecay)
    .velocityDecay(opts.velocityDecay)
    .alphaMin(0.001); // Stop simulation when alpha is low enough
  
  // Add link force only if there are edges
  if (edges.length > 0) {
    console.log('Adding link force with edges:', edges.length);
    simulation.force('link', d3.forceLink<SimulationNode, Edge>(edges)
      .id((d) => d.id)
      .distance(opts.distance)
      .strength(0.05) // Reduced link strength to maintain sector arrangement
    );
  } else {
    console.log('No edges to add link force');
  }
  
  console.log('Simulation forces:', {
    hasLink: edges.length > 0,
    charge: true,
    center: true,
    collision: true,
    levels: true
  });

  // Handle tick events
  let tickCount = 0;
  let lastLogTime = Date.now();
  if (onTick) {
    simulation.on('tick', () => {
      tickCount++;
      // Log every 2 seconds instead of every tick
      const now = Date.now();
      if (tickCount <= 3 || now - lastLogTime > 2000) {
        console.log(`Tick ${tickCount}, alpha: ${simulation.alpha().toFixed(4)}`);
        lastLogTime = now;
      }
      onTick(simNodes);
    });
  }

  // Handle end event
  if (onEnd) {
    simulation.on('end', () => {
      onEnd(simNodes);
    });
  }

  // Stop after max iterations or when alpha is low (using tickCount from above)
  simulation.on('tick.stop', () => {
    if (tickCount >= opts.iterations || simulation.alpha() < 0.001) {
      console.log(`Force simulation stopping: ticks=${tickCount}, alpha=${simulation.alpha().toFixed(4)}`);
      simulation.stop();
    }
  });

  return simulation;
}

// Calculate initial positions based on current layout
export function getInitialPositions(nodes: Node[], centerX: number, centerY: number): Node[] {
  // Group nodes by level
  const nodesByLevel = new Map<number, Node[]>();
  nodes.forEach(node => {
    const level = (node.data as NodeData).level;
    if (!nodesByLevel.has(level)) {
      nodesByLevel.set(level, []);
    }
    nodesByLevel.get(level)!.push(node);
  });

  return nodes.map(node => {
    const nodeData = node.data as NodeData;
    
    // If node already has a position and was manually positioned, keep it
    if (nodeData.isManuallyPositioned) {
      return node;
    }

    // Set initial positions based on level
    let x: number, y: number;
    
    if (nodeData.level === 1) {
      // Level 1 nodes start in a circle with good separation
      const level1Nodes = nodesByLevel.get(1) || [];
      const index = level1Nodes.indexOf(node);
      const angleStep = (2 * Math.PI) / level1Nodes.length;
      const angle = index * angleStep - Math.PI / 2; // Start from top
      const radius = 80; // Match target radius for better separation
      x = centerX + Math.cos(angle) * radius;
      y = centerY + Math.sin(angle) * radius;
    } else if (nodeData.level === 2) {
      // Level 2 nodes start in their parent's angular direction
      if (nodeData.parentIds && nodeData.parentIds.length > 0) {
        const parentId = nodeData.parentIds[0];
        const level1Nodes = nodesByLevel.get(1) || [];
        const parentNode = level1Nodes.find(n => n.id === parentId);
        
        if (parentNode) {
          // Calculate parent's angle based on its position in level 1
          const parentIndex = level1Nodes.indexOf(parentNode);
          const angleStep = (2 * Math.PI) / level1Nodes.length;
          const parentAngle = parentIndex * angleStep - Math.PI / 2;
          
          // Position child in parent's direction
          const radius = 280; // Match target radius
          x = centerX + Math.cos(parentAngle) * radius;
          y = centerY + Math.sin(parentAngle) * radius;
          
          // Add small offset if there are multiple children of same parent
          const siblingNodes = Array.from(nodesByLevel.get(2) || []).filter(
            n => (n.data as NodeData).parentIds?.[0] === parentId
          );
          const siblingIndex = siblingNodes.indexOf(node);
          if (siblingIndex > 0) {
            // Offset siblings slightly to prevent exact overlap
            const offsetAngle = parentAngle + (siblingIndex - siblingNodes.length / 2) * 0.1;
            x = centerX + Math.cos(offsetAngle) * radius;
            y = centerY + Math.sin(offsetAngle) * radius;
          }
        } else {
          // Fallback positioning
          x = centerX + Math.random() * 100 - 50;
          y = centerY + Math.random() * 100 - 50;
        }
      } else {
        // Fallback for nodes without parents
        x = centerX + Math.random() * 100 - 50;
        y = centerY + Math.random() * 100 - 50;
      }
    } else {
      // Higher levels start further out
      const levelNodes = nodesByLevel.get(nodeData.level) || [];
      const index = levelNodes.indexOf(node);
      const angleStep = (2 * Math.PI) / levelNodes.length;
      const angle = index * angleStep;
      const radius = 250 + (nodeData.level - 2) * 150;
      x = centerX + Math.cos(angle) * radius;
      y = centerY + Math.sin(angle) * radius;
    }
    
    return {
      ...node,
      position: { x, y }
    };
  });
}

// Update node positions from simulation
export function updateNodePositions(nodes: Node[], simulationNodes: SimulationNode[]): Node[] {
  const positionMap = new Map(
    simulationNodes.map((sNode) => [sNode.id, { x: sNode.x!, y: sNode.y! }])
  );

  return nodes.map(node => {
    const newPosition = positionMap.get(node.id);
    if (newPosition) {
      return {
        ...node,
        position: newPosition,
      };
    }
    return node;
  });
}