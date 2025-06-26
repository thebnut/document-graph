import React, { useCallback, useState, useRef, useEffect } from 'react';
import ReactFlow, {
  addEdge,
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
  ConnectionMode,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Upload, Search, Moon, Sun, User, Home, Car, FileText, X, ChevronRight, ChevronDown } from 'lucide-react';

// Extended node data structure
interface NodeData {
  label: string;
  type: 'person' | 'pet' | 'asset' | 'document';
  subtype?: string;
  description?: string;
  expiry?: string;
  source?: string;
  level?: number;
  parentIds?: string[];
  isExpanded?: boolean;
  hasChildren?: boolean;
}

// Custom bubble node component with expansion
const EntityNode = ({ data, id }: { data: NodeData; id: string }) => {
  const [showDetails, setShowDetails] = useState(false);
  
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
      default:
        return 'bg-gradient-to-br from-gray-400 to-gray-600';
    }
  };
  
  const getIcon = () => {
    const iconClass = data.type === 'person' || data.level === 1 ? 'w-8 h-8' : 'w-6 h-6';
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
        onMouseEnter={() => setShowDetails(true)}
        onMouseLeave={() => setShowDetails(false)}
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
        
        {/* Dynamic handles for all sides */}
        <Handle 
          type="source" 
          position={Position.Top}
          id="top"
          className="opacity-0" 
          style={{ top: 0 }}
        />
        <Handle 
          type="source" 
          position={Position.Right}
          id="right"
          className="opacity-0" 
          style={{ right: 0 }}
        />
        <Handle 
          type="source" 
          position={Position.Bottom}
          id="bottom"
          className="opacity-0" 
          style={{ bottom: 0 }}
        />
        <Handle 
          type="source" 
          position={Position.Left}
          id="left"
          className="opacity-0" 
          style={{ left: 0 }}
        />
        <Handle 
          type="target" 
          position={Position.Top}
          id="target-top"
          className="opacity-0" 
          style={{ top: 0 }}
        />
        <Handle 
          type="target" 
          position={Position.Right}
          id="target-right"
          className="opacity-0" 
          style={{ right: 0 }}
        />
        <Handle 
          type="target" 
          position={Position.Bottom}
          id="target-bottom"
          className="opacity-0" 
          style={{ bottom: 0 }}
        />
        <Handle 
          type="target" 
          position={Position.Left}
          id="target-left"
          className="opacity-0" 
          style={{ left: 0 }}
        />
      </div>
      
      {showDetails && data.description && (
        <div className="absolute z-50 top-full left-1/2 transform -translate-x-1/2 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 min-w-[250px] border border-gray-200 dark:border-gray-700">
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-white dark:bg-gray-800 rotate-45 border-l border-t border-gray-200 dark:border-gray-700"></div>
          <h4 className="font-semibold mb-2">{data.label}</h4>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{data.description}</p>
          {data.expiry && (
            <p className="text-sm text-red-600 dark:text-red-400">Expires: {data.expiry}</p>
          )}
          {data.source && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Source: {data.source}</p>
          )}
        </div>
      )}
    </div>
  );
};

const nodeTypes: NodeTypes = {
  entity: EntityNode,
};

function DocumentGraphApp() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reactFlowInstance = useReactFlow();
  
  // Store all nodes data
  const [allNodesData, setAllNodesData] = useState<Node[]>([]);
  
  // Form state
  const [newNodeData, setNewNodeData] = useState<Partial<NodeData>>({
    type: 'person',
    label: '',
    description: '',
  });
  
  // Auto-layout function
  const autoLayout = (nodes: Node[]) => {
    const centerX = 400;
    const centerY = 300;
    const level2Radius = 200;
    const level3Radius = 350;
    const level4Radius = 500;
    
    const layoutNodes = [...nodes];
    
    // Position level 1 (central) nodes
    const level1Nodes = layoutNodes.filter(n => (n.data as NodeData).level === 1);
    level1Nodes.forEach((node, index) => {
      node.position = {
        x: centerX + (index === 0 ? -100 : 100),
        y: centerY
      };
    });
    
    // Position level 2 nodes in a circle around center
    const level2Nodes = layoutNodes.filter(n => (n.data as NodeData).level === 2);
    const angleStep2 = (2 * Math.PI) / level2Nodes.length;
    level2Nodes.forEach((node, index) => {
      const angle = index * angleStep2 - Math.PI / 2;
      node.position = {
        x: centerX + Math.cos(angle) * level2Radius,
        y: centerY + Math.sin(angle) * level2Radius
      };
    });
    
    // Position level 3 nodes around their parents
    const level3Nodes = layoutNodes.filter(n => (n.data as NodeData).level === 3);
    level3Nodes.forEach((node) => {
      const parentId = (node.data as NodeData).parentIds?.[0];
      const parent = layoutNodes.find(n => n.id === parentId);
      if (parent) {
        const siblings = level3Nodes.filter(n => 
          (n.data as NodeData).parentIds?.includes(parentId!)
        );
        const index = siblings.indexOf(node);
        const angleOffset = (index - (siblings.length - 1) / 2) * 0.3;
        const angle = Math.atan2(parent.position.y - centerY, parent.position.x - centerX) + angleOffset;
        
        node.position = {
          x: parent.position.x + Math.cos(angle) * 150,
          y: parent.position.y + Math.sin(angle) * 150
        };
      }
    });
    
    // Position level 4 nodes
    const level4Nodes = layoutNodes.filter(n => (n.data as NodeData).level === 4);
    level4Nodes.forEach((node, index) => {
      const parentId = (node.data as NodeData).parentIds?.[0];
      const parent = layoutNodes.find(n => n.id === parentId);
      if (parent) {
        const siblings = level4Nodes.filter(n => 
          (n.data as NodeData).parentIds?.includes(parentId!)
        );
        const siblingIndex = siblings.indexOf(node);
        const offset = (siblingIndex - (siblings.length - 1) / 2) * 100;
        
        node.position = {
          x: parent.position.x + offset,
          y: parent.position.y + 150
        };
      }
    });
    
    return layoutNodes;
  };
  
  // Get all descendant IDs recursively
  const getAllDescendantIds = (nodeId: string, allNodes: Node[]): string[] => {
    const descendants: string[] = [];
    const children = allNodes.filter(n => 
      (n.data as NodeData).parentIds?.includes(nodeId)
    );
    
    children.forEach(child => {
      descendants.push(child.id);
      descendants.push(...getAllDescendantIds(child.id, allNodes));
    });
    
    return descendants;
  };
  
  // Handle node click to expand/collapse
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    const nodeData = node.data as NodeData;
    if (nodeData.hasChildren) {
      setExpandedNodes(prev => {
        const newSet = new Set(prev);
        if (newSet.has(node.id)) {
          // Collapsing: remove this node and all descendants
          newSet.delete(node.id);
          const descendants = getAllDescendantIds(node.id, allNodesData);
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
          
          // Focus on expanded area
          setTimeout(() => {
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
  }, [allNodesData, reactFlowInstance]);
  
  const onConnect = useCallback(
    (params: Connection) => {
      const edge = {
        ...params,
        type: 'smoothstep',
        animated: true,
        style: {
          strokeWidth: 2,
          stroke: darkMode ? '#9ca3af' : '#6b7280',
        },
      };
      setEdges((eds) => addEdge(edge, eds));
    },
    [setEdges, darkMode]
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
    }
  };
  
  // Initialize with sample data
  React.useEffect(() => {
    const allNodes: Node[] = [
      // Level 1 - Central people
      {
        id: 'brett',
        type: 'entity',
        position: { x: 0, y: 0 },
        data: { 
          label: 'Brett Thebault', 
          type: 'person', 
          description: 'Primary account holder',
          level: 1,
          hasChildren: true,
          isExpanded: false
        },
      },
      {
        id: 'gemma',
        type: 'entity',
        position: { x: 0, y: 0 },
        data: { 
          label: 'Gemma Thebault', 
          type: 'person', 
          description: 'Primary account holder',
          level: 1,
          hasChildren: true,
          isExpanded: false
        },
      },
      
      // Level 2 - Direct connections
      {
        id: 'home',
        type: 'entity',
        position: { x: 0, y: 0 },
        data: { 
          label: '22 Banya St', 
          type: 'asset', 
          subtype: 'property', 
          description: 'Family home',
          level: 2,
          parentIds: ['brett', 'gemma'],
          hasChildren: true,
          isExpanded: false
        },
      },
      {
        id: 'family-docs',
        type: 'entity',
        position: { x: 0, y: 0 },
        data: { 
          label: 'Family Documents', 
          type: 'document', 
          description: 'Central repository for family documents',
          level: 2,
          parentIds: ['brett', 'gemma'],
          hasChildren: true,
          isExpanded: false
        },
      },
      
      // Level 3 - Home related
      {
        id: 'insurance',
        type: 'entity',
        position: { x: 0, y: 0 },
        data: { 
          label: 'Home Insurance', 
          type: 'document', 
          description: 'RACQ Home Insurance\nPolicy: HM-789456123', 
          expiry: '2025-08-15',
          level: 3,
          parentIds: ['home'],
          hasChildren: false
        },
      },
      {
        id: 'cleaner',
        type: 'entity',
        position: { x: 0, y: 0 },
        data: { 
          label: 'Cleaner - Estee', 
          type: 'document', 
          description: 'Estee - House Cleaner\n$560/week\nContact: 0412 345 678',
          level: 3,
          parentIds: ['home'],
          hasChildren: false
        },
      },
      {
        id: 'gardener',
        type: 'entity',
        position: { x: 0, y: 0 },
        data: { 
          label: 'Gardener - Elliot', 
          type: 'document', 
          description: 'Elliot - Gardener\n$150/fortnight\nContact: 0423 456 789',
          level: 3,
          parentIds: ['home'],
          hasChildren: false
        },
      },
      
      // Level 3 - Document categories
      {
        id: 'passports',
        type: 'entity',
        position: { x: 0, y: 0 },
        data: { 
          label: 'Passports', 
          type: 'document', 
          description: 'Family passports',
          level: 3,
          parentIds: ['family-docs'],
          hasChildren: true,
          isExpanded: false
        },
      },
      {
        id: 'medicare',
        type: 'entity',
        position: { x: 0, y: 0 },
        data: { 
          label: 'Medicare', 
          type: 'document', 
          description: 'Medicare Card\nNumber: 5123 45678 9\nBrett: 1, Gemma: 2',
          level: 3,
          parentIds: ['family-docs'],
          hasChildren: false
        },
      },
      {
        id: 'health-insurance',
        type: 'entity',
        position: { x: 0, y: 0 },
        data: { 
          label: 'Health Insurance', 
          type: 'document', 
          description: 'Medibank Private\nPolicy: 123456789\nBrett: 01, Gemma: 02',
          level: 3,
          parentIds: ['family-docs'],
          hasChildren: false
        },
      },
      
      // Level 4 - Individual passports
      {
        id: 'brett-passport',
        type: 'entity',
        position: { x: 0, y: 0 },
        data: { 
          label: 'Brett\'s Passport', 
          type: 'document', 
          description: 'Australian Passport\nNumber: PA1234567', 
          expiry: '2032-03-15',
          level: 4,
          parentIds: ['passports'],
          hasChildren: false
        },
      },
      {
        id: 'gemma-passport',
        type: 'entity',
        position: { x: 0, y: 0 },
        data: { 
          label: 'Gemma\'s Passport', 
          type: 'document', 
          description: 'Australian Passport\nNumber: PA7654321', 
          expiry: '2031-11-22',
          level: 4,
          parentIds: ['passports'],
          hasChildren: false
        },
      },
    ];
    
    const layoutedNodes = autoLayout(allNodes);
    setAllNodesData(layoutedNodes);
    setNodes(layoutedNodes);
    
    // Create edges
    const sampleEdges: Edge[] = [
      // Level 1 to Level 2
      { id: 'brett-home', source: 'brett', target: 'home', type: 'smoothstep', animated: true },
      { id: 'gemma-home', source: 'gemma', target: 'home', type: 'smoothstep', animated: true },
      { id: 'brett-docs', source: 'brett', target: 'family-docs', type: 'smoothstep', animated: true },
      { id: 'gemma-docs', source: 'gemma', target: 'family-docs', type: 'smoothstep', animated: true },
      
      // Level 2 to Level 3
      { id: 'home-insurance', source: 'home', target: 'insurance', type: 'smoothstep', animated: true },
      { id: 'home-cleaner', source: 'home', target: 'cleaner', type: 'smoothstep', animated: true },
      { id: 'home-gardener', source: 'home', target: 'gardener', type: 'smoothstep', animated: true },
      { id: 'docs-passports', source: 'family-docs', target: 'passports', type: 'smoothstep', animated: true },
      { id: 'docs-medicare', source: 'family-docs', target: 'medicare', type: 'smoothstep', animated: true },
      { id: 'docs-health', source: 'family-docs', target: 'health-insurance', type: 'smoothstep', animated: true },
      
      // Level 3 to Level 4
      { id: 'passports-brett', source: 'passports', target: 'brett-passport', type: 'smoothstep', animated: true },
      { id: 'passports-gemma', source: 'passports', target: 'gemma-passport', type: 'smoothstep', animated: true },
    ];
    
    setEdges(sampleEdges);
  }, [setNodes, setEdges]);
  
  // Update node expansion state
  useEffect(() => {
    setNodes(nodes => nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        isExpanded: expandedNodes.has(node.id)
      }
    })));
  }, [expandedNodes, setNodes]);
  
  // Filter nodes based on expansion state
  const visibleNodes = allNodesData.filter(node => {
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
  
  // Filter edges to only show those between visible nodes
  const visibleNodeIds = new Set(visibleNodes.map(n => n.id));
  const visibleEdges = edges.filter(edge => 
    visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
  );
  
  // Apply search filter
  const filteredNodes = visibleNodes.filter(node => {
    if (!searchQuery) return true;
    const nodeData = node.data as NodeData;
    return nodeData.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
           nodeData.description?.toLowerCase().includes(searchQuery.toLowerCase());
  });
  
  const filteredEdges = visibleEdges.filter(edge =>
    filteredNodes.some(node => node.id === edge.source || node.id === edge.target)
  );
  
  return (
    <div className={`h-screen ${darkMode ? 'dark' : ''}`}>
      <div className="h-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 text-gray-900 dark:text-gray-100">
        <ReactFlow
          nodes={searchQuery ? filteredNodes : visibleNodes}
          edges={searchQuery ? filteredEdges : visibleEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          className="bg-transparent"
          connectionMode={ConnectionMode.Loose}
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
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <DocumentGraphApp />
    </ReactFlowProvider>
  );
}