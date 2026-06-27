import { Link, useRoute } from "wouter";
import { Settings, Play, ChevronDown, Hexagon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useListProjects } from "@workspace/api-client-react";
import { useState, useRef, useEffect } from "react";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { data: projects } = useListProjects();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  const [isIde] = useRoute("/projects/:id/ide");
  const [isIdeRoot] = useRoute("/");

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const currentProject = projects?.[0];

  return (
    <div className="flex flex-col h-screen w-full bg-background text-foreground overflow-hidden">
      <header className="h-12 border-b border-border bg-sidebar flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 text-primary font-bold text-lg tracking-tight">
            <Hexagon className="w-5 h-5 fill-primary" />
            <span>VD</span>
          </Link>
          <div className="h-4 w-px bg-border mx-2" />
          <span className="text-sm font-medium text-muted-foreground hidden md:inline-block">
            Visual Data Engineering IDE
          </span>

          {/* Project selector dropdown */}
          <div className="relative ml-4" ref={dropRef}>
            <button
              className="flex items-center gap-1 hover:bg-accent hover:text-accent-foreground px-2 py-1 rounded cursor-pointer text-sm font-medium transition-colors"
              onClick={() => setShowDropdown((v) => !v)}
            >
              <span className="font-mono text-xs text-muted-foreground mr-1">PROJECT</span>
              <span>{currentProject?.name ?? "Loading..."}</span>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </button>

            {showDropdown && projects && projects.length > 0 && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-sidebar border border-border rounded shadow-lg z-50 py-1">
                {projects.map((p) => (
                  <Link
                    key={p.id}
                    href={`/projects/${p.id}/ide`}
                    className="block px-4 py-2 text-sm hover:bg-accent transition-colors truncate"
                    onClick={() => setShowDropdown(false)}
                  >
                    <span className="font-medium">{p.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">{p.nodeCount} nodes</span>
                  </Link>
                ))}
                <div className="border-t border-border mt-1 pt-1">
                  <Link
                    href="/projects"
                    className="block px-4 py-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    onClick={() => setShowDropdown(false)}
                  >
                    + Manage projects
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/projects"
            className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-accent transition-colors"
          >
            Projects
          </Link>
          {currentProject && (
            <Link
              href={`/projects/${currentProject.id}/stats`}
              className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-accent transition-colors mr-2"
            >
              Stats
            </Link>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 text-muted-foreground hover:text-foreground"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            className="h-8 gap-1.5 ml-2 bg-primary hover:bg-primary/90 text-primary-foreground"
            title="Analyze & sync pipeline"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span className="font-semibold">Run</span>
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden relative">{children}</main>
    </div>
  );
}
