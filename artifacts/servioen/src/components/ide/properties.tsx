import { useState, useEffect } from "react";
import {
  useGetNode,
  getGetNodeQueryKey,
  useUpdateNodePosition,
  getGetProjectGraphQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Info, Code2, Save, CheckCircle2 } from "lucide-react";

type PropsPanelProps = {
  projectId: number;
  selectedNodeId: string | null;
};

export default function PropertiesPanel({ projectId, selectedNodeId }: PropsPanelProps) {
  const queryClient = useQueryClient();
  const { data: nodeData, isLoading } = useGetNode(projectId, selectedNodeId || "", {
    query: {
      enabled: !!selectedNodeId,
      queryKey: getGetNodeQueryKey(projectId, selectedNodeId || ""),
    },
  });

  const updateNode = useUpdateNodePosition();
  const [editedCode, setEditedCode] = useState<string>("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (nodeData) {
      setEditedCode(nodeData.code || "");
      setSaved(false);
    }
  }, [nodeData]);

  const handleSaveCode = () => {
    if (!selectedNodeId) return;
    updateNode.mutate(
      {
        projectId,
        nodeId: selectedNodeId,
        data: { codeContent: editedCode },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetNodeQueryKey(projectId, selectedNodeId) });
          queryClient.invalidateQueries({ queryKey: getGetProjectGraphQueryKey(projectId) });
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        },
      }
    );
  };

  if (!selectedNodeId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm p-4 text-center">
        <Info className="w-8 h-8 mb-2 opacity-50" />
        <p>Select a node to view its properties and source code.</p>
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
          <Skeleton className="h-4 w-full bg-border/50" />
          <Skeleton className="h-4 w-3/4 bg-border/50" />
          <Skeleton className="h-4 w-5/6 bg-border/50" />
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
            {isDirty && <span className="w-1.5 h-1.5 rounded-full bg-[#ce9178] ml-1" />}
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="properties" className="flex-1 overflow-hidden m-0 outline-none">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-6">
            <div className="space-y-1">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <span className="text-lg">{nodeData.node.label}</span>
              </h3>
              <p className="text-xs text-muted-foreground font-mono">{nodeData.metadata.definedIn}</p>
            </div>

            <div className="space-y-3">
              <PropertyRow label="Type" value={nodeData.metadata.type} />
              <PropertyRow label="Inputs" value={nodeData.metadata.inputs} />
              <PropertyRow label="Outputs" value={nodeData.metadata.outputs} />
              {nodeData.metadata.usedBy && (
                <PropertyRow label="Used By" value={nodeData.metadata.usedBy} />
              )}
              <PropertyRow label="Complexity" value={nodeData.metadata.complexity} />
              <PropertyRow label="Last Modified" value={nodeData.metadata.lastModified} />
            </div>

            <div className="pt-4 border-t border-border">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Position
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-background rounded p-2 border border-border">
                  <span className="text-xs text-muted-foreground block mb-1">X</span>
                  <span className="font-mono text-sm">{nodeData.node.positionX.toFixed(0)}</span>
                </div>
                <div className="bg-background rounded p-2 border border-border">
                  <span className="text-xs text-muted-foreground block mb-1">Y</span>
                  <span className="font-mono text-sm">{nodeData.node.positionY.toFixed(0)}</span>
                </div>
              </div>
            </div>

            {((nodeData.node.inputTypes ?? []).length > 0 || (nodeData.node.outputTypes ?? []).length > 0) && (
              <div className="pt-4 border-t border-border">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Data Types
                </h4>
                {(nodeData.node.inputTypes ?? []).length > 0 && (
                  <div className="mb-2">
                    <span className="text-xs text-muted-foreground block mb-1">Inputs</span>
                    <div className="flex flex-wrap gap-1">
                      {(nodeData.node.inputTypes ?? []).map((t: string) => (
                        <span key={t} className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#569cd6]/20 text-[#569cd6] border border-[#569cd6]/30">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {(nodeData.node.outputTypes ?? []).length > 0 && (
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">Outputs</span>
                    <div className="flex flex-wrap gap-1">
                      {(nodeData.node.outputTypes ?? []).map((t: string) => (
                        <span key={t} className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#c586c0]/20 text-[#c586c0] border border-[#c586c0]/30">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </TabsContent>

      <TabsContent value="code" className="flex-1 overflow-hidden m-0 outline-none bg-background flex flex-col">
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-sidebar shrink-0">
          <span className="text-[10px] font-mono text-muted-foreground">{nodeData.metadata.definedIn}</span>
          <Button
            size="sm"
            variant={saved ? "outline" : "default"}
            className="h-6 px-2 text-[10px] gap-1"
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
        <div className="flex-1 overflow-hidden relative">
          <div className="absolute top-0 left-0 w-10 h-full bg-sidebar border-r border-border pointer-events-none z-10 flex flex-col pt-2">
            {editedCode.split('\n').map((_, i) => (
              <div key={i} className="text-[10px] font-mono text-muted-foreground/50 text-right pr-2 leading-5">
                {i + 1}
              </div>
            ))}
          </div>
          <textarea
            className="w-full h-full resize-none bg-background text-foreground font-mono text-sm leading-5 pl-12 pr-4 pt-2 outline-none border-none focus:ring-0 caret-primary"
            value={editedCode}
            onChange={(e) => { setEditedCode(e.target.value); setSaved(false); }}
            spellCheck={false}
            style={{ fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', monospace" }}
          />
        </div>
      </TabsContent>
    </Tabs>
  );
}

function PropertyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-muted-foreground mb-1">{label}</span>
      <span className="text-sm font-medium">{value || "—"}</span>
    </div>
  );
}
