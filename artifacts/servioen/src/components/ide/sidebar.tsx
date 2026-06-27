import { useListNodes } from "@workspace/api-client-react";
import { ChevronRight, ChevronDown, Folder, FileJson, FileCode2, Box, FunctionSquare, LayoutTemplate } from "lucide-react";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

type SidebarProps = {
  selectedNodeId: string | null;
  onNodeSelect: (id: string) => void;
};

export default function Sidebar({ selectedNodeId, onNodeSelect }: SidebarProps) {
  const { data: nodes, isLoading } = useListNodes(1);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-3 flex-1">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Explorer</h2>
        <Skeleton className="h-4 w-3/4 bg-border/50" />
        <Skeleton className="h-4 w-1/2 bg-border/50 ml-4" />
        <Skeleton className="h-4 w-2/3 bg-border/50 ml-4" />
        <Skeleton className="h-4 w-1/2 bg-border/50 ml-8" />
      </div>
    );
  }

  // Build tree
  const tree = nodes ? buildTree(nodes) : [];

  return (
    <div className="flex flex-col h-full border-r border-border">
      <div className="h-9 px-4 flex items-center border-b border-border shrink-0">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Explorer</h2>
      </div>
      <ScrollArea className="flex-1">
        <div className="py-2">
          {tree.map(node => (
            <TreeNode 
              key={node.id} 
              node={node} 
              depth={0} 
              expanded={expanded} 
              toggleExpand={toggleExpand}
              selectedNodeId={selectedNodeId}
              onNodeSelect={onNodeSelect}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function TreeNode({ node, depth, expanded, toggleExpand, selectedNodeId, onNodeSelect }: any) {
  const isExpanded = expanded[node.id] !== false; // default true for folders
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedNodeId === node.id;
  
  const getNodeIcon = (type: string) => {
    switch(type) {
      case 'folder': return <Folder className="w-4 h-4 text-blue-400" />;
      case 'file': return <FileCode2 className="w-4 h-4 text-yellow-400" />;
      case 'class': return <Box className="w-4 h-4 text-green-400" />;
      case 'function': return <FunctionSquare className="w-4 h-4 text-orange-400" />;
      default: return <LayoutTemplate className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div>
      <div 
        className={`flex items-center py-1 px-2 cursor-pointer text-sm hover:bg-accent transition-colors ${isSelected ? 'bg-primary/20 text-primary-foreground' : 'text-muted-foreground'}`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => onNodeSelect(node.id)}
      >
        <div className="w-4 h-4 mr-1 flex items-center justify-center shrink-0" onClick={(e) => hasChildren ? toggleExpand(node.id, e) : undefined}>
          {hasChildren ? (
            isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />
          ) : null}
        </div>
        <div className="mr-2 shrink-0">
          {getNodeIcon(node.nodeType)}
        </div>
        <span className="truncate">{node.label}</span>
      </div>
      
      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child: any) => (
            <TreeNode 
              key={child.id} 
              node={child} 
              depth={depth + 1} 
              expanded={expanded} 
              toggleExpand={toggleExpand}
              selectedNodeId={selectedNodeId}
              onNodeSelect={onNodeSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function buildTree(nodes: any[]) {
  const map = new Map();
  const roots: any[] = [];
  
  nodes.forEach(node => {
    map.set(node.id, { ...node, children: [] });
  });
  
  nodes.forEach(node => {
    if (node.parentNodeId && map.has(node.parentNodeId)) {
      map.get(node.parentNodeId).children.push(map.get(node.id));
    } else {
      roots.push(map.get(node.id));
    }
  });
  
  // Sort children by type (folder > file > class > function) then name
  const typeWeight: Record<string, number> = { folder: 0, file: 1, class: 2, function: 3 };
  
  const sortNodes = (nodes: any[]) => {
    nodes.sort((a, b) => {
      if (typeWeight[a.nodeType] !== typeWeight[b.nodeType]) {
        return typeWeight[a.nodeType] - typeWeight[b.nodeType];
      }
      return a.label.localeCompare(b.label);
    });
    nodes.forEach(node => sortNodes(node.children));
  };
  
  sortNodes(roots);
  return roots;
}