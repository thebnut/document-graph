import { useRef, useCallback, useEffect, useState } from 'react';
import { Node, Edge, useReactFlow } from 'reactflow';
import { Simulation } from 'd3-force';
import { 
  applyForceLayout, 
  ForceLayoutOptions, 
  getInitialPositions,
  updateNodePositions,
  SimulationNode
} from '../layouts/forceLayout';

export interface UseForceLayoutOptions extends ForceLayoutOptions {
  enabled?: boolean;
  animate?: boolean;
  onSimulationEnd?: () => void;
}

export function useForceLayout(
  nodes: Node[],
  edges: Edge[],
  options: UseForceLayoutOptions = {}
) {
  const { enabled = true, animate = true, onSimulationEnd, ...layoutOptions } = options;
  const { setNodes } = useReactFlow();
  const simulationRef = useRef<Simulation<SimulationNode, undefined> | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const animationFrameRef = useRef<number | null>(null);
  const nodesCacheRef = useRef<Node[]>([]);
  const nodesRef = useRef<Node[]>(nodes);
  const edgesRef = useRef<Edge[]>(edges);
  const isRunningRef = useRef(false);

  // Update refs when props change
  useEffect(() => {
    nodesRef.current = nodes;
    edgesRef.current = edges;
  }, [nodes, edges]);

  // Initialize and run simulation
  const runSimulation = useCallback((preserveManualPositions = true) => {
    // Prevent multiple simultaneous runs
    if (isRunningRef.current) {
      console.log('Simulation already running, skipping...');
      return;
    }
    
    const currentNodes = nodesRef.current;
    const currentEdges = edgesRef.current;
    
    // Transform edges to ensure source/target are string IDs for d3-force
    const d3Edges = currentEdges.map(edge => ({
      ...edge,
      source: typeof edge.source === 'string' ? edge.source : (edge.source as any)?.id || edge.source,
      target: typeof edge.target === 'string' ? edge.target : (edge.target as any)?.id || edge.target,
    }));
    
    console.log('runSimulation called:', { 
      enabled, 
      nodesLength: currentNodes.length, 
      edgesLength: currentEdges.length,
      d3EdgesLength: d3Edges.length,
      sampleEdge: d3Edges[0]
    });
    if (!enabled || currentNodes.length === 0) return;

    isRunningRef.current = true;

    // Stop any existing simulation
    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    setIsSimulating(true);

    // Update nodes cache
    nodesCacheRef.current = currentNodes;

    // Prepare nodes with initial positions
    const initialNodes = preserveManualPositions 
      ? currentNodes 
      : getInitialPositions(currentNodes, layoutOptions.centerX || 600, layoutOptions.centerY || 400);
    
    console.log('Using initial positions:', { 
      preserveManualPositions, 
      sampleNode: initialNodes[0]?.position 
    });

    // Apply force layout
    const simulation = applyForceLayout(
      initialNodes,
      d3Edges,
      layoutOptions,
      animate ? (simulationNodes) => {
        // Update positions on each tick if animating
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        
        animationFrameRef.current = requestAnimationFrame(() => {
          const updatedNodes = updateNodePositions(nodesCacheRef.current, simulationNodes);
          if (simulationNodes[0]) {
            console.log('Tick update:', { 
              id: simulationNodes[0].id, 
              x: simulationNodes[0].x, 
              y: simulationNodes[0].y,
              nodesUpdated: updatedNodes.length
            });
          }
          nodesCacheRef.current = updatedNodes;
          setNodes(updatedNodes);
        });
      } : undefined,
      (simulationNodes) => {
        // Simulation ended
        setIsSimulating(false);
        isRunningRef.current = false;
        
        // Final position update
        const finalNodes = updateNodePositions(nodesCacheRef.current, simulationNodes);
        setNodes(finalNodes);
        
        if (onSimulationEnd) {
          onSimulationEnd();
        }
      }
    );

    simulationRef.current = simulation;

    // If not animating, run simulation synchronously
    if (!animate) {
      simulation.tick(layoutOptions.iterations || 300);
      const finalNodes = updateNodePositions(currentNodes, simulation.nodes());
      setNodes(finalNodes);
      setIsSimulating(false);
      isRunningRef.current = false;
    }
  }, [enabled, animate, layoutOptions, setNodes, onSimulationEnd]); // Removed nodes and edges dependencies

  // Stop simulation
  const stopSimulation = useCallback(() => {
    if (simulationRef.current) {
      simulationRef.current.stop();
      simulationRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setIsSimulating(false);
    isRunningRef.current = false;
  }, []);

  // Restart simulation
  const restartSimulation = useCallback((preserveManualPositions = true) => {
    stopSimulation();
    runSimulation(preserveManualPositions);
  }, [stopSimulation, runSimulation]);

  // Handle node drag
  const handleNodeDrag = useCallback((event: React.MouseEvent, node: Node) => {
    if (!simulationRef.current) return;
    
    const simulation = simulationRef.current;
    const simNode = simulation.nodes().find((n: SimulationNode) => n.id === node.id);
    
    if (simNode) {
      simulation.alphaTarget(0.3).restart();
      simNode.fx = node.position.x;
      simNode.fy = node.position.y;
    }
  }, []);

  // Handle node drag stop
  const handleNodeDragStop = useCallback((event: React.MouseEvent, node: Node) => {
    if (!simulationRef.current) return;
    
    const simulation = simulationRef.current;
    const simNode = simulation.nodes().find((n: SimulationNode) => n.id === node.id);
    
    if (simNode) {
      simulation.alphaTarget(0);
      
      // Mark as manually positioned
      const updatedNodes = nodesRef.current.map(n => 
        n.id === node.id 
          ? { ...n, data: { ...n.data, isManuallyPositioned: true } }
          : n
      );
      setNodes(updatedNodes);
      
      // Keep the fixed position
      simNode.fx = node.position.x;
      simNode.fy = node.position.y;
    }
  }, [setNodes]);

  // Update nodes cache when nodes change
  useEffect(() => {
    nodesCacheRef.current = nodes;
  }, [nodes]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSimulation();
    };
  }, [stopSimulation]);

  return {
    runSimulation,
    stopSimulation,
    restartSimulation,
    handleNodeDrag,
    handleNodeDragStop,
    isSimulating,
  };
}