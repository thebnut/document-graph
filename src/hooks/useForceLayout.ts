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

  // Initialize and run simulation
  const runSimulation = useCallback((preserveManualPositions = true) => {
    console.log('runSimulation called:', { enabled, nodesLength: nodes.length, edgesLength: edges.length });
    if (!enabled || nodes.length === 0) return;

    // Stop any existing simulation
    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    setIsSimulating(true);

    // Update nodes cache
    nodesCacheRef.current = nodes;

    // Prepare nodes with initial positions
    const initialNodes = preserveManualPositions 
      ? nodes 
      : getInitialPositions(nodes, layoutOptions.centerX || 600, layoutOptions.centerY || 400);

    // Apply force layout
    const simulation = applyForceLayout(
      initialNodes,
      edges,
      layoutOptions,
      animate ? (simulationNodes) => {
        // Update positions on each tick if animating
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        
        animationFrameRef.current = requestAnimationFrame(() => {
          const updatedNodes = updateNodePositions(nodesCacheRef.current, simulationNodes);
          console.log('Tick update:', { 
            firstNode: simulationNodes[0] ? { id: simulationNodes[0].id, x: simulationNodes[0].x, y: simulationNodes[0].y } : null 
          });
          nodesCacheRef.current = updatedNodes;
          setNodes(updatedNodes);
        });
      } : undefined,
      (simulationNodes) => {
        // Simulation ended
        setIsSimulating(false);
        
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
      const finalNodes = updateNodePositions(nodes, simulation.nodes());
      setNodes(finalNodes);
      setIsSimulating(false);
    }
  }, [enabled, nodes, edges, animate, layoutOptions, setNodes, onSimulationEnd]);

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
      const updatedNodes = nodes.map(n => 
        n.id === node.id 
          ? { ...n, data: { ...n.data, isManuallyPositioned: true } }
          : n
      );
      setNodes(updatedNodes);
      
      // Keep the fixed position
      simNode.fx = node.position.x;
      simNode.fy = node.position.y;
    }
  }, [nodes, setNodes]);

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