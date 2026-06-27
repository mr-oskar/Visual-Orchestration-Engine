import { useListNodes, useGetProjectActivity } from "@workspace/api-client-react";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FileCode2,
  Box,
  FunctionSquare,
  LayoutTemplate,
  Search,
  Activity,
  Clock,
} from "lucide-react";
import { useState, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type SidebarProps = {
  projectId: number;
  selectedNodeId: string | null;
  onNodeSelect: (id: string) => void;
};

const EVENT_ICONS: Record<string, string> = {
  edge_created: "🔗",
  edge_deleted: "✂️",
  code_edited: "✏️",
  node_moved: "↕️",
  node_selected: "👆",
};

export default function Sidebar({ projectId, selectedNodeId, onNodeSelect }: SidebarProps) {
  const { data: nodes, isLoading } = useListNodes(projectId);
  const { data: activity } = useGetProjectActivity(projectId);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredNodes = useMemo(() => {
    if (!nodes) return [];
    if (!search.trim()) return nodes;
    return nodes.filter((n) =>
      n.label.toLowerCase().includes(search.toLowerCase()) ||
      n.filePath.toLowerCase().includes(search.toLowerCase())
    );
  }, [nodes, search]);

  const tree = useMemo(
    () => (search.trim() ? filteredNodes : buildTree(filteredNodes)),
    [filteredNodes, search]
  );

  return (
    <div className="flex flex-col h-full border-r border-border">
      <Tabs defaultValue="explorer" className="flex flex-col h-full">
        <div className="shrink-0 border-b border-border bg-sidebar">
          <TabsList className="h-9 bg-transparent p-0 w-full justify-start rounded-none border-b border-border">
            <TabsTrigger
              value="explorer"
              className="h-9 px-4 text-xs font-semibold uppercase tracking-wider data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none text-muted-foreground data-[state=active]:text-foreground"
            >
              Explorer
            </TabsTrigger>
            <TabsTrigger
              value="activity"
              className="h-9 px-4 text-xs font-semibold uppercase tracking-wider data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none text-muted-foreground data-[state=active]:text-foreground flex items-center gap-1.5"
            >
              <Activity className="w-3 h-3" />
              Activity
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="explorer" className="flex-1 overflow-hidden m-0 flex flex-col">
          <div className="px-2 py-2 border-b border-border shrink-0">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search nodes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-7 pl-7 text-xs bg-background border-border focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="p-4 space-y-3">
                <Skeleton className="h-4 w-3/4 bg-border/50" />
                <Skeleton className="h-4 w-1/2 bg-border/50 ml-4" />
                <Skeleton className="h-4 w-2/3 bg-border/50 ml-4" />
                <Skeleton className="h-4 w-1/2 bg-border/50 ml-8" />
              </div>
            ) : search.trim() ? (
              <div className="py-1">
                {filteredNodes.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">No results</p>
                ) : (
                  filteredNodes.map((node) => (
                    <FlatNode
                      key={node.id}
                      node={node}
                      selectedNodeId={selectedNodeId}
                      onNodeSelect={onNodeSelect}
                    />
                  ))
                )}
              </div>
            ) : (
              <div className="py-2">
                {(tree as any[]).map((node) => (
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
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="activity" className="flex-1 overflow-hidden m-0">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-2">
              {!activity || activity.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-xs">
                  <Clock className="w-6 h-6 mx-auto mb-2 opacity-40" />
                  <p>No activity yet</p>
                </div>
              ) : (
                [...activity].reverse().map((event) => (
                  <div key={event.id} className="flex gap-2 text-xs py-1.5 border-b border-border/50 last:border-0">
                    <span className="shrink-0 mt-0.5">
                      {EVENT_ICONS[event.eventType] ?? "📌"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground/80 truncate">{event.description}</p>
                      <p className="text-muted-foreground/60 font-mono mt-0.5">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function FlatNode({ node, selectedNodeId, onNodeSelect }: any) {
  const isSelected = selectedNodeId === node.id;
  return (
    <div
      className={`flex items-center py-1 px-3 cursor-pointer text-sm hover:bg-accent transition-colors ${isSelected ? "bg-primary/20 text-primary-foreground" : "text-muted-foreground"}`}
      onClick={() => onNodeSelect(node.id)}
    >
      <div className="mr-2 shrink-0">{getNodeIcon(node.nodeType)}</div>
      <div className="flex-1 min-w-0">
        <span className="truncate block">{node.label}</span>
        <span className="text-[10px] text-muted-foreground/60 truncate block font-mono">{node.filePath}</span>
      </div>
    </div>
  );
}

function TreeNode({ node, depth, expanded, toggleExpand, selectedNodeId, onNodeSelect }: any) {
  const isExpanded = expanded[node.id] !== false;
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedNodeId === node.id;

  return (
    <div>
      <div
        className={`flex items-center py-1 px-2 cursor-pointer text-sm hover:bg-accent transition-colors ${isSelected ? "bg-primary/20 text-primary-foreground" : "text-muted-foreground"}`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => onNodeSelect(node.id)}
      >
        <div
          className="w-4 h-4 mr-1 flex items-center justify-center shrink-0"
          onClick={(e) => (hasChildren ? toggleExpand(node.id, e) : undefined)}
        >
          {hasChildren ? (
            isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />
          ) : null}
        </div>
        <div className="mr-2 shrink-0">{getNodeIcon(node.nodeType)}</div>
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

function getNodeIcon(type: string) {
  switch (type) {
    case "folder": return <Folder className="w-4 h-4 text-blue-400" />;
    case "file": return <FileCode2 className="w-4 h-4 text-yellow-400" />;
    case "class": return <Box className="w-4 h-4 text-green-400" />;
    case "function": return <FunctionSquare className="w-4 h-4 text-orange-400" />;
    default: return <LayoutTemplate className="w-4 h-4 text-muted-foreground" />;
  }
}

function buildTree(nodes: any[]) {
  const map = new Map();
  const roots: any[] = [];

  nodes.forEach((node) => map.set(node.id, { ...node, children: [] }));
  nodes.forEach((node) => {
    if (node.parentNodeId && map.has(node.parentNodeId)) {
      map.get(node.parentNodeId).children.push(map.get(node.id));
    } else {
      roots.push(map.get(node.id));
    }
  });

  const typeWeight: Record<string, number> = { folder: 0, file: 1, class: 2, function: 3 };
  const sortNodes = (ns: any[]) => {
    ns.sort((a, b) => {
      if (typeWeight[a.nodeType] !== typeWeight[b.nodeType])
        return typeWeight[a.nodeType] - typeWeight[b.nodeType];
      return a.label.localeCompare(b.label);
    });
    ns.forEach((n) => sortNodes(n.children));
  };
  sortNodes(roots);
  return roots;
}
