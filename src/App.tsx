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
  Edge,
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
  Hospital,
  Stethoscope,
  Zap,
  Grid3x3,
  Settings,
  Play,
  Pause
} from 'lucide-react';
import { dataService, NodeData } from './services/dataService';
import { useDocumentViewer, DocumentViewerProvider } from './contexts/DocumentViewerContext';
import { DocumentViewer } from './components/DocumentViewer';
import { useForceLayout } from './hooks/useForceLayout';

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
        case 'birth-certificate':
          return <Baby className={iconClass} />;
        case 'drivers-licence':
          return <Car className={iconClass} />;
        case 'hospital-visits':
          return <Hospital className={iconClass} />;
        case 'imaging-reports':
          return <Stethoscope className={iconClass} />;
        case 'bank-accounts':
          return <DollarSign className={iconClass} />;
        case 'car-insurance':
        case 'insurance':
          return <Shield className={iconClass} />;
        case 'gp':
          return <Heart className={iconClass} />;
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
        // Children vs adults
        return data.level === 1 && ['Freya', 'Anya'].some(name => data.label.includes(name)) 
          ? <Baby className={iconClass} /> 
          : <User className={iconClass} />;
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
  const [originalEdges, setOriginalEdges] = useState<Edge[]>([]); // Store original edges with string IDs
  const [darkMode, setDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reactFlowInstance = useReactFlow();
  const { openDocument } = useDocumentViewer();
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isTooltipHovered, setIsTooltipHovered] = useState(false);
  
  // Layout state
  const [layoutType, setLayoutType] = useState<'sector' | 'force'>('sector');
  const [forceEnabled, setForceEnabled] = useState(false);
  const [showForceSettings, setShowForceSettings] = useState(false);
  const [forceOptions, setForceOptions] = useState({
    strength: -500,
    distance: 150,
    nodeRepulsion: -1000,
    collisionPadding: 20,
  });
  
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
  
  // Calculate visible nodes and filtered edges for force layout
  const visibleNodeIds = new Set(nodes.map(n => n.id));
  // Use original edges which have string IDs
  const visibleEdges = originalEdges.filter(edge => {
    return visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target);
  });
  
  // Force layout hook
  const {
    runSimulation,
    stopSimulation,
    restartSimulation,
    handleNodeDrag: forceNodeDrag,
    handleNodeDragStop: forceNodeDragStop,
    isSimulating,
  } = useForceLayout(nodes, visibleEdges, {
    enabled: forceEnabled && layoutType === 'force',
    animate: true,
    ...forceOptions,
    onSimulationEnd: () => {
      console.log('Force simulation completed');
    }
  });
  
  // Auto-layout function with sector-based spacing to prevent overlap
  const autoLayout = (nodes: Node[], preserveManualPositions = false) => {
    const centerX = 600;
    const centerY = 400;
    
    const layoutNodes = [...nodes];
    
    // Position level 1 (central) nodes in a square or diamond pattern
    const level1Nodes = layoutNodes.filter(n => (n.data as NodeData).level === 1)
      .sort((a, b) => a.id.localeCompare(b.id)); // Sort by ID for consistent ordering
    const level1Spacing = 200; // Distance between level 1 nodes
    
    // Calculate angular sectors for each Level 1 node
    const sectorMap = new Map<string, { startAngle: number; endAngle: number }>();
    const sectorAngle = (2 * Math.PI) / level1Nodes.length;
    
    level1Nodes.forEach((node, index) => {
      // Calculate sector for this Level 1 node
      const startAngle = index * sectorAngle - Math.PI / 2; // Start from top
      const endAngle = startAngle + sectorAngle;
      sectorMap.set(node.id, { startAngle, endAngle });
      
      if (!preserveManualPositions || !(node.data as NodeData).isManuallyPositioned) {
        // Position nodes in a diamond/square pattern for 4 people
        if (level1Nodes.length === 4) {
          switch (index) {
            case 0: // Top
              node.position = { x: centerX, y: centerY - level1Spacing };
              break;
            case 1: // Right
              node.position = { x: centerX + level1Spacing, y: centerY };
              break;
            case 2: // Bottom
              node.position = { x: centerX, y: centerY + level1Spacing };
              break;
            case 3: // Left
              node.position = { x: centerX - level1Spacing, y: centerY };
              break;
          }
        } else if (level1Nodes.length === 2) {
          // Side by side for couples
          node.position = {
            x: centerX + (index === 0 ? -level1Spacing/2 : level1Spacing/2),
            y: centerY
          };
        } else {
          // Arrange in a circle for other counts
          const angleStep = (2 * Math.PI) / level1Nodes.length;
          const angle = index * angleStep - Math.PI / 2;
          const radius = level1Spacing * 0.7;
          node.position = {
            x: centerX + Math.cos(angle) * radius,
            y: centerY + Math.sin(angle) * radius
          };
        }
      }
    });
    
    // Position level 2 nodes around their parent nodes
    const level2NodesByParent = new Map<string, Node[]>();
    const level2Nodes = layoutNodes.filter(n => (n.data as NodeData).level === 2);
    
    // Group level 2 nodes by their parent
    level2Nodes.forEach(node => {
      const parentId = (node.data as NodeData).parentIds?.[0];
      if (parentId) {
        if (!level2NodesByParent.has(parentId)) {
          level2NodesByParent.set(parentId, []);
        }
        level2NodesByParent.get(parentId)!.push(node);
      }
    });
    
    // Position level 2 nodes around their respective parents within sector boundaries
    level2NodesByParent.forEach((children, parentId) => {
      const parent = layoutNodes.find(n => n.id === parentId);
      const sector = sectorMap.get(parentId);
      
      if (parent && sector) {
        // Get the parent's sector boundaries
        const { startAngle, endAngle } = sector;
        const sectorWidth = endAngle - startAngle;
        
        // Position level 2 nodes within the parent's sector
        const level2Radius = 350; // Fixed distance from center for all level 2 nodes
        
        // Calculate angular positions within the sector
        const usableSectorWidth = sectorWidth * 0.7; // Use 70% of sector to leave gaps
        const sectorCenter = (startAngle + endAngle) / 2;
        const angleStep = children.length > 1 ? usableSectorWidth / (children.length - 1) : 0;
        const startChildAngle = sectorCenter - usableSectorWidth / 2;
        
        children.forEach((node, index) => {
          if (!preserveManualPositions || !(node.data as NodeData).isManuallyPositioned) {
            const angle = startChildAngle + index * angleStep;
            
            // Position at fixed radius from center
            const x = centerX + Math.cos(angle) * level2Radius;
            const y = centerY + Math.sin(angle) * level2Radius;
            
            node.position = { x, y };
          }
        });
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
        // Find the Level 1 ancestor to get the sector
        const parentData = parent.data as NodeData;
        const level1AncestorId = parentData.parentIds?.[0];
        const sector = level1AncestorId ? sectorMap.get(level1AncestorId) : null;
        
        if (sector) {
          const { startAngle, endAngle } = sector;
          
          // Position level 3 nodes at a fixed radius, distributed around their parent
          const level3Radius = 500; // Fixed distance from center for all level 3 nodes
          const parentAngle = Math.atan2(parent.position.y - centerY, parent.position.x - centerX);
          
          // Calculate spread within sector constraints
          const maxSpread = Math.PI / 4; // Maximum 45 degrees spread
          const actualSpread = Math.min(maxSpread, (endAngle - startAngle) * 0.3);
          const angleStep = children.length > 1 ? actualSpread / (children.length - 1) : 0;
          const startChildAngle = parentAngle - actualSpread / 2;
          
          children.forEach((node, index) => {
            if (!preserveManualPositions || !(node.data as NodeData).isManuallyPositioned) {
              let angle = startChildAngle + index * angleStep;
              
              // Ensure angle stays within sector bounds
              angle = Math.max(startAngle + 0.1, Math.min(endAngle - 0.1, angle));
              
              const x = centerX + Math.cos(angle) * level3Radius;
              const y = centerY + Math.sin(angle) * level3Radius;
              
              node.position = { x, y };
            }
          });
        }
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
        // Find the Level 1 ancestor through the parent hierarchy
        const parentData = parent.data as NodeData;
        const level2AncestorId = parentData.parentIds?.[0];
        const level2Ancestor = level2AncestorId ? layoutNodes.find(n => n.id === level2AncestorId) : null;
        const level1AncestorId = level2Ancestor ? (level2Ancestor.data as NodeData).parentIds?.[0] : null;
        const sector = level1AncestorId ? sectorMap.get(level1AncestorId) : null;
        
        if (sector) {
          const { startAngle, endAngle } = sector;
          
          // Position level 4 nodes at the outermost radius
          const level4Radius = 650; // Fixed distance from center for all level 4 nodes
          const parentAngle = Math.atan2(parent.position.y - centerY, parent.position.x - centerX);
          
          // Very narrow spread for level 4 nodes
          const maxSpread = Math.PI / 6; // Maximum 30 degrees spread
          const actualSpread = Math.min(maxSpread, (endAngle - startAngle) * 0.2);
          const angleStep = children.length > 1 ? actualSpread / (children.length - 1) : 0;
          const startChildAngle = parentAngle - actualSpread / 2;
          
          children.forEach((node, index) => {
            if (!preserveManualPositions || !(node.data as NodeData).isManuallyPositioned) {
              let angle = startChildAngle + index * angleStep;
              
              // Ensure angle stays within sector bounds
              angle = Math.max(startAngle + 0.05, Math.min(endAngle - 0.05, angle));
              
              const x = centerX + Math.cos(angle) * level4Radius;
              const y = centerY + Math.sin(angle) * level4Radius;
              
              node.position = { x, y };
            }
          });
        }
      }
    });
    
    return layoutNodes;
  };
  
  // Get all descendant IDs recursively
  const getAllDescendantIds = useCallback((nodeId: string): string[] => {
    return dataService.getAllDescendantIds(nodeId);
  }, []);
  
  // Handle node drag to mark as manually positioned
  const handleNodeDragStop = useCallback((event: React.MouseEvent, node: Node) => {
    if (layoutType === 'force' && forceEnabled) {
      forceNodeDragStop(event, node);
    } else {
      setAllNodesData(prev => prev.map(n => 
        n.id === node.id 
          ? { ...n, data: { ...n.data, isManuallyPositioned: true } }
          : n
      ));
    }
  }, [layoutType, forceEnabled, forceNodeDragStop]);
  
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
            if (layoutType === 'force' && forceEnabled) {
              // Force layout will handle positioning
              restartSimulation(true);
            } else {
              const updatedNodes = autoLayout(allNodesData, true);
              setAllNodesData(updatedNodes);
            }
            
            const children = allNodesData.filter(n => 
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
    
    // Apply appropriate layout
    if (layoutType === 'force' && forceEnabled) {
      setAllNodesData(resetNodes);
      setTimeout(() => restartSimulation(false), 100);
    } else {
      const layoutedNodes = autoLayout(resetNodes);
      setAllNodesData(layoutedNodes);
    }
    
    // Focus on the center with level 1 and 2 nodes
    setTimeout(() => {
      const level12Nodes = resetNodes.filter(n => {
        const nodeData = n.data as NodeData;
        return nodeData.level === 1 || nodeData.level === 2;
      });
      
      reactFlowInstance.fitView({
        nodes: level12Nodes,
        duration: 800,
        padding: 0.5,
      });
    }, 100);
  }, [allNodesData, reactFlowInstance, layoutType, forceEnabled, restartSimulation]);
  
  // Handle layout type change
  const handleLayoutChange = useCallback((newLayoutType: 'sector' | 'force') => {
    console.log('Layout change to:', newLayoutType);
    console.log('Current nodes:', nodes.length);
    console.log('Current edges:', edges.length);
    console.log('Visible edges:', visibleEdges.length);
    
    setLayoutType(newLayoutType);
    
    if (newLayoutType === 'force') {
      setForceEnabled(true);
      // Reset positions for force layout (except manually positioned nodes)
      const resetNodes = nodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          // Keep manual positioning flag
          isManuallyPositioned: (node.data as NodeData).isManuallyPositioned
        }
      }));
      setNodes(resetNodes);
    } else {
      setForceEnabled(false);
      stopSimulation();
      // Apply sector layout
      const layoutedNodes = autoLayout(allNodesData, true);
      setAllNodesData(layoutedNodes);
    }
  }, [allNodesData, stopSimulation, nodes, setNodes]);
  
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
    
    if (layoutType === 'force' && forceEnabled) {
      setAllNodesData(allNodes);
      // Force layout will be triggered after nodes are set
    } else {
      const layoutedNodes = autoLayout(allNodes);
      setAllNodesData(layoutedNodes);
    }
    
    // Only show level 1 and 2 nodes initially
    const initialVisibleNodes = allNodes.filter(n => {
      const nodeData = n.data as NodeData;
      return nodeData.level === 1 || nodeData.level === 2;
    });
    
    setNodes(initialVisibleNodes);
    
    // Create edges from relationships
    const edgesFromService = dataService.relationshipsToEdges();
    console.log('Loaded edges from data service:', edgesFromService.length);
    setOriginalEdges(edgesFromService); // Store original edges
    setEdges(edgesFromService);
  }, [setNodes, setEdges]);
  
  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }
    };
  }, []);
  
  // Trigger force simulation when enabled
  const hasTriggeredRef = useRef(false);
  React.useEffect(() => {
    if (layoutType === 'force' && forceEnabled && nodes.length > 0 && !isSimulating) {
      // Reset trigger flag when layout type changes
      if (layoutType === 'force' && !hasTriggeredRef.current) {
        hasTriggeredRef.current = true;
        console.log('Triggering force simulation with:', { 
          nodes: nodes.length, 
          visibleEdges: visibleEdges.length,
          firstEdge: visibleEdges[0]
        });
        // Small delay to ensure nodes are rendered
        const timer = setTimeout(() => {
          // Don't preserve positions on initial force layout
          runSimulation(false);
        }, 200);
        return () => clearTimeout(timer);
      }
    } else if (layoutType !== 'force') {
      hasTriggeredRef.current = false;
    }
  }, [layoutType, forceEnabled, nodes.length, isSimulating, runSimulation]); // Added isSimulating to prevent re-triggering

  // Fit view to show all level 1 nodes when they change
  React.useEffect(() => {
    if (reactFlowInstance && nodes.length > 0) {
      // Wait a bit for nodes to be positioned
      setTimeout(() => {
        const level1Nodes = nodes.filter(n => (n.data as NodeData).level === 1);
        if (level1Nodes.length > 0) {
          reactFlowInstance.fitView({
            nodes: level1Nodes,
            duration: 800,
            padding: 0.5,
            minZoom: 0.5,
            maxZoom: 1
          });
        }
      }, 100);
    }
  }, [nodes.length, reactFlowInstance]);
  
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
  
  // Use the same filtered edges that were passed to force layout
  const displayNodeIds = new Set(nodesToDisplay.map(n => n.id));
  // Use original edges to ensure we have string IDs
  const filteredEdges = originalEdges.filter(edge => {
    return displayNodeIds.has(edge.source) && displayNodeIds.has(edge.target);
  }).map(edge => ({
    ...edge,
    type: 'smoothstep',
    animated: false,
    style: {
      stroke: darkMode ? '#6b7280' : '#9ca3af',
      strokeWidth: 2,
      opacity: 0.8,
    },
  }));
  
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
          onNodeDrag={layoutType === 'force' && forceEnabled ? forceNodeDrag : undefined}
          onNodeDragStop={handleNodeDragStop}
          nodeTypes={nodeTypes}
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
                default:
                  return '#6B7280';
              }
            }}
            className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-lg"
          />
          
          <Panel position="top-left" className="flex flex-col gap-2">
            <div className="flex gap-2">
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
            </div>
            
            {/* Layout Controls */}
            <div className="flex gap-2">
              <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-lg p-2 flex items-center gap-2">
                <button
                  onClick={() => handleLayoutChange('sector')}
                  className={`px-3 py-1 rounded-md flex items-center gap-1 transition-colors ${
                    layoutType === 'sector' 
                      ? 'bg-blue-500 text-white' 
                      : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                  title="Sector Layout"
                >
                  <Grid3x3 className="w-4 h-4" />
                  <span className="text-sm">Sector</span>
                </button>
                <button
                  onClick={() => handleLayoutChange('force')}
                  className={`px-3 py-1 rounded-md flex items-center gap-1 transition-colors ${
                    layoutType === 'force' 
                      ? 'bg-blue-500 text-white' 
                      : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                  title="Force-Directed Layout"
                >
                  <Zap className="w-4 h-4" />
                  <span className="text-sm">Force</span>
                </button>
              </div>
              
              {layoutType === 'force' && (
                <>
                  <button
                    onClick={() => {
                      if (forceEnabled) {
                        setForceEnabled(false);
                        stopSimulation();
                      } else {
                        setForceEnabled(true);
                        setTimeout(() => restartSimulation(true), 100);
                      }
                    }}
                    className={`bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-lg px-3 py-2 flex items-center gap-2 transition-colors ${
                      forceEnabled ? 'text-green-600' : 'text-gray-500'
                    }`}
                    title={forceEnabled ? 'Pause Simulation' : 'Run Simulation'}
                  >
                    {forceEnabled && isSimulating ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    <span className="text-sm">{isSimulating ? 'Running' : forceEnabled ? 'Ready' : 'Paused'}</span>
                  </button>
                  
                  <button
                    onClick={() => setShowForceSettings(!showForceSettings)}
                    className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-lg p-2 transition-colors hover:bg-gray-200 dark:hover:bg-gray-700"
                    title="Force Settings"
                  >
                    <Settings className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
            
            {/* Force Settings Panel */}
            {showForceSettings && layoutType === 'force' && (
              <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-lg p-4 space-y-3">
                <h3 className="font-semibold text-sm mb-2">Force Settings</h3>
                
                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-400">Link Strength</label>
                  <input
                    type="range"
                    min="-2000"
                    max="0"
                    value={forceOptions.strength}
                    onChange={(e) => setForceOptions({ ...forceOptions, strength: Number(e.target.value) })}
                    className="w-full"
                  />
                  <span className="text-xs">{forceOptions.strength}</span>
                </div>
                
                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-400">Link Distance</label>
                  <input
                    type="range"
                    min="50"
                    max="300"
                    value={forceOptions.distance}
                    onChange={(e) => setForceOptions({ ...forceOptions, distance: Number(e.target.value) })}
                    className="w-full"
                  />
                  <span className="text-xs">{forceOptions.distance}</span>
                </div>
                
                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-400">Node Repulsion</label>
                  <input
                    type="range"
                    min="-3000"
                    max="-100"
                    value={forceOptions.nodeRepulsion}
                    onChange={(e) => setForceOptions({ ...forceOptions, nodeRepulsion: Number(e.target.value) })}
                    className="w-full"
                  />
                  <span className="text-xs">{forceOptions.nodeRepulsion}</span>
                </div>
                
                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-400">Collision Padding</label>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={forceOptions.collisionPadding}
                    onChange={(e) => setForceOptions({ ...forceOptions, collisionPadding: Number(e.target.value) })}
                    className="w-full"
                  />
                  <span className="text-xs">{forceOptions.collisionPadding}px</span>
                </div>
                
                <button
                  onClick={() => restartSimulation(true)}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-md py-1 text-sm transition-colors"
                >
                  Apply Changes
                </button>
              </div>
            )}
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