import React, { useCallback, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Connection,
  ReactFlowProvider,
  Panel,
  Handle,
  Position,
  Node,
  NodeTypes,
  BackgroundVariant,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { 
  Upload, 
  Search, 
  Moon, 
  Sun, 
  User, 
  Home, 
  Car, 
  FileText, 
  X, 
  ChevronRight, 
  ChevronDown,
  Sparkles,
  Trees,
  CreditCard,
  Heart,
  Shield,
  Plane,
  Briefcase,
  FolderOpen,
  Calendar,
  Mail,
  Phone,
  MapPin,
  DollarSign,
  RotateCcw,
  Folder,
  Baby,
  HeartPulse,
  Banknote,
  IdCard,
  Hospital
} from 'lucide-react';
import { dataService, NodeData } from './services/dataService';
import { useDocumentViewer, DocumentViewerProvider } from './contexts/DocumentViewerContext';
import { DocumentViewer } from './components/DocumentViewer';

// Comprehensive ResizeObserver error suppression
const suppressResizeObserverError = (e: any) => {
  const message = e.message || e.reason?.message || '';
  return message.includes('ResizeObserver loop completed with undelivered notifications');
};

// Global error handlers
window.addEventListener('error', (e) => {
  if (suppressResizeObserverError(e)) {
    e.preventDefault();
    e.stopImmediatePropagation();
    return false;
  }
});

window.addEventListener('unhandledrejection', (e) => {
  if (suppressResizeObserverError(e)) {
    e.preventDefault();
    return false;
  }
});

// Override ResizeObserver with debounced callback
const OriginalResizeObserver = window.ResizeObserver;
window.ResizeObserver = class extends OriginalResizeObserver {
  constructor(callback: ResizeObserverCallback) {
    let debounceTimer: number;
    const debouncedCallback: ResizeObserverCallback = (entries, observer) => {
      clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => {
        try {
          requestAnimationFrame(() => {
            try {
              callback(entries, observer);
            } catch (e) {
              if (!suppressResizeObserverError(e)) {
                throw e;
              }
            }
          });
        } catch (e) {
          if (!suppressResizeObserverError(e)) {
            throw e;
          }
        }
      }, 0);
    };
    super(debouncedCallback);
  }
};

// Console error suppression
const originalError = console.error;
console.error = (...args) => {
  if (suppressResizeObserverError({ message: args[0]?.toString?.() })) {
    return;
  }
  originalError.apply(console, args);
};

// React Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    if (suppressResizeObserverError(error)) {
      return { hasError: false };
    }
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (!suppressResizeObserverError(error)) {
      console.error('React Error Boundary caught an error:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen bg-red-50 dark:bg-red-900">
          <div className="text-center p-8">
            <h2 className="text-2xl font-bold text-red-800 dark:text-red-200 mb-4">
              Something went wrong
            </h2>
            <p className="text-red-600 dark:text-red-300 mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: undefined })}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// NodeData interface is now imported from dataService

// Tooltip state interface
interface TooltipState {
  show: boolean;
  nodeId: string | null;
  data: NodeData | null;
  position: { x: number; y: number };
}

// Custom bubble node component with expansion
const EntityNode = ({ 
  data, 
  id,
  onShowTooltip,
  onHideTooltip 
}: { 
  data: NodeData; 
  id: string;
  onShowTooltip: (nodeId: string, data: NodeData, event: React.MouseEvent) => void;
  onHideTooltip: () => void;
}) => {
  
  // Different sizes for different node types
  const getNodeSize = () => {
    if (data.level === 1) return 'w-32 h-32'; // Largest for central nodes
    switch (data.type) {
      case 'person':
        return 'w-28 h-28';
      case 'asset':
        return 'w-24 h-24';
      case 'document':
        return 'w-20 h-20';
      case 'folder':
        return 'w-22 h-22';
      case 'pet':
        return 'w-22 h-22';
      default:
        return 'w-24 h-24';
    }
  };
  
  const getNodeColor = () => {
    switch (data.type) {
      case 'person':
      case 'pet':
        return 'bg-gradient-to-br from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700';
      case 'asset':
        return 'bg-gradient-to-br from-green-400 to-green-600 hover:from-green-500 hover:to-green-700';
      case 'document':
        return 'bg-gradient-to-br from-purple-400 to-purple-600 hover:from-purple-500 hover:to-purple-700';
      case 'folder':
        // Different colors for different folder types
        switch (data.subtype) {
          case 'identity':
            return 'bg-gradient-to-br from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700';
          case 'health':
            return 'bg-gradient-to-br from-red-400 to-red-600 hover:from-red-500 hover:to-red-700';
          case 'financial':
            return 'bg-gradient-to-br from-emerald-400 to-emerald-600 hover:from-emerald-500 hover:to-emerald-700';
          default:
            return 'bg-gradient-to-br from-indigo-400 to-indigo-600 hover:from-indigo-500 hover:to-indigo-700';
        }
      default:
        return 'bg-gradient-to-br from-gray-400 to-gray-600';
    }
  };
  
  const getIcon = () => {
    const iconClass = data.type === 'person' || data.level === 1 ? 'w-8 h-8' : 'w-6 h-6';
    
    // Handle folders first
    if (data.type === 'folder') {
      switch (data.subtype) {
        case 'identity':
          return <IdCard className={iconClass} />;
        case 'health':
          return <HeartPulse className={iconClass} />;
        case 'financial':
          return <Banknote className={iconClass} />;
        default:
          return <Folder className={iconClass} />;
      }
    }
    
    // Handle specific document categories
    if (data.category) {
      switch (data.category) {
        case 'passport':
          return <Plane className={iconClass} />;
        case 'drivers-licence':
          return <Car className={iconClass} />;
        case 'birth-certificate':
          return <Baby className={iconClass} />;
        case 'visa':
          return <Plane className={iconClass} />;
        case 'medicare':
        case 'private-health-insurance':
          return <Heart className={iconClass} />;
        case 'car-insurance':
        case 'insurance':
          return <Shield className={iconClass} />;
        case 'bank-accounts':
        case 'credit-cards':
        case 'superannuation':
          return <DollarSign className={iconClass} />;
        case 'gp':
        case 'hospital-visits':
        case 'imaging-reports':
          return <Hospital className={iconClass} />;
        default:
          return <FileText className={iconClass} />;
      }
    }
    
    // More specific icons based on label content
    const labelLower = data.label.toLowerCase();
    
    // Check for specific document types
    if (labelLower.includes('cleaner')) return <Sparkles className={iconClass} />;
    if (labelLower.includes('gardener')) return <Trees className={iconClass} />;
    if (labelLower.includes('medicare')) return <CreditCard className={iconClass} />;
    if (labelLower.includes('document')) return <FolderOpen className={iconClass} />;
    if (labelLower.includes('email')) return <Mail className={iconClass} />;
    if (labelLower.includes('phone')) return <Phone className={iconClass} />;
    if (labelLower.includes('address')) return <MapPin className={iconClass} />;
    if (labelLower.includes('work') || labelLower.includes('employment')) return <Briefcase className={iconClass} />;
    if (labelLower.includes('calendar') || labelLower.includes('schedule')) return <Calendar className={iconClass} />;
    
    // Default icons by type
    switch (data.type) {
      case 'person':
      case 'pet':
        return <User className={iconClass} />;
      case 'asset':
        return data.subtype === 'vehicle' ? <Car className={iconClass} /> : <Home className={iconClass} />;
      default:
        return <FileText className={iconClass} />;
    }
  };
  
  return (
    <div className="relative">
      <div
        className={`${getNodeSize()} ${getNodeColor()} text-white rounded-full shadow-lg cursor-pointer transition-all duration-300 hover:shadow-2xl hover:scale-110 flex flex-col items-center justify-center p-3 border-2 border-white/20 relative`}
        onMouseEnter={(e) => {
          if (data.description) {
            onShowTooltip(id, data, e);
          }
        }}
        onMouseLeave={() => {
          onHideTooltip();
        }}
      >
        <div className="flex flex-col items-center gap-1">
          {getIcon()}
          <span className="text-xs font-semibold text-center leading-tight max-w-[80px] line-clamp-2 drop-shadow-sm">
            {data.label}
          </span>
        </div>
        
        {/* Expansion indicator */}
        {data.hasChildren && (
          <div className="absolute bottom-1 right-1 bg-white/30 rounded-full p-1">
            {data.isExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </div>
        )}
        
        {/* Small centered handle for connections - allows dynamic connection points */}
        <Handle 
          type="source" 
          position={Position.Top}
          className="opacity-0" 
          style={{ 
            top: '50%', 
            left: '50%', 
            transform: 'translate(-50%, -50%)',
            width: '8px',
            height: '8px',
            borderRadius: '50%'
          }}
        />
        <Handle 
          type="target" 
          position={Position.Bottom}
          className="opacity-0" 
          style={{ 
            top: '50%', 
            left: '50%', 
            transform: 'translate(-50%, -50%)',
            width: '8px',
            height: '8px',
            borderRadius: '50%'
          }}
        />
      </div>
    </div>
  );
};

const nodeTypes: NodeTypes = {
  entity: (props: any) => (
    <EntityNode 
      {...props} 
      onShowTooltip={props.data.onShowTooltip}
      onHideTooltip={props.data.onHideTooltip}
    />
  ),
};

// Inner component that uses ReactFlow hooks
function DocumentGraphInner() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reactFlowInstance = useReactFlow();
  const { openDocument } = useDocumentViewer();
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isTooltipHovered, setIsTooltipHovered] = useState(false);
  
  // Store all nodes data
  const [allNodesData, setAllNodesData] = useState<Node[]>([]);
  
  // Global tooltip state
  const [tooltipState, setTooltipState] = useState<TooltipState>({
    show: false,
    nodeId: null,
    data: null,
    position: { x: 0, y: 0 }
  });
  
  // Form state
  const [newNodeData, setNewNodeData] = useState<Partial<NodeData>>({
    type: 'person',
    label: '',
    description: '',
  });
  
  // Auto-layout function with better spacing
  const autoLayout = (nodes: Node[], preserveManualPositions = false) => {
    const centerX = 400;
    const centerY = 300;
    const level2Radius = 250;
    const level3Radius = 200;
    const level4Spacing = 150;
    
    const layoutNodes = [...nodes];
    
    // Position level 1 (central) nodes
    const level1Nodes = layoutNodes.filter(n => (n.data as NodeData).level === 1);
    level1Nodes.forEach((node, index) => {
      if (!preserveManualPositions || !(node.data as NodeData).isManuallyPositioned) {
        node.position = {
          x: centerX + (index === 0 ? -100 : 100),
          y: centerY
        };
      }
    });
    
    // Position level 2 nodes in a circle around center
    const level2Nodes = layoutNodes.filter(n => (n.data as NodeData).level === 2);
    const angleStep2 = (2 * Math.PI) / Math.max(level2Nodes.length, 1);
    level2Nodes.forEach((node, index) => {
      if (!preserveManualPositions || !(node.data as NodeData).isManuallyPositioned) {
        const angle = index * angleStep2 - Math.PI / 2;
        node.position = {
          x: centerX + Math.cos(angle) * level2Radius,
          y: centerY + Math.sin(angle) * level2Radius
        };
      }
    });
    
    // Position level 3 nodes with proper spacing
    const level3NodesByParent = new Map<string, Node[]>();
    const level3Nodes = layoutNodes.filter(n => (n.data as NodeData).level === 3);
    
    level3Nodes.forEach(node => {
      const parentId = (node.data as NodeData).parentIds?.[0];
      if (parentId) {
        if (!level3NodesByParent.has(parentId)) {
          level3NodesByParent.set(parentId, []);
        }
        level3NodesByParent.get(parentId)!.push(node);
      }
    });
    
    level3NodesByParent.forEach((children, parentId) => {
      const parent = layoutNodes.find(n => n.id === parentId);
      if (parent) {
        const parentAngle = Math.atan2(parent.position.y - centerY, parent.position.x - centerX);
        const spreadAngle = Math.min(Math.PI / 3, (Math.PI / 6) * children.length);
        const angleStep = children.length > 1 ? spreadAngle / (children.length - 1) : 0;
        
        children.forEach((node, index) => {
          if (!preserveManualPositions || !(node.data as NodeData).isManuallyPositioned) {
            const childAngle = parentAngle + (index - (children.length - 1) / 2) * angleStep;
            node.position = {
              x: parent.position.x + Math.cos(childAngle) * level3Radius,
              y: parent.position.y + Math.sin(childAngle) * level3Radius
            };
          }
        });
      }
    });
    
    // Position level 4 nodes with proper spacing
    const level4NodesByParent = new Map<string, Node[]>();
    const level4Nodes = layoutNodes.filter(n => (n.data as NodeData).level === 4);
    
    level4Nodes.forEach(node => {
      const parentId = (node.data as NodeData).parentIds?.[0];
      if (parentId) {
        if (!level4NodesByParent.has(parentId)) {
          level4NodesByParent.set(parentId, []);
        }
        level4NodesByParent.get(parentId)!.push(node);
      }
    });
    
    level4NodesByParent.forEach((children, parentId) => {
      const parent = layoutNodes.find(n => n.id === parentId);
      if (parent) {
        const grandParent = layoutNodes.find(n => 
          n.id === (parent.data as NodeData).parentIds?.[0]
        );
        
        let baseAngle = Math.PI / 2; // Default downward
        if (grandParent) {
          baseAngle = Math.atan2(parent.position.y - grandParent.position.y, parent.position.x - grandParent.position.x);
        }
        
        const spacing = 120;
        
        children.forEach((node, index) => {
          if (!preserveManualPositions || !(node.data as NodeData).isManuallyPositioned) {
            const offset = (index - (children.length - 1) / 2) * spacing;
            node.position = {
              x: parent.position.x + offset * Math.cos(baseAngle + Math.PI / 2),
              y: parent.position.y + level4Spacing + offset * Math.sin(baseAngle + Math.PI / 2)
            };
          }
        });
      }
    });
    
    return layoutNodes;
  };
  
  // Get all descendant IDs recursively
  const getAllDescendantIds = useCallback((nodeId: string): string[] => {
    return dataService.getAllDescendantIds(nodeId);
  }, []);
  
  // Handle node drag to mark as manually positioned
  const handleNodeDragStop = useCallback((_event: React.MouseEvent, node: Node) => {
    setAllNodesData(prev => prev.map(n => 
      n.id === node.id 
        ? { ...n, data: { ...n.data, isManuallyPositioned: true } }
        : n
    ));
  }, []);
  
  // Handle node click to expand/collapse
  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    // Hide tooltip immediately on click
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
    }
    setTooltipState(prev => ({ ...prev, show: false }));
    
    const nodeData = node.data as NodeData;
    if (nodeData.hasChildren) {
      setExpandedNodes(prev => {
        const newSet = new Set(prev);
        if (newSet.has(node.id)) {
          // Collapsing: remove this node and all descendants
          newSet.delete(node.id);
          const descendants = getAllDescendantIds(node.id);
          descendants.forEach(id => newSet.delete(id));
          
          // Focus on the collapsed node
          setTimeout(() => {
            reactFlowInstance.fitView({
              nodes: [{ id: node.id }],
              duration: 800,
              padding: 2,
            });
          }, 100);
        } else {
          // Expanding: add this node
          newSet.add(node.id);
          
          // Apply layout to new children while preserving manual positions
          setTimeout(() => {
            const updatedNodes = autoLayout(allNodesData, true);
            setAllNodesData(updatedNodes);
            
            const children = updatedNodes.filter(n => 
              (n.data as NodeData).parentIds?.includes(node.id)
            );
            const nodesToFit = [node, ...children];
            reactFlowInstance.fitView({
              nodes: nodesToFit,
              duration: 800,
              padding: 0.5,
            });
          }, 100);
        }
        return newSet;
      });
    }
  }, [allNodesData, reactFlowInstance, getAllDescendantIds]);
  
  // Track mouse position for distance-based hiding
  const mousePositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const tooltipAnchorRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Handle tooltip show
  const handleShowTooltip = useCallback((nodeId: string, nodeData: NodeData, event: React.MouseEvent) => {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const anchorX = rect.left + rect.width / 2;
    const anchorY = rect.bottom + 10;
    
    // Store anchor position
    tooltipAnchorRef.current = { x: anchorX, y: anchorY };
    
    // Clear any hide timeout
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
      tooltipTimeoutRef.current = null;
    }
    
    setTooltipState({
      show: true,
      nodeId,
      data: nodeData,
      position: {
        x: anchorX,
        y: anchorY
      }
    });
  }, []);

  // Handle tooltip hide with delay
  const handleHideTooltip = useCallback(() => {
    // Clear any existing timeout
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
    }
    
    // Set a delay before hiding to allow moving to tooltip
    tooltipTimeoutRef.current = setTimeout(() => {
      // Only hide if tooltip is not being hovered
      if (!isTooltipHovered) {
        setTooltipState(prev => ({ ...prev, show: false }));
      }
    }, 100); // 100ms delay to move cursor to tooltip
  }, [isTooltipHovered]);

  // Global mouse move handler for distance-based tooltip hiding
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      mousePositionRef.current = { x: e.clientX, y: e.clientY };
      
      // Check distance from tooltip anchor if tooltip is shown
      if (tooltipState.show && !isTooltipHovered) {
        const distance = Math.sqrt(
          Math.pow(e.clientX - tooltipAnchorRef.current.x, 2) +
          Math.pow(e.clientY - tooltipAnchorRef.current.y, 2)
        );
        
        // Hide tooltip if mouse is too far from anchor (150px threshold)
        if (distance > 150) {
          if (tooltipTimeoutRef.current) {
            clearTimeout(tooltipTimeoutRef.current);
          }
          setTooltipState(prev => ({ ...prev, show: false }));
        }
      }
    };
    
    document.addEventListener('mousemove', handleGlobalMouseMove);
    return () => document.removeEventListener('mousemove', handleGlobalMouseMove);
  }, [tooltipState.show, isTooltipHovered]);

  // Handle reset canvas
  const handleResetCanvas = useCallback(() => {
    // Clear all expanded nodes
    setExpandedNodes(new Set());
    
    // Reset manual positioning for all nodes
    const resetNodes = allNodesData.map(node => ({
      ...node,
      data: {
        ...node.data,
        isManuallyPositioned: false
      }
    }));
    
    // Apply auto-layout
    const layoutedNodes = autoLayout(resetNodes);
    setAllNodesData(layoutedNodes);
    
    // Focus on the center with level 1 and 2 nodes
    setTimeout(() => {
      const level12Nodes = layoutedNodes.filter(n => {
        const nodeData = n.data as NodeData;
        return nodeData.level === 1 || nodeData.level === 2;
      });
      
      reactFlowInstance.fitView({
        nodes: level12Nodes,
        duration: 800,
        padding: 0.5,
      });
    }, 100);
  }, [allNodesData, reactFlowInstance]);
  
  const onConnect = useCallback(
    (_params: Connection) => {
      // Prevent all new connections to avoid unwanted edges between sibling nodes
      // Only pre-defined parent-child relationships should exist
      return;
    },
    []
  );
  
  const addNode = () => {
    if (!newNodeData.label) return;
    
    const newNode: Node = {
      id: `${Date.now()}`,
      type: 'entity',
      position: { x: Math.random() * 500, y: Math.random() * 500 },
      data: newNodeData as NodeData,
    };
    
    setNodes((nds) => [...nds, newNode]);
    setAllNodesData((nds) => [...nds, newNode]);
    setNewNodeData({ type: 'person', label: '', description: '' });
    setShowAddModal(false);
  };
  
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const documentNode: Node = {
        id: `doc-${Date.now()}`,
        type: 'entity',
        position: { x: Math.random() * 500, y: Math.random() * 500 },
        data: {
          label: file.name,
          type: 'document',
          description: `Uploaded document: ${file.name}`,
          source: 'Manual upload',
        },
      };
      setNodes((nds) => [...nds, documentNode]);
      setAllNodesData((nds) => [...nds, documentNode]);
    }
  };
  
  // Initialize with data from data service
  React.useEffect(() => {
    // Convert entities to nodes
    const allNodes = dataService.entitiesToNodes();
    console.log('Loaded nodes from data service:', allNodes.length);
    
    const layoutedNodes = autoLayout(allNodes);
    setAllNodesData(layoutedNodes);
    
    // Only show level 1 and 2 nodes initially
    const initialVisibleNodes = layoutedNodes.filter(n => {
      const nodeData = n.data as NodeData;
      return nodeData.level === 1 || nodeData.level === 2;
    });
    
    setNodes(initialVisibleNodes);
    
    // Create edges from relationships
    const edges = dataService.relationshipsToEdges();
    console.log('Loaded edges from data service:', edges.length);
    setEdges(edges);
  }, [setNodes, setEdges]);
  
  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }
    };
  }, []);
  
  // Update node expansion state and visibility
useEffect(() => {
  // Track current node positions before update
  const currentPositions = new Map(nodes.map(n => [n.id, n.position]));

  // Update expansion state
  const updatedAllNodes = allNodesData.map(node => ({
    ...node,
    data: {
      ...node.data,
      isExpanded: expandedNodes.has(node.id)
    },
    // Preserve current position if node is already visible and manually positioned
    position: (node.data as NodeData).isManuallyPositioned && currentPositions.has(node.id)
      ? currentPositions.get(node.id)!
      : node.position
  }));

  // Filter visible nodes
  const visibleNodes = updatedAllNodes.filter(node => {
    const nodeData = node.data as NodeData;

    // Always show level 1 and 2
    if (nodeData.level === 1 || nodeData.level === 2) return true;

    // For other nodes, check if ALL parent nodes in the chain are expanded
    if (nodeData.parentIds) {
      // Check immediate parent first
      const immediateParentExpanded = nodeData.parentIds.some(parentId => expandedNodes.has(parentId));
      if (!immediateParentExpanded) return false;

      // For level 4 nodes, also check if grandparent is expanded
      if (nodeData.level === 4) {
        const parent = allNodesData.find(n => n.id === nodeData.parentIds![0]);
        if (parent) {
          const grandParentIds = (parent.data as NodeData).parentIds || [];
          const grandParentExpanded = grandParentIds.some(gpId => expandedNodes.has(gpId));
          if (!grandParentExpanded) return false;
        }
      }

      return true;
    }

    return false;
  });

  setNodes(visibleNodes);
}, [expandedNodes, allNodesData, setNodes]); // <-- 'nodes' removed
  
  // Apply search filter and add tooltip handlers to nodes
  const filteredNodes = nodes.filter(node => {
    if (!searchQuery) return true;
    const nodeData = node.data as NodeData;
    return nodeData.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
           nodeData.description?.toLowerCase().includes(searchQuery.toLowerCase());
  }).map(node => ({
    ...node,
    data: {
      ...node.data,
      onShowTooltip: handleShowTooltip,
      onHideTooltip: handleHideTooltip
    }
  }));
  
  const nodesToDisplay = searchQuery ? filteredNodes : nodes.map(node => ({
    ...node,
    data: {
      ...node.data,
      onShowTooltip: handleShowTooltip,
      onHideTooltip: handleHideTooltip
    }
  }));
  
  const visibleNodeIds = new Set(nodesToDisplay.map(n => n.id));
  const filteredEdges = edges.filter(edge => 
    visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
  );
  
  return (
    <div className={`h-screen ${darkMode ? 'dark' : ''}`}>
      <div className="h-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 text-gray-900 dark:text-gray-100">
        <ReactFlow
          nodes={nodesToDisplay}
          edges={filteredEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onNodeDragStop={handleNodeDragStop}
          nodeTypes={nodeTypes}
          fitView
          className="bg-transparent"
        >
          <Background 
            color={darkMode ? '#374151' : '#e5e7eb'} 
            gap={16} 
            variant={BackgroundVariant.Dots}
            size={1}
          />
          <Controls />
          <MiniMap 
            nodeColor={(node) => {
              const data = node.data as NodeData;
              switch (data?.type) {
                case 'person':
                case 'pet':
                  return '#3B82F6';
                case 'asset':
                  return '#10B981';
                case 'document':
                  return '#8B5CF6';
                case 'folder':
                  return '#F59E0B';
                default:
                  return '#6B7280';
              }
            }}
            className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-lg"
          />
          
          <Panel position="top-left" className="flex gap-2">
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-lg p-2 flex items-center gap-2">
              <Search className="w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder="Search nodes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent outline-none w-48 text-sm"
              />
            </div>
            
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg px-4 py-2 flex items-center gap-2 transition-colors shadow-lg"
            >
              <Upload className="w-5 h-5" />
              Add Node
            </button>
            
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-purple-500 hover:bg-purple-600 text-white rounded-lg px-4 py-2 flex items-center gap-2 transition-colors shadow-lg"
            >
              <FileText className="w-5 h-5" />
              Upload Document
            </button>
            
            <button
              onClick={handleResetCanvas}
              className="bg-orange-500 hover:bg-orange-600 text-white rounded-lg px-4 py-2 flex items-center gap-2 transition-colors shadow-lg"
              title="Reset Canvas"
            >
              <RotateCcw className="w-5 h-5" />
              Reset Canvas
            </button>
            
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="bg-gray-200 dark:bg-gray-700 rounded-lg p-2 transition-colors shadow-lg"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </Panel>
        </ReactFlow>
        
        {/* Add Node Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Add New Node</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <select
                    value={newNodeData.type}
                    onChange={(e) => setNewNodeData({ ...newNodeData, type: e.target.value as NodeData['type'] })}
                    className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  >
                    <option value="person">Person</option>
                    <option value="pet">Pet</option>
                    <option value="asset">Asset</option>
                    <option value="document">Document</option>
                    <option value="folder">Folder</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Label</label>
                  <input
                    type="text"
                    value={newNodeData.label}
                    onChange={(e) => setNewNodeData({ ...newNodeData, label: e.target.value })}
                    className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                    placeholder="Enter node label..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={newNodeData.description}
                    onChange={(e) => setNewNodeData({ ...newNodeData, description: e.target.value })}
                    className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                    rows={3}
                    placeholder="Enter description..."
                  />
                </div>
                
                {newNodeData.type === 'document' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Expiry Date</label>
                    <input
                      type="date"
                      value={newNodeData.expiry || ''}
                      onChange={(e) => setNewNodeData({ ...newNodeData, expiry: e.target.value })}
                      className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                    />
                  </div>
                )}
                
                <button
                  onClick={addNode}
                  disabled={!newNodeData.label}
                  className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg py-2 transition-colors"
                >
                  Add Node
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Portal tooltip */}
        {tooltipState.show && tooltipState.data && createPortal(
          <div 
            className={`fixed z-[9999] bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 min-w-[250px] border border-gray-200 dark:border-gray-700`}
            style={{
              left: `${tooltipState.position.x}px`,
              top: `${tooltipState.position.y}px`,
              transform: 'translateX(-50%)'
            }}
            onMouseEnter={() => {
              // Clear any hide timeout when entering tooltip
              if (tooltipTimeoutRef.current) {
                clearTimeout(tooltipTimeoutRef.current);
                tooltipTimeoutRef.current = null;
              }
              setIsTooltipHovered(true);
            }}
            onMouseLeave={() => {
              setIsTooltipHovered(false);
              // Hide tooltip when leaving
              setTooltipState(prev => ({ ...prev, show: false }));
            }}
          >
            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-white dark:bg-gray-800 rotate-45 border-l border-t border-gray-200 dark:border-gray-700"></div>
            <h4 className="font-semibold mb-2">{tooltipState.data.label}</h4>
            {tooltipState.data.description && (
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{tooltipState.data.description}</p>
            )}
            {/* Show metadata information */}
            {(() => {
              const metadataDisplay = dataService.getMetadataDisplay(tooltipState.data);
              return metadataDisplay.length > 0 && (
                <div className="text-sm text-gray-600 dark:text-gray-300 mb-2 space-y-1">
                  {metadataDisplay.map((item, index) => (
                    <p key={index}>{item}</p>
                  ))}
                </div>
              );
            })()}
            {tooltipState.data.expiry && (
              <p className="text-sm text-red-600 dark:text-red-400">Expires: {tooltipState.data.expiry}</p>
            )}
            {tooltipState.data.ownership === 'shared' && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">Shared Asset</p>
            )}
            {tooltipState.data.source && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Source: {tooltipState.data.source}</p>
            )}
            {tooltipState.data.documentPath && (
              <button
                onClick={() => {
                  const entity = dataService.getEntityById(tooltipState.nodeId!);
                  if (entity) {
                    openDocument(entity);
                    handleHideTooltip();
                  }
                }}
                className="mt-3 w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Open Document
              </button>
            )}
          </div>,
          document.body
        )}
        
        {/* Document Viewer */}
        <DocumentViewer darkMode={darkMode} />
      </div>
    </div>
  );
}

// Wrapper component
function DocumentGraphApp() {
  return (
    <DocumentViewerProvider>
      <ReactFlowProvider>
        <DocumentGraphInner />
      </ReactFlowProvider>
    </DocumentViewerProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <DocumentGraphApp />
    </ErrorBoundary>
  );
}