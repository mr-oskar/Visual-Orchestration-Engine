import { useState, useEffect, useCallback } from "react";
import Editor from "@monaco-editor/react";
import {
  useGetNode,
  getGetNodeQueryKey,
  useUpdateNodePosition,
  getGetProjectGraphQueryKey,
  getListNodesQueryKey,
  useDeleteNode,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Info, Code2, Save, CheckCircle2, Trash2 } from "lucide-react";

type PropsPanelProps = {
  projectId: number;
  selectedNodeId: string | null;
  onNodeDeselect?: () => void;
};

const MONACO_OPTIONS = {
  fontSize: 13,
  fontFamily: "'Cascadia Code', 'Fira Code', Consolas, 'Courier New', monospace",
  fontLigatures: true,
  minimap: { enabled: true, scale: 1 },
  lineNumbers: "on" as const,
  glyphMargin: false,
  folding: true,
  renderLineHighlight: "all" as const,
  scrollBeyondLastLine: false,
  automaticLayout: true,
  tabSize: 4,
  insertSpaces: true,
  wordWrap: "off" as const,
  bracketPairColorization: { enabled: true },
  guides: { bracketPairs: true, indentation: true },
  suggest: { preview: true },
  smoothScrolling: true,
  cursorBlinking: "smooth" as const,
  cursorSmoothCaretAnimation: "on" as const,
  formatOnPaste: true,
  formatOnType: false,
  padding: { top: 8, bottom: 8 },
  scrollbar: {
    verticalScrollbarSize: 8,
    horizontalScrollbarSize: 8,
  },
};

export default function PropertiesPanel({ projectId, selectedNodeId, onNodeDeselect }: PropsPanelProps) {
  const queryClient = useQueryClient();
  const { data: nodeData, isLoading } = useGetNode(projectId, selectedNodeId || "", {
    query: {
      enabled: !!selectedNodeId,
      queryKey: getGetNodeQueryKey(projectId, selectedNodeId || ""),
    },
  });

  const updateNode = useUpdateNodePosition();
  const deleteNodeMutation = useDeleteNode();
  const [editedCode, setEditedCode] = useState<string>("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (nodeData) {
      setEditedCode(nodeData.code || "");
      setSaved(false);
    }
  }, [nodeData]);

  const handleSaveCode = useCallback(() => {
    if (!selectedNodeId) return;
    updateNode.mutate(
      { projectId, nodeId: selectedNodeId, data: { codeContent: editedCode } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetNodeQueryKey(projectId, selectedNodeId) });
          queryClient.invalidateQueries({ queryKey: getGetProjectGraphQueryKey(projectId) });
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        },
      }
    );
  }, [selectedNodeId, editedCode, updateNode, projectId, queryClient]);

  const handleDeleteNode = useCallback(() => {
    if (!selectedNodeId) return;
    deleteNodeMutation.mutate(
      { projectId, nodeId: selectedNodeId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetProjectGraphQueryKey(projectId) });
          queryClient.invalidateQueries({ queryKey: getListNodesQueryKey(projectId) });
          onNodeDeselect?.();
        },
      }
    );
  }, [selectedNodeId, deleteNodeMutation, projectId, queryClient, onNodeDeselect]);

  if (!selectedNodeId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm p-4 text-center gap-3">
        <Info className="w-8 h-8 opacity-30" />
        <div>
          <p className="font-medium text-foreground/60">No node selected</p>
          <p className="text-xs mt-1 text-muted-foreground/70">Click any node in the explorer or canvas</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="h-10 border-b border-border p-2">
          <Skeleton className="h-6 w-32 bg-border/50" />
        </div>
        <div className="p-4 space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-4 w-full bg-border/50" />)}
        </div>
      </div>
    );
  }

  if (!nodeData) return null;

  const isDirty = editedCode !== (nodeData.code || "");

  return (
    <Tabs defaultValue="properties" className="flex flex-col h-full w-full">
      <div className="border-b border-border bg-sidebar px-2 shrink-0">
        <TabsList className="h-10 bg-transparent p-0 w-full justify-start rounded-none">
          <TabsTrigger
            value="properties"
            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-10 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground data-[state=active]:text-foreground"
          >
            Properties
          </TabsTrigger>
          <TabsTrigger
            value="code"
            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-10 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground data-[state=active]:text-foreground flex items-center gap-2"
          >
            <Code2 className="w-3.5 h-3.5" />
            Code
            {isDirty && <span className="w-1.5 h-1.5 rounded-full bg-[#ce9178]" />}
          </TabsTrigger>
        </TabsList>
      </div>

      {/* Properties Tab */}
      <TabsContent value="properties" className="flex-1 overflow-hidden m-0 outline-none">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-5">
            {/* Node Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold text-foreground text-base truncate">{nodeData.node.label}</h3>
                <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">{nodeData.metadata.definedIn}</p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-card border-border">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete "{nodeData.node.label}"?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will delete the node and all its children (nested files, classes, functions) and connected edges. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteNode}
                      className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            {/* Type Badge */}
            <div className="flex items-center gap-2">
              <NodeTypeBadge type={nodeData.node.nodeType} />
              {nodeData.node.lineNumber && (
                <span className="text-[10px] font-mono text-muted-foreground">Line {nodeData.node.lineNumber}</span>
              )}
            </div>

            {/* Properties Grid */}
            <div className="space-y-3">
              <SectionHeader>Details</SectionHeader>
              <PropertyRow label="Inputs" value={nodeData.metadata.inputs} />
              <PropertyRow label="Outputs" value={nodeData.metadata.outputs} />
              <PropertyRow label="Complexity" value={nodeData.metadata.complexity} />
              <PropertyRow label="Last Modified" value={nodeData.metadata.lastModified} />
            </div>

            {/* Data Types */}
            {((nodeData.node.inputTypes ?? []).length > 0 || (nodeData.node.outputTypes ?? []).length > 0) && (
              <div className="space-y-3">
                <SectionHeader>Data Types</SectionHeader>
                {(nodeData.node.inputTypes ?? []).length > 0 && (
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1.5">Inputs</span>
                    <div className="flex flex-wrap gap-1">
                      {(nodeData.node.inputTypes ?? []).map((t: string) => (
                        <TypeBadge key={t} label={t} color="blue" />
                      ))}
                    </div>
                  </div>
                )}
                {(nodeData.node.outputTypes ?? []).length > 0 && (
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1.5">Outputs</span>
                    <div className="flex flex-wrap gap-1">
                      {(nodeData.node.outputTypes ?? []).map((t: string) => (
                        <TypeBadge key={t} label={t} color="purple" />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Position */}
            <div className="space-y-2">
              <SectionHeader>Canvas Position</SectionHeader>
              <div className="grid grid-cols-2 gap-3">
                <PositionBox label="X" value={nodeData.node.positionX.toFixed(0)} />
                <PositionBox label="Y" value={nodeData.node.positionY.toFixed(0)} />
                <PositionBox label="W" value={nodeData.node.width.toFixed(0)} />
                <PositionBox label="H" value={nodeData.node.height.toFixed(0)} />
              </div>
            </div>
          </div>
        </ScrollArea>
      </TabsContent>

      {/* Code Tab — Monaco Editor */}
      <TabsContent value="code" className="flex-1 overflow-hidden m-0 outline-none bg-[#1e1e1e] flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#3c3c3c] bg-[#252526] shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] font-mono text-[#858585] truncate">{nodeData.metadata.definedIn}</span>
            {isDirty && <span className="text-[10px] text-[#ce9178]">● unsaved</span>}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[10px] text-[#858585] mr-2">Python</span>
            <Button
              size="sm"
              variant={saved ? "outline" : "default"}
              className="h-6 px-2 text-[10px] gap-1 border-[#3c3c3c]"
              onClick={handleSaveCode}
              disabled={!isDirty || updateNode.isPending}
            >
              {saved ? (
                <><CheckCircle2 className="w-3 h-3 text-green-400" /> Saved</>
              ) : (
                <><Save className="w-3 h-3" /> Save</>
              )}
            </Button>
          </div>
        </div>

        {/* Monaco Editor */}
        <div className="flex-1 overflow-hidden">
          <Editor
            height="100%"
            defaultLanguage="python"
            theme="vs-dark"
            value={editedCode}
            onChange={(val) => { setEditedCode(val ?? ""); setSaved(false); }}
            options={MONACO_OPTIONS}
            onMount={(editor, monaco) => {
              // Ctrl+S / Cmd+S to save
              editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
                handleSaveCode();
              });
              // Focus the editor
              editor.focus();
            }}
          />
        </div>
      </TabsContent>
    </Tabs>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 border-b border-border pb-1">
      {children}
    </h4>
  );
}

function PropertyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className="text-xs font-medium text-right text-foreground/80">{value || "—"}</span>
    </div>
  );
}

function PositionBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-background rounded p-2 border border-border">
      <span className="text-[10px] text-muted-foreground block mb-0.5">{label}</span>
      <span className="font-mono text-xs">{value}</span>
    </div>
  );
}

function NodeTypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    folder: "bg-[#4fc1ff]/10 text-[#4fc1ff] border-[#4fc1ff]/30",
    file: "bg-[#dcdcaa]/10 text-[#dcdcaa] border-[#dcdcaa]/30",
    class: "bg-[#4ec9b0]/10 text-[#4ec9b0] border-[#4ec9b0]/30",
    function: "bg-[#ce9178]/10 text-[#ce9178] border-[#ce9178]/30",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase border ${styles[type] ?? "bg-border text-foreground border-border"}`}>
      {type}
    </span>
  );
}

function TypeBadge({ label, color }: { label: string; color: "blue" | "purple" }) {
  const style = color === "blue"
    ? "bg-[#569cd6]/15 text-[#569cd6] border-[#569cd6]/30"
    : "bg-[#c586c0]/15 text-[#c586c0] border-[#c586c0]/30";
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${style}`}>{label}</span>
  );
}
