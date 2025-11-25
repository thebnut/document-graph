/**
 * Document Graph Inner Component
 *
 * Main orchestration component for the document graph visualization
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Connection,
  Panel,
} from '@xyflow/react';
import { useDocumentViewer } from '../contexts/DocumentViewerContext';
import { useAuth } from '../contexts/AuthContext';
import { dataService } from '../services/dataService-adapter';
import type { NodeData } from '../services/dataService-adapter';
import { nodeTypes } from '../config/nodeTypes';
import { edgeTypes, getEdgeOptions } from '../config/edgeTypes';
import { ControlsPanel } from './panels/ControlsPanel';
import { AddNodeModal } from './modals/AddNodeModal';
import { TooltipPortal } from './overlays/TooltipPortal';
import { DocumentViewer } from './DocumentViewer';
import { SyncStatusIndicator } from './SyncStatusIndicator';
import { BulkUploadModal } from './BulkUploadModal';
import { LifemapBuilderWizard } from './onboarding';
import { BuildResult } from '../services/lifemapBuilderService';
import { useLayout } from '../hooks/useLayout';
import { useGraphData } from '../hooks/useGraphData';
import { useTooltip } from '../hooks/useTooltip';
import { useSearch } from '../hooks/useSearch';
import { useNodeActions } from '../hooks/useNodeActions';
import { useDocuments } from '../hooks/useDocuments';

export function DocumentGraphInner() {
  // Initialize hooks
  const { layoutEngine } = useLayout();
  const graphData = useGraphData({ layoutEngine });
  const tooltip = useTooltip();
  const search = useSearch();
  const { openDocument } = useDocumentViewer();
  const { signOut } = useAuth();

  // Node actions hook
  const nodeActions = useNodeActions({
    allNodesData: graphData.allNodesData,
    setAllNodesData: graphData.setAllNodesData,
    edges: graphData.edges,
    setEdges: graphData.setEdges,
    expandedNodes: graphData.expandedNodes,
    setExpandedNodes: graphData.setExpandedNodes,
    getAllDescendantIds: graphData.getAllDescendantIds,
    layoutEngine,
    hideTooltipImmediately: tooltip.hideTooltipImmediately,
  });

  // Documents hook
  const documents = useDocuments({
    setNodes: graphData.setNodes,
    setAllNodesData: graphData.setAllNodesData,
  });

  // Local state
  const [darkMode, setDarkMode] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [showOnboardingWizard, setShowOnboardingWizard] = useState(false);
  const [isDataReady, setIsDataReady] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Wrapper to convert entity ID to Entity for document viewer
  const handleOpenDocument = React.useCallback((entityId: string) => {
    const entity = dataService.getEntityById(entityId);
    if (entity) {
      openDocument(entity);
    }
  }, [openDocument]);

  // Prevent all new connections to avoid unwanted edges
  const onConnect = React.useCallback((_params: Connection) => {
    // Only pre-defined parent-child relationships should exist
    return;
  }, []);

  // Check if onboarding is needed (wait for initialization first)
  useEffect(() => {
    const checkOnboarding = async () => {
      // Ensure correct service is used (handles case where auth wasn't ready at module import)
      // This also waits for initialization to complete
      if (dataService.ensureCorrectService) {
        console.log('Ensuring correct data service and waiting for initialization...');
        await dataService.ensureCorrectService();
        console.log('Data service ready');
      }

      // Now check if onboarding is needed
      if (dataService.needsOnboarding && dataService.needsOnboarding()) {
        console.log('Onboarding needed - showing wizard');
        setShowOnboardingWizard(true);
        // Don't set isDataReady - we need to wait for onboarding to complete
      } else {
        console.log('Onboarding not needed - data exists, loading graph');
        setIsDataReady(true);
      }
    };

    checkOnboarding();
  }, []);

  // Handle wizard completion
  const handleOnboardingComplete = React.useCallback(async (result: BuildResult) => {
    console.log('Onboarding complete:', result);

    // Extract family name from the result (use the family name from metadata)
    const model = await dataService.getModel();
    const familyName = model.getData().metadata.familyName || 'Family';

    // Mark onboarding as complete
    if (dataService.completeOnboarding) {
      await dataService.completeOnboarding(familyName);
    }

    // Close wizard and mark data as ready
    setShowOnboardingWizard(false);
    setIsDataReady(true);

    // Reload graph data
    const allNodes = dataService.entitiesToNodes();
    console.log('Reloaded nodes after onboarding:', allNodes.length);

    const edgesData = dataService.relationshipsToEdges();
    console.log('Reloaded edges after onboarding:', edgesData.length);
    graphData.setEdges(edgesData);

    const layoutResult = layoutEngine.current.calculateLayout(allNodes, edgesData, {
      preserveManualPositions: false,
    });
    graphData.setAllNodesData(layoutResult.nodes);
    graphData.setEdges(layoutResult.edges);

    // Initially show family root, level 1 (people), and level 2 (categories) nodes
    const initialVisibleNodes = layoutResult.nodes.filter((n) => {
      const nodeData = n.data as NodeData;
      return nodeData.level === 0 || nodeData.level === 1 || nodeData.level === 2;
    });

    graphData.setNodes(initialVisibleNodes);
  }, [layoutEngine, graphData]);

  // Initialize with data from data service (only when data is ready)
  useEffect(() => {
    // Don't load data until service is initialized and onboarding check is complete
    if (!isDataReady) {
      console.log('Waiting for data to be ready before loading nodes...');
      return;
    }

    const allNodes = dataService.entitiesToNodes();
    console.log('Loaded nodes from data service:', allNodes.length);

    const edgesData = dataService.relationshipsToEdges();
    console.log('Loaded edges from data service:', edgesData.length);
    graphData.setEdges(edgesData);

    const layoutResult = layoutEngine.current.calculateLayout(allNodes, edgesData, {
      preserveManualPositions: false,
    });
    graphData.setAllNodesData(layoutResult.nodes);
    graphData.setEdges(layoutResult.edges);

    // Initially show family root, level 1 (people), and level 2 (categories) nodes
    const initialVisibleNodes = layoutResult.nodes.filter((n) => {
      const nodeData = n.data as NodeData;
      return nodeData.level === 0 || nodeData.level === 1 || nodeData.level === 2;
    });

    graphData.setNodes(initialVisibleNodes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutEngine, isDataReady]);

  // Update node expansion state and visibility
  useEffect(() => {
    // Track current node positions before update
    const currentPositions = new Map(graphData.nodes.map((n) => [n.id, n.position]));

    // Update expansion state
    const updatedAllNodes = graphData.allNodesData.map((node) => ({
      ...node,
      data: {
        ...node.data,
        isExpanded: graphData.expandedNodes.has(node.id),
      },
      // Preserve current position if node is already visible and manually positioned
      position:
        (node.data as NodeData).isManuallyPositioned && currentPositions.has(node.id)
          ? currentPositions.get(node.id)!
          : node.position,
    }));

    // Filter visible nodes
    const visibleNodes = updatedAllNodes.filter((node) => {
      const nodeData = node.data as NodeData;

      // Always show family root (level 0), level 1 and 2
      if (nodeData.level === 0 || nodeData.level === 1 || nodeData.level === 2) return true;

      // For other nodes, check if ALL parent nodes in the chain are expanded
      if (nodeData.parentIds) {
        // Check immediate parent first
        const immediateParentExpanded = nodeData.parentIds.some((parentId) =>
          graphData.expandedNodes.has(parentId)
        );
        if (node.id === 'anya-hospital-discharge') {
          console.log('🔍 Checking visibility for Hospital Discharge:');
          console.log('   Level:', nodeData.level);
          console.log('   Parent IDs:', nodeData.parentIds);
          console.log('   Expanded nodes:', Array.from(graphData.expandedNodes));
          console.log('   Immediate parent expanded:', immediateParentExpanded);
        }
        if (!immediateParentExpanded) return false;

        // For level 4 nodes, also check if grandparent is expanded
        if (nodeData.level === 4) {
          const parent = graphData.allNodesData.find((n) => n.id === nodeData.parentIds![0]);
          if (parent) {
            const grandParentIds = (parent.data as NodeData).parentIds || [];
            const grandParentExpanded = grandParentIds.some((gpId) =>
              graphData.expandedNodes.has(gpId)
            );
            if (!grandParentExpanded) return false;
          }
        }

        // For level 5 nodes (documents under family root), check if family root is expanded
        if (nodeData.level === 5) {
          const familyRootExpanded = graphData.expandedNodes.has('family-root');
          if (!familyRootExpanded) return false;
        }

        return true;
      }

      return false;
    });

    graphData.setNodes(visibleNodes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphData.expandedNodes, graphData.allNodesData]);

  // Apply search filter and add tooltip handlers to nodes
  const nodesToDisplay = search.filterNodesBySearch(graphData.nodes).map((node) => ({
    ...node,
    data: {
      ...node.data,
      onShowTooltip: tooltip.handleShowTooltip,
      onHideTooltip: tooltip.handleHideTooltip,
    },
  }));

  // Filter edges to only show connections between visible nodes
  const visibleNodeIds = new Set(nodesToDisplay.map((n) => n.id));
  const filteredEdges = graphData.edges.filter(
    (edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
  );

  return (
    <div className={`h-screen ${darkMode ? 'dark' : ''}`}>
      <div className="h-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 text-gray-900 dark:text-gray-100">
        <ReactFlow
          nodes={nodesToDisplay}
          edges={filteredEdges}
          onNodesChange={graphData.onNodesChange}
          onEdgesChange={graphData.onEdgesChange}
          onConnect={onConnect}
          onNodeClick={nodeActions.onNodeClick}
          onNodeDragStop={nodeActions.handleNodeDragStop}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={getEdgeOptions(darkMode)}
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

          {/* Controls Panel */}
          <ControlsPanel
            searchQuery={search.searchQuery}
            onSearchChange={search.setSearchQuery}
            onAddNode={() => setShowAddModal(true)}
            onUploadDocument={() => fileInputRef.current?.click()}
            onBulkUpload={() => setShowBulkUploadModal(true)}
            onResetCanvas={nodeActions.handleResetCanvas}
            onLogout={signOut}
            darkMode={darkMode}
            onToggleDarkMode={() => setDarkMode(!darkMode)}
            fileInputRef={fileInputRef}
            onFileChange={documents.handleFileUpload}
          />

          {/* Sync Status Indicator */}
          <Panel position="top-right">
            <SyncStatusIndicator />
          </Panel>
        </ReactFlow>

        {/* Add Node Modal */}
        <AddNodeModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onAdd={nodeActions.addNode}
          darkMode={darkMode}
        />

        {/* Tooltip Portal */}
        <TooltipPortal
          tooltipState={tooltip.tooltipState}
          onMouseEnter={tooltip.handleTooltipMouseEnter}
          onMouseLeave={tooltip.handleTooltipMouseLeave}
          onOpenDocument={handleOpenDocument}
          darkMode={darkMode}
        />

        {/* Document Viewer */}
        <DocumentViewer darkMode={darkMode} />

        {/* Bulk Upload Modal */}
        <BulkUploadModal
          isOpen={showBulkUploadModal}
          onClose={() => setShowBulkUploadModal(false)}
          onDocumentsAdded={(count) => {
            console.log(`Added ${count} documents via bulk upload`);
            graphData.refreshGraphFromDataModel();
          }}
          darkMode={darkMode}
        />

        {/* Onboarding Wizard */}
        <LifemapBuilderWizard
          isOpen={showOnboardingWizard}
          onClose={() => setShowOnboardingWizard(false)}
          onComplete={handleOnboardingComplete}
          darkMode={darkMode}
        />
      </div>
    </div>
  );
}
