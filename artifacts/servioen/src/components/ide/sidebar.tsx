import {
  useListNodes,
  useGetProjectActivity,
  useCreateNode,
  getListNodesQueryKey,
  getGetProjectGraphQueryKey,
} from "@workspace/api-client-react";
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
  FolderPlus,
  FilePlus,
  Plus,
  Trash2,
} from "lucide-react";
import { useState, useMemo, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// ─── Types ──────────────────────────────────────────────────────────────────────
type AnyNode = {
  id: string;
  nodeType: string;
  label: string;
  filePath: string;
  parentNodeId?: string | null;
};

type TreeNodeData = AnyNode & { children: TreeNodeData[] };

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
  node_created: "✨",
  node_deleted: "🗑️",
};

const NODE_TYPE_OPTIONS = [
  { value: "folder", label: "Folder", icon: "📁" },
  { value: "file", label: "Python File (.py)", icon: "🐍" },
  { value: "class", label: "Class", icon: "📦" },
  { value: "function", label: "Function / Method", icon: "⚡" },
];

// ─── Main Component ──────────────────────────────────────────────────────────
export default function Sidebar({ projectId, selectedNodeId, onNodeSelect }: SidebarProps) {
  const queryClient = useQueryClient();
  const { data: nodes, isLoading } = useListNodes(projectId);
  const { data: activity } = useGetProjectActivity(projectId);
  const createNode = useCreateNode();

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");

  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    nodeType: "file",
    label: "",
    parentNodeId: "",
  });

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredNodes = useMemo(() => {
    if (!nodes) return [];
    if (!search.trim()) return nodes;
    return nodes.filter(
      (n) =>
        n.label.toLowerCase().includes(search.toLowerCase()) ||
        n.filePath.toLowerCase().includes(search.toLowerCase())
    );
  }, [nodes, search]);

  const tree = useMemo(
    () => (search.trim() ? [] : buildTree(filteredNodes)),
    [filteredNodes, search]
  );

  const openCreate = (parentId?: string, nodeType?: string) => {
    setCreateForm({
      nodeType: nodeType ?? "file",
      label: "",
      parentNodeId: parentId ?? "",
    });
    setCreateOpen(true);
  };

  const handleCreate = () => {
    if (!createForm.label.trim()) return;

    const suffix = createForm.nodeType === "file" ? ".py" : "";
    const label = createForm.label.trim() + (createForm.nodeType === "file" && !createForm.label.endsWith(".py") ? suffix : "");
    const filePath = createForm.parentNodeId
      ? `${nodes?.find((n) => n.id === createForm.parentNodeId)?.filePath ?? ""}/${label}`
      : label;

    createNode.mutate(
      {
        projectId,
        data: {
          nodeType: createForm.nodeType,
          label,
          filePath,
          parentNodeId: createForm.parentNodeId || null,
        },
      },
      {
        onSuccess: (newNode) => {
          queryClient.invalidateQueries({ queryKey: getListNodesQueryKey(projectId) });
          queryClient.invalidateQueries({ queryKey: getGetProjectGraphQueryKey(projectId) });
          setCreateOpen(false);
          // Auto-select and expand parent
          if (createForm.parentNodeId) {
            setExpanded((prev) => ({ ...prev, [createForm.parentNodeId]: true }));
          }
          onNodeSelect(newNode.id);
        },
      }
    );
  };

  return (
    <div className="flex flex-col h-full border-r border-border">
      <Tabs defaultValue="explorer" className="flex flex-col h-full">
        {/* Tab bar */}
        <div className="shrink-0 border-b border-border bg-sidebar">
          <TabsList className="h-9 bg-transparent p-0 w-full justify-start rounded-none">
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

        {/* Explorer Tab */}
        <TabsContent value="explorer" className="flex-1 overflow-hidden m-0 flex flex-col">
          {/* Search + Add button row */}
          <div className="px-2 py-2 border-b border-border shrink-0 flex items-center gap-1.5">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search nodes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-7 pl-7 text-xs bg-background border-border focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>

            {/* New node dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground" title="Add node">
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card border-border w-48">
                <DropdownMenuItem onClick={() => openCreate(undefined, "folder")} className="gap-2 text-xs">
                  <FolderPlus className="w-3.5 h-3.5 text-[#4fc1ff]" /> New Folder
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openCreate(undefined, "file")} className="gap-2 text-xs">
                  <FilePlus className="w-3.5 h-3.5 text-[#dcdcaa]" /> New Python File
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => openCreate(undefined, "class")} className="gap-2 text-xs">
                  <Box className="w-3.5 h-3.5 text-[#4ec9b0]" /> New Class
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openCreate(undefined, "function")} className="gap-2 text-xs">
                  <FunctionSquare className="w-3.5 h-3.5 text-[#ce9178]" /> New Function
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Tree / search results */}
          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-4 bg-border/50" style={{ width: `${60 + i * 8}%`, marginLeft: i > 1 ? "1rem" : 0 }} />
                ))}
              </div>
            ) : search.trim() ? (
              <div className="py-1">
                {filteredNodes.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">No results for "{search}"</p>
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
              <div className="py-1">
                {tree.length === 0 ? (
                  <div className="text-center py-8 px-4">
                    <p className="text-xs text-muted-foreground mb-3">No nodes yet</p>
                    <Button size="sm" variant="outline" className="text-xs gap-1.5 h-7" onClick={() => openCreate()}>
                      <Plus className="w-3 h-3" /> Create first node
                    </Button>
                  </div>
                ) : (
                  tree.map((node) => (
                    <TreeNode
                      key={node.id}
                      node={node as TreeNodeData}
                      depth={0}
                      expanded={expanded}
                      toggleExpand={toggleExpand}
                      selectedNodeId={selectedNodeId}
                      onNodeSelect={onNodeSelect}
                      onCreateChild={openCreate}
                    />
                  ))
                )}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="flex-1 overflow-hidden m-0">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-1">
              {!activity || activity.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-xs">
                  <Clock className="w-6 h-6 mx-auto mb-2 opacity-40" />
                  <p>No activity yet</p>
                </div>
              ) : (
                [...activity].reverse().map((event) => (
                  <div key={event.id} className="flex gap-2 text-xs py-2 border-b border-border/40 last:border-0">
                    <span className="shrink-0 mt-0.5">{EVENT_ICONS[event.eventType] ?? "📌"}</span>
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

      {/* Create Node Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-card border-border sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-sm">Add New Node</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label className="text-xs">Type</Label>
              <Select
                value={createForm.nodeType}
                onValueChange={(v) => setCreateForm((f) => ({ ...f, nodeType: v }))}
              >
                <SelectTrigger className="h-8 text-xs bg-input border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {NODE_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                      {opt.icon} {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label className="text-xs">Name</Label>
              <NameInput
                nodeType={createForm.nodeType}
                value={createForm.label}
                onChange={(v) => setCreateForm((f) => ({ ...f, label: v }))}
                onEnter={handleCreate}
              />
            </div>

            {nodes && nodes.length > 0 && (
              <div className="grid gap-2">
                <Label className="text-xs">Parent node <span className="text-muted-foreground">(optional)</span></Label>
                <Select
                  value={createForm.parentNodeId || "__none__"}
                  onValueChange={(v) => setCreateForm((f) => ({ ...f, parentNodeId: v === "__none__" ? "" : v }))}
                >
                  <SelectTrigger className="h-8 text-xs bg-input border-border">
                    <SelectValue placeholder="None (top-level)" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border max-h-48 overflow-y-auto">
                    <SelectItem value="__none__" className="text-xs text-muted-foreground">None (top-level)</SelectItem>
                    {(nodes ?? [])
                      .filter((n) => ["folder", "file", "class"].includes(n.nodeType))
                      .map((n) => (
                        <SelectItem key={n.id} value={n.id} className="text-xs">
                          {getNodeIconStr(n.nodeType)} {n.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" className="text-xs" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="text-xs"
              onClick={handleCreate}
              disabled={!createForm.label.trim() || createNode.isPending}
            >
              {createNode.isPending ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Tree Node ────────────────────────────────────────────────────────────────
function TreeNode({
  node,
  depth,
  expanded,
  toggleExpand,
  selectedNodeId,
  onNodeSelect,
  onCreateChild,
}: {
  node: TreeNodeData;
  depth: number;
  expanded: Record<string, boolean>;
  toggleExpand: (id: string, e: React.MouseEvent) => void;
  selectedNodeId: string | null;
  onNodeSelect: (id: string) => void;
  onCreateChild: (parentId: string, nodeType?: string) => void;
}) {
  const isExpanded = expanded[node.id] !== false;
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedNodeId === node.id;
  const isContainer = ["folder", "file", "class"].includes(node.nodeType);

  return (
    <div>
      <div
        className={`group flex items-center py-0.5 px-2 cursor-pointer text-sm hover:bg-accent transition-colors ${
          isSelected ? "bg-primary/20 text-foreground" : "text-muted-foreground"
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => onNodeSelect(node.id)}
      >
        <div
          className="w-4 h-4 mr-1 flex items-center justify-center shrink-0"
          onClick={(e) => hasChildren ? toggleExpand(node.id, e) : undefined}
        >
          {hasChildren ? (
            isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />
          ) : (
            <div className="w-1 h-1 rounded-full bg-muted-foreground/30 mx-auto" />
          )}
        </div>
        <div className="mr-2 shrink-0">{getNodeIcon(node.nodeType)}</div>
        <span className="truncate flex-1">{node.label}</span>

        {/* Inline add button (visible on hover for container nodes) */}
        {isContainer && (
          <button
            className="opacity-0 group-hover:opacity-100 w-4 h-4 ml-1 flex items-center justify-center rounded hover:bg-primary/20 transition-all shrink-0"
            title={`Add inside ${node.label}`}
            onClick={(e) => { e.stopPropagation(); onCreateChild(node.id); }}
          >
            <Plus className="w-2.5 h-2.5" />
          </button>
        )}
      </div>

      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              toggleExpand={toggleExpand}
              selectedNodeId={selectedNodeId}
              onNodeSelect={onNodeSelect}
              onCreateChild={onCreateChild}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Flat search result node ──────────────────────────────────────────────────
function FlatNode({
  node,
  selectedNodeId,
  onNodeSelect,
}: {
  node: AnyNode;
  selectedNodeId: string | null;
  onNodeSelect: (id: string) => void;
}) {
  const isSelected = selectedNodeId === node.id;
  return (
    <div
      className={`flex items-center py-1 px-3 cursor-pointer text-sm hover:bg-accent transition-colors ${
        isSelected ? "bg-primary/20 text-foreground" : "text-muted-foreground"
      }`}
      onClick={() => onNodeSelect(node.id)}
    >
      <div className="mr-2 shrink-0">{getNodeIcon(node.nodeType)}</div>
      <div className="flex-1 min-w-0">
        <span className="truncate block text-xs">{node.label}</span>
        <span className="text-[10px] text-muted-foreground/60 truncate block font-mono">{node.filePath}</span>
      </div>
    </div>
  );
}

// ─── Name input with suffix preview ──────────────────────────────────────────
function NameInput({
  nodeType,
  value,
  onChange,
  onEnter,
}: {
  nodeType: string;
  value: string;
  onChange: (v: string) => void;
  onEnter: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);

  const suffix = nodeType === "file" && value && !value.endsWith(".py") ? ".py" : "";
  const placeholder: Record<string, string> = {
    folder: "e.g. transforms",
    file: "e.g. pipeline",
    class: "e.g. DataProcessor",
    function: "e.g. extract_data",
  };

  return (
    <div className="relative">
      <Input
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onEnter()}
        placeholder={placeholder[nodeType] ?? "Name"}
        className="h-8 text-xs bg-input border-border pr-12 font-mono"
      />
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-mono">
          {suffix}
        </span>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getNodeIcon(type: string) {
  switch (type) {
    case "folder": return <Folder className="w-4 h-4 text-blue-400" />;
    case "file": return <FileCode2 className="w-4 h-4 text-yellow-400" />;
    case "class": return <Box className="w-4 h-4 text-green-400" />;
    case "function": return <FunctionSquare className="w-4 h-4 text-orange-400" />;
    default: return <LayoutTemplate className="w-4 h-4 text-muted-foreground" />;
  }
}

function getNodeIconStr(type: string) {
  return { folder: "📁", file: "🐍", class: "📦", function: "⚡" }[type] ?? "•";
}

function buildTree(nodes: AnyNode[]): TreeNodeData[] {
  const map = new Map<string, TreeNodeData>();
  const roots: TreeNodeData[] = [];

  nodes.forEach((node) => map.set(node.id, { ...node, children: [] }));
  nodes.forEach((node) => {
    if (node.parentNodeId && map.has(node.parentNodeId)) {
      map.get(node.parentNodeId)!.children.push(map.get(node.id)!);
    } else {
      roots.push(map.get(node.id)!);
    }
  });

  const typeWeight: Record<string, number> = { folder: 0, file: 1, class: 2, function: 3 };
  const sortNodes = (ns: TreeNodeData[]) => {
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
