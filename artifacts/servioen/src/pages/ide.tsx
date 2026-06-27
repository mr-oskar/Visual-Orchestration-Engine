import { useState } from "react";
import Sidebar from "@/components/ide/sidebar";
import Canvas from "@/components/ide/canvas";
import PropertiesPanel from "@/components/ide/properties";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";

export default function IDE() {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full w-full rounded-none border-none">
      <ResizablePanel defaultSize={20} minSize={15} maxSize={30} className="bg-sidebar flex flex-col">
        <Sidebar selectedNodeId={selectedNodeId} onNodeSelect={setSelectedNodeId} />
      </ResizablePanel>
      
      <ResizableHandle className="w-1 bg-border hover:bg-primary/50 transition-colors" />
      
      <ResizablePanel defaultSize={55} className="bg-background relative">
        <Canvas selectedNodeId={selectedNodeId} onNodeSelect={setSelectedNodeId} />
      </ResizablePanel>
      
      <ResizableHandle className="w-1 bg-border hover:bg-primary/50 transition-colors" />
      
      <ResizablePanel defaultSize={25} minSize={20} maxSize={40} className="bg-sidebar flex flex-col">
        <PropertiesPanel selectedNodeId={selectedNodeId} />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}