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
  Panel,
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
import { Button } from '@/components/ui/button';
import { nodeTypes } from './custom-nodes';
import dagre from 'dagre';
import { LayoutGrid } from 'lucide-react';

type CanvasProps = {
  projectId: number;
  selectedNodeId: string | null;
  onNodeSelect: (id: string) => void;
};

// ─── Dagre auto-layout ─────────────────────────────────────────────────────────
function applyDagreLayout(nodes: Node[], edges: Edge[]): Node[] {
  const g = new dagre.graphlib.Graph({ compound: true });
  g.setGraph({ rankdir: 'LR', ranksep: 80, nodesep: 40, marginx: 40, marginy: 40 });
  g.setDefaultEdgeLabel(() => ({}));

  nodes.forEach((n) => {
    const w = (n.style?.width as number) ?? 200;
    const h = (n.style?.height as number) ?? 80;
    g.setNode(n.id, { width: w, height: h });
    if (n.parentId) g.setParent(n.id, n.parentId);
  });

  edges.forEach((e) => g.setEdge(e.source, e.target));

  dagre.layout(g);

  return nodes.map((n) => {
    const pos = g.node(n.id);
    const w = (n.style?.width as number) ?? 200;
    const h = (n.style?.height as number) ?? 80;
    return {
      ...n,
      position: { x: pos.x - w / 2, y: pos.y - h / 2 },
    };
  });
}

// ─── Topological sort (parents before children) ────────────────────────────────
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

function getEdgeColor(dataType: string) {
  const colors: Record<string, string> = {
    DataFrame: '#4fc1ff',
    Series: '#4ec9b0',
    Dict: '#dcdcaa',
    List: '#ce9178',
  };
  return colors[dataType] || '#858585';
}

// ─── Component ─────────────────────────────────────────────────────────────────
export default function Canvas({ projectId, selectedNodeId, onNodeSelect }: CanvasProps) {
  const queryClient = useQueryClient();
  const { data: graphData, isLoading } = useGetProjectGraph(projectId, {
    query: { queryKey: getGetProjectGraphQueryKey(projectId) },
  });

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const updatePosition = useUpdateNodePosition();
  const createEdgeMutation = useCreateEdge();
  const deleteEdgeMutation = useDeleteEdge();

  const dragTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const buildRFNodes = useCallback(
    (rawNodes: NonNullable<typeof graphData>['nodes']): Node[] =>
      topoSort(rawNodes).map((n) => ({
        id: n.id,
        type: n.nodeType,
        position: { x: n.positionX, y: n.positionY },
        style: { width: n.width, height: n.height },
        data: { ...n } as Record<string, unknown>,
        parentId: n.parentNodeId || undefined,
        extent: n.parentNodeId ? ('parent' as const) : undefined,
        selected: selectedNodeId === n.id,
      })),
    [selectedNodeId]
  );

  const buildRFEdges = useCallback(
    (rawEdges: NonNullable<typeof graphData>['edges']): Edge[] =>
      rawEdges.map((e) => ({
        id: e.id,
        source: e.sourceNodeId,
        target: e.targetNodeId,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
        animated: true,
        style: { stroke: getEdgeColor(e.dataType || ''), strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: getEdgeColor(e.dataType || '') },
      })),
    []
  );

  useEffect(() => {
    if (graphData) {
      setNodes(buildRFNodes(graphData.nodes));
      setEdges(buildRFEdges(graphData.edges));
    }
  }, [graphData, buildRFNodes, buildRFEdges, setNodes, setEdges]);

  // ── Auto-layout ──────────────────────────────────────────────────────────────
  const handleAutoLayout = useCallback(() => {
    setNodes((nds) => {
      const laid = applyDagreLayout(nds, edges);
      // Persist positions
      laid.forEach((n) => {
        clearTimeout(dragTimers.current[n.id]);
        updatePosition.mutate({
          projectId,
          nodeId: n.id,
          data: { positionX: n.position.x, positionY: n.position.y },
        });
      });
      return laid;
    });
  }, [edges, setNodes, updatePosition, projectId]);

  // ── Drag-to-save position ────────────────────────────────────────────────────
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
          }, 400);
        }
      });
    },
    [onNodesChange, updatePosition, projectId]
  );

  // ── Connect nodes ────────────────────────────────────────────────────────────
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
      createEdgeMutation.mutate(
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
          onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: getGetProjectGraphQueryKey(projectId) }),
        }
      );
    },
    [setEdges, createEdgeMutation, projectId, queryClient]
  );

  // ── Delete edges ─────────────────────────────────────────────────────────────
  const onEdgesDelete = useCallback(
    (deletedEdges: Edge[]) => {
      deletedEdges.forEach((edge) => {
        deleteEdgeMutation.mutate(
          { projectId, edgeId: edge.id },
          {
            onSuccess: () =>
              queryClient.invalidateQueries({ queryKey: getGetProjectGraphQueryKey(projectId) }),
          }
        );
      });
    },
    [deleteEdgeMutation, projectId, queryClient]
  );

  const onNodeClick = (_: React.MouseEvent, node: Node) => onNodeSelect(node.id);

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-background">
        <div className="space-y-4 text-center">
          <Skeleton className="w-64 h-64 mx-auto opacity-10" />
          <p className="text-sm font-mono text-muted-foreground animate-pulse">Loading visual graph…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative bg-background">
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
        fitViewOptions={{ padding: 0.15 }}
        className="bg-background"
        minZoom={0.05}
        maxZoom={2}
        deleteKeyCode="Delete"
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#3c3c3c" />
        <Controls className="bg-sidebar border border-border" />
        <MiniMap
          nodeColor={(n) => {
            if (n.type === 'folder') return '#4fc1ff';
            if (n.type === 'file') return '#dcdcaa';
            if (n.type === 'class') return '#4ec9b0';
            return '#ce9178';
          }}
          maskColor="rgba(0,0,0,0.5)"
          className="bg-sidebar border border-border"
        />

        {/* Top-left toolbar */}
        <Panel position="top-left">
          <div className="flex items-center gap-2 bg-sidebar border border-border rounded p-1 shadow-md">
            <span className="px-3 py-1 text-xs font-semibold rounded bg-accent text-accent-foreground">
              Visual Graph
            </span>
          </div>
        </Panel>

        {/* Legend + Auto-layout */}
        <Panel position="top-right">
          <div className="flex items-center gap-3 bg-sidebar/90 backdrop-blur border border-border rounded p-2 shadow-md text-[10px] font-mono">
            <Legend color="#4fc1ff" label="Folder" />
            <Legend color="#dcdcaa" label="File" />
            <Legend color="#4ec9b0" label="Class" />
            <Legend color="#ce9178" label="Function" />
            <div className="h-3 w-px bg-border mx-1" />
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 gap-1.5 text-[10px] font-mono text-muted-foreground hover:text-foreground hover:bg-accent"
              onClick={handleAutoLayout}
              title="Auto-arrange all nodes"
            >
              <LayoutGrid className="w-3 h-3" />
              Auto-layout
            </Button>
          </div>
        </Panel>

        {/* Hints */}
        <Panel position="bottom-right">
          <div className="flex flex-col gap-0.5 text-[9px] text-muted-foreground/60 font-mono bg-sidebar/70 border border-border/50 rounded p-1.5">
            <span>Drag handle → connect nodes</span>
            <span>Select edge + Delete → remove</span>
            <span>Scroll to zoom · Drag to pan</span>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-2 h-2 rounded-full" style={{ background: color }} />
      {label}
    </div>
  );
}
