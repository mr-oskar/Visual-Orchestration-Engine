import { useEffect, useMemo, useState } from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  MiniMap, 
  useNodesState, 
  useEdgesState,
  MarkerType,
  BackgroundVariant
} from '@xyflow/react';
import { useGetProjectGraph, getGetProjectGraphQueryKey } from '@workspace/api-client-react';
import { Skeleton } from '@/components/ui/skeleton';
import { nodeTypes } from './custom-nodes';

type CanvasProps = {
  selectedNodeId: string | null;
  onNodeSelect: (id: string) => void;
};

export default function Canvas({ selectedNodeId, onNodeSelect }: CanvasProps) {
  const { data: graphData, isLoading } = useGetProjectGraph(1, { 
    query: { queryKey: getGetProjectGraphQueryKey(1) } 
  });
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    if (graphData) {
      // Map API data to React Flow format
      const rfNodes = graphData.nodes.map(n => ({
        id: n.id,
        type: n.nodeType,
        position: { x: n.positionX, y: n.positionY },
        style: { width: n.width, height: n.height },
        data: { ...n },
        parentId: n.parentNodeId || undefined,
        extent: n.parentNodeId ? 'parent' : undefined,
        selected: selectedNodeId === n.id,
      }));

      const rfEdges = graphData.edges.map(e => ({
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

  const onNodeClick = (_: any, node: any) => {
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
        <button className="px-3 py-1 text-xs font-semibold rounded bg-accent text-accent-foreground">Visual Graph</button>
        <button className="px-3 py-1 text-xs font-semibold rounded text-muted-foreground hover:bg-accent/50">Code</button>
      </div>

      <div className="absolute top-4 right-4 z-10 flex items-center gap-3 bg-sidebar/80 backdrop-blur border border-border rounded p-2 shadow-md text-[10px] font-mono">
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#4fc1ff]"></div>Folder</div>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#dcdcaa]"></div>File</div>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#4ec9b0]"></div>Class</div>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#ce9178]"></div>Function</div>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        className="bg-background"
        minZoom={0.1}
        maxZoom={1.5}
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
    'DataFrame': '#4fc1ff',
    'Series': '#4ec9b0',
    'Dict': '#dcdcaa',
    'List': '#ce9178',
  };
  return colors[dataType] || '#858585';
}