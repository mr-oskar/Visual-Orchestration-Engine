import { useGetNode, getGetNodeQueryKey } from "@workspace/api-client-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Info, Code2 } from "lucide-react";

export default function PropertiesPanel({ selectedNodeId }: { selectedNodeId: string | null }) {
  const { data: nodeData, isLoading } = useGetNode(1, selectedNodeId || "", {
    query: {
      enabled: !!selectedNodeId,
      queryKey: getGetNodeQueryKey(1, selectedNodeId || "")
    }
  });

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
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Position</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-background rounded p-2 border border-border">
                  <span className="text-xs text-muted-foreground block mb-1">X Coordinate</span>
                  <span className="font-mono text-sm">{nodeData.node.positionX.toFixed(0)}</span>
                </div>
                <div className="bg-background rounded p-2 border border-border">
                  <span className="text-xs text-muted-foreground block mb-1">Y Coordinate</span>
                  <span className="font-mono text-sm">{nodeData.node.positionY.toFixed(0)}</span>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </TabsContent>

      <TabsContent value="code" className="flex-1 overflow-hidden m-0 outline-none bg-background">
        <ScrollArea className="h-full">
          <div className="relative">
            <div className="absolute top-0 left-0 w-12 h-full bg-sidebar border-r border-border pointer-events-none"></div>
            <pre className="p-4 pl-14 text-sm font-mono text-foreground leading-relaxed overflow-x-auto">
              <code className="block" style={{ whiteSpace: 'pre-wrap' }}>
                {nodeData.code || "# Source code not available"}
              </code>
            </pre>
          </div>
        </ScrollArea>
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