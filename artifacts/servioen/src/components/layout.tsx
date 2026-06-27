import { Link } from "wouter";
import { Settings, Play, ChevronDown, Moon, Hexagon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen w-full bg-background text-foreground overflow-hidden">
      <header className="h-12 border-b border-border bg-sidebar flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 text-primary font-bold text-lg tracking-tight">
            <Hexagon className="w-5 h-5 fill-primary" />
            <span>VD</span>
          </Link>
          <div className="h-4 w-px bg-border mx-2"></div>
          <span className="text-sm font-medium text-muted-foreground hidden md:inline-block">Visual Data Engineering IDE</span>
          <div className="flex items-center gap-1 hover:bg-accent hover:text-accent-foreground px-2 py-1 rounded cursor-pointer text-sm font-medium ml-4 transition-colors">
            <span>RETAIL_ANALYTICS</span>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Link href="/projects" className="text-xs text-muted-foreground hover:text-foreground mr-4">Projects</Link>
          <Link href="/projects/1/stats" className="text-xs text-muted-foreground hover:text-foreground mr-4">Stats</Link>
          
          <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-foreground">
            <Moon className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-foreground">
            <Settings className="w-4 h-4" />
          </Button>
          <Button size="sm" className="h-8 gap-1.5 ml-2 bg-primary hover:bg-primary/90 text-primary-foreground">
            <Play className="w-3.5 h-3.5 fill-current" />
            <span className="font-semibold">Run</span>
          </Button>
        </div>
      </header>
      
      <main className="flex-1 overflow-hidden relative">
        {children}
      </main>
    </div>
  );
}