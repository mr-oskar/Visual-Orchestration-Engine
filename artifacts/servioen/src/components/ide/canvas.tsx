import { useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  BackgroundVariant,
  addEdge,
} from '@xyflow/react';
import type { Node, Edge, Connection, NodeChange, EdgeChange } from '@xyflow/react';
import {
  useGetProjectGraph,
  getGetProjectGraphQueryKey,
  useUpdateNodePosition,
  useCreateEdge,
  useDeleteEdge,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { nodeTypes } from './custom-nodes';

type CanvasProps = {
  projectId: number;
  selectedNodeId: string | null;
  onNodeSelect: (id: string) => void;
};

export default function Canvas({ projectId, selectedNodeId, onNodeSelect }: CanvasProps) {
  const queryClient = useQueryClient();
  const { data: graphData, isLoading } = useGetProjectGraph(projectId, {
    query: { queryKey: getGetProjectGraphQueryKey(projectId) },
  });

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const updatePosition = useUpdateNodePosition();
  const createEdge = useCreateEdge();
  const deleteEdge = useDeleteEdge();

  const dragTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    if (graphData) {
      // Topological sort: parents before children (ReactFlow requirement)
      const sorted = topoSort(graphData.nodes);

      const rfNodes: Node[] = sorted.map((n) => ({
        id: n.id,
        type: n.nodeType,
        position: { x: n.positionX, y: n.positionY },
        style: { width: n.width, height: n.height },
        data: { ...n } as Record<string, unknown>,
        parentId: n.parentNodeId || undefined,
        extent: n.parentNodeId ? ('parent' as const) : undefined,
        selected: selectedNodeId === n.id,
      }));

      const rfEdges: Edge[] = graphData.edges.map((e) => ({
        id: e.id,
        source: e.sourceNodeId,
        target: e.targetNodeId,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
        animated: true,
        style: { stroke: getEdgeColor(e.dataType || ''), strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: getEdgeColor(e.dataType || ''),
        },
      }));

      setNodes(rfNodes);
      setEdges(rfEdges);
    }
  }, [graphData, selectedNodeId, setNodes, setEdges]);

  const handleNodesChange = useCallback(
    (changes: NodeChange<Node>[]) => {
      onNodesChange(changes);
      changes.forEach((change) => {
        if (change.type === 'position' && change.position && !change.dragging) {
          const nodeId = change.id;
          clearTimeout(dragTimers.current[nodeId]);
          dragTimers.current[nodeId] = setTimeout(() => {
            updatePosition.mutate({
              projectId,
              nodeId,
              data: { positionX: change.position!.x, positionY: change.position!.y },
            });
          }, 300);
        }
      });
    },
    [onNodesChange, updatePosition, projectId]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      const newEdge: Edge = {
        id: `edge-${Date.now()}`,
        source: connection.source!,
        target: connection.target!,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
        animated: true,
        style: { stroke: '#858585', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#858585' },
        data: {},
      };
      setEdges((eds) => addEdge(newEdge, eds));

      createEdge.mutate(
        {
          projectId,
          data: {
            sourceNodeId: connection.source!,
            targetNodeId: connection.target!,
            sourceHandle: connection.sourceHandle ?? 'output',
            targetHandle: connection.targetHandle ?? 'input',
            edgeType: 'dataflow',
          },
        },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getGetProjectGraphQueryKey(projectId) });
          },
        }
      );
    },
    [setEdges, createEdge, projectId, queryClient]
  );

  const onEdgesDelete = useCallback(
    (deletedEdges: Edge[]) => {
      deletedEdges.forEach((edge) => {
        deleteEdge.mutate(
          { projectId, edgeId: edge.id },
          {
            onSuccess: () => {
              queryClient.invalidateQueries({ queryKey: getGetProjectGraphQueryKey(projectId) });
            },
          }
        );
      });
    },
    [deleteEdge, projectId, queryClient]
  );

  const onNodeClick = (_: React.MouseEvent, node: Node) => {
    onNodeSelect(node.id);
  };

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-background">
        <div className="space-y-4 text-center">
          <Skeleton className="w-64 h-64 mx-auto opacity-10" />
          <p className="text-sm font-mono text-muted-foreground animate-pulse">Loading visual graph...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative bg-background">
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-sidebar border border-border rounded p-1 shadow-md">
        <button className="px-3 py-1 text-xs font-semibold rounded bg-accent text-accent-foreground">
          Visual Graph
        </button>
      </div>

      <div className="absolute top-4 right-4 z-10 flex items-center gap-3 bg-sidebar/80 backdrop-blur border border-border rounded p-2 shadow-md text-[10px] font-mono">
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#4fc1ff]" />Folder</div>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#dcdcaa]" />File</div>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#4ec9b0]" />Class</div>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#ce9178]" />Function</div>
        <div className="h-3 w-px bg-border mx-1" />
        <span className="text-muted-foreground">Drag handles to connect · Del to remove edge</span>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={(changes: NodeChange<Node>[]) => handleNodesChange(changes)}
        onEdgesChange={(changes: EdgeChange<Edge>[]) => onEdgesChange(changes)}
        onConnect={onConnect}
        onEdgesDelete={onEdgesDelete}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        className="bg-background"
        minZoom={0.1}
        maxZoom={1.5}
        deleteKeyCode="Delete"
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#3c3c3c" />
        <Controls className="bg-sidebar border border-border fill-foreground" />
        <MiniMap
          nodeColor={(n) => {
            if (n.type === 'folder') return '#4fc1ff';
            if (n.type === 'file') return '#dcdcaa';
            if (n.type === 'class') return '#4ec9b0';
            return '#ce9178';
          }}
          maskColor="rgba(0, 0, 0, 0.5)"
          className="bg-sidebar border border-border"
        />
      </ReactFlow>
    </div>
  );
}

function getEdgeColor(dataType: string) {
  const colors: Record<string, string> = {
    DataFrame: '#4fc1ff',
    Series: '#4ec9b0',
    Dict: '#dcdcaa',
    List: '#ce9178',
  };
  return colors[dataType] || '#858585';
}

function topoSort<T extends { id: string; parentNodeId?: string | null }>(nodes: T[]): T[] {
  const map = new Map(nodes.map((n) => [n.id, n]));
  const visited = new Set<string>();
  const result: T[] = [];

  function visit(node: T) {
    if (visited.has(node.id)) return;
    visited.add(node.id);
    if (node.parentNodeId) {
      const parent = map.get(node.parentNodeId);
      if (parent) visit(parent);
    }
    result.push(node);
  }

  nodes.forEach((n) => visit(n));
  return result;
}
