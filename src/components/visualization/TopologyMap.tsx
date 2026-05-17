'use client';

import { useCallback, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node as ReactFlowNode,
  Edge as ReactFlowEdge,
  BackgroundVariant,
  ConnectionMode,
  NodeTypes
} from 'reactflow';
import 'reactflow/dist/style.css';

import { AgnosticNode, AgnosticNodeData } from './AgnosticNode';
import { Node, Edge } from '@/schema/Scenario';

/**
 * Props for TopologyMap component
 */
interface TopologyMapProps {
  nodes: Node[];
  edges: Edge[];
  className?: string;
  onSelectNode?: (node: Node) => void;
}

/**
 * Convert schema nodes to React Flow nodes
 */
function convertToReactFlowNodes(nodes: Node[]): ReactFlowNode<AgnosticNodeData>[] {
  return nodes.map((node, index) => ({
    id: node.id,
    type: 'agnosticNode',
    position: {
      // Auto-layout in a grid pattern
      x: (index % 3) * 300 + 100,
      y: Math.floor(index / 3) * 250 + 100
    },
    data: {
      label: node.label,
      serviceType: node.serviceType,
      status: node.status,
      health: node.health,
      provider: node.provider
    }
  }));
}

/**
 * Convert schema edges to React Flow edges
 */
function convertToReactFlowEdges(edges: Edge[]): ReactFlowEdge[] {
  return edges.map(edge => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label,
    type: 'smoothstep',
    animated: true,
    style: {
      stroke: '#475569',
      strokeWidth: 2
    },
    labelStyle: {
      fill: '#94a3b8',
      fontSize: 12,
      fontWeight: 500
    },
    labelBgStyle: {
      fill: '#0f172a',
      fillOpacity: 0.8
    }
  }));
}

/**
 * TopologyMap Component
 * Read-only React Flow visualization of cloud infrastructure topology
 */
export function TopologyMap({ nodes, edges, className = '', onSelectNode }: TopologyMapProps) {
  // Register custom node types
  const nodeTypes: NodeTypes = useMemo(
    () => ({
      agnosticNode: AgnosticNode
    }),
    []
  );

  // Convert schema data to React Flow format
  const reactFlowNodes = useMemo(
    () => convertToReactFlowNodes(nodes),
    [nodes]
  );

  const reactFlowEdges = useMemo(
    () => convertToReactFlowEdges(edges),
    [edges]
  );

  // Prevent node dragging (read-only)
  const onNodeDragStop = useCallback(() => {
    // Nodes are read-only, no action needed
  }, []);

  // Handle node click to select node
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: ReactFlowNode) => {
      if (onSelectNode) {
        // Find the original node from the schema
        const originalNode = nodes.find(n => n.id === node.id);
        if (originalNode) {
          onSelectNode(originalNode);
        }
      }
    },
    [nodes, onSelectNode]
  );

  return (
    <div className={`w-full h-full bg-slate-950 ${className}`}>
      <ReactFlow
        nodes={reactFlowNodes}
        edges={reactFlowEdges}
        nodeTypes={nodeTypes}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={onNodeClick}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
        connectionMode={ConnectionMode.Strict}
        fitView
        fitViewOptions={{
          padding: 0.2,
          includeHiddenNodes: false
        }}
        minZoom={0.5}
        maxZoom={1.5}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        className="react-flow-dark"
      >
        {/* Dark background with dots pattern */}
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#334155"
          className="bg-slate-950"
        />

        {/* Controls for zoom and fit view */}
        <Controls
          className="bg-slate-900 border border-slate-700 rounded-lg"
          showInteractive={false}
        />

        {/* Mini map for navigation */}
        <MiniMap
          className="bg-slate-900 border border-slate-700 rounded-lg"
          nodeColor={(node) => {
            const data = node.data as AgnosticNodeData;
            switch (data.status) {
              case 'active':
                return '#10b981';
              case 'degraded':
                return '#f59e0b';
              case 'failed':
                return '#ef4444';
              case 'recovering':
                return '#3b82f6';
              default:
                return '#64748b';
            }
          }}
          maskColor="rgba(15, 23, 42, 0.8)"
        />
      </ReactFlow>

      {/* Custom styles for dark mode */}
      <style jsx global>{`
        .react-flow-dark .react-flow__node {
          cursor: default;
        }

        .react-flow-dark .react-flow__edge-path {
          stroke: #475569;
        }

        .react-flow-dark .react-flow__edge.animated path {
          stroke-dasharray: 5;
          animation: dashdraw 0.5s linear infinite;
        }

        .react-flow-dark .react-flow__edge.selected .react-flow__edge-path {
          stroke: #60a5fa;
        }

        .react-flow-dark .react-flow__controls {
          box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
        }

        .react-flow-dark .react-flow__controls-button {
          background: #1e293b;
          border-bottom: 1px solid #334155;
          color: #94a3b8;
        }

        .react-flow-dark .react-flow__controls-button:hover {
          background: #334155;
          color: #e2e8f0;
        }

        .react-flow-dark .react-flow__minimap {
          box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
        }

        @keyframes dashdraw {
          from {
            stroke-dashoffset: 10;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </div>
  );
}

// Made with Bob
