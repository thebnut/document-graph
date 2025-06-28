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
  strength: -500,
  distance: 150,
  nodeRepulsion: -1000,
  alphaDecay: 0.02,
  velocityDecay: 0.4,
  iterations: 300,
  centerX: 600,
  centerY: 400,
  levelSeparation: 150,
  collisionPadding: 20,
};

// Custom collision force for rectangular nodes
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
      const width = getNodeWidth(nodeData) + padding;
      const height = getNodeHeight(nodeData) + padding;
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

                // Move nodes apart
                if (xOverlap < yOverlap) {
                  const xDir = node.x! < quad.data.x! ? -1 : 1;
                  const push = xOverlap * 0.5 * alpha;
                  node.vx = (node.vx || 0) + xDir * push;
                  quad.data.vx = (quad.data.vx || 0) - xDir * push;
                } else {
                  const yDir = node.y! < quad.data.y! ? -1 : 1;
                  const push = yOverlap * 0.5 * alpha;
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

// Level-based vertical force to maintain hierarchy
function levelForce(levelSeparation: number, centerY: number) {
  let nodes: SimulationNode[];

  function force(alpha: number) {
    for (const node of nodes) {
      const nodeData = node.data as NodeData;
      const targetY = centerY + (nodeData.level - 2.5) * levelSeparation;
      const dy = targetY - node.y!;
      node.vy = (node.vy || 0) + dy * alpha * 0.3; // Gentle force to preferred Y position
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
  console.log('applyForceLayout called:', { nodesCount: nodes.length, edgesCount: edges.length });

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

  // Initialize simulation
  const simulation = d3.forceSimulation<SimulationNode>(simNodes)
    .force('charge', d3.forceManyBody<SimulationNode>()
      .strength(opts.nodeRepulsion)
      .distanceMax(500)
    )
    .force('center', d3.forceCenter<SimulationNode>(opts.centerX, opts.centerY))
    .force('collision', rectangleCollide(opts.collisionPadding))
    .force('levels', levelForce(opts.levelSeparation, opts.centerY))
    .alphaDecay(opts.alphaDecay)
    .velocityDecay(opts.velocityDecay);
  
  // Add link force only if there are edges
  if (edges.length > 0) {
    simulation.force('link', d3.forceLink<SimulationNode, Edge>(edges)
      .id((d) => d.id)
      .distance(opts.distance)
      .strength(0.1)
    );
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
  if (onTick) {
    simulation.on('tick', () => {
      tickCount++;
      if (tickCount <= 5 || tickCount % 50 === 0) {
        console.log(`Tick ${tickCount}, alpha: ${simulation.alpha()}`);
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

  // Stop after max iterations (using tickCount from above)
  simulation.on('tick.stop', () => {
    if (tickCount >= opts.iterations) {
      simulation.stop();
    }
  });

  return simulation;
}

// Calculate initial positions based on current layout
export function getInitialPositions(nodes: Node[], centerX: number, centerY: number): Node[] {
  return nodes.map(node => {
    const nodeData = node.data as NodeData;
    
    // If node already has a position and was manually positioned, keep it
    if (nodeData.isManuallyPositioned) {
      return node;
    }

    // Otherwise, set initial position based on level with some randomness
    const levelRadius = nodeData.level * 150;
    const angle = Math.random() * 2 * Math.PI;
    
    return {
      ...node,
      position: {
        x: centerX + Math.cos(angle) * levelRadius * 0.5,
        y: centerY + (nodeData.level - 2.5) * 150 + (Math.random() - 0.5) * 50,
      }
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