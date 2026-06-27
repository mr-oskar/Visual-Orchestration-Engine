import { useListProjects, useCreateProject } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Plus, BarChart2, Calendar, GitFork, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function Projects() {
  const { data: projects, isLoading } = useListProjects();
  const createProject = useCreateProject();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", description: "", language: "Python" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createProject.mutate(
      { data: formData },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
          setOpen(false);
          setFormData({ name: "", description: "", language: "Python" });
          toast({ title: "Project created", description: "Successfully created new project." });
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to create project.", variant: "destructive" });
        }
      }
    );
  };

  return (
    <div className="min-h-full w-full bg-background p-8 overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Projects</h1>
            <p className="text-muted-foreground mt-1">Manage your visual data engineering pipelines.</p>
          </div>
          
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-card border-border">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>Create New Project</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Name</Label>
                    <Input 
                      id="name" 
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="bg-input border-border" 
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea 
                      id="description" 
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="bg-input border-border min-h-[100px]" 
                      required
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createProject.isPending}>
                    {createProject.isPending ? "Creating..." : "Create Project"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <Card key={i} className="bg-card border-border">
                <CardHeader className="pb-4">
                  <Skeleton className="h-6 w-1/2 bg-border/50" />
                  <Skeleton className="h-4 w-3/4 bg-border/50 mt-2" />
                </CardHeader>
                <CardContent className="pb-4">
                  <Skeleton className="h-20 w-full bg-border/50" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects?.map(project => (
              <Card key={project.id} className="bg-card border-border hover:border-primary/50 transition-colors flex flex-col group">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl font-bold group-hover:text-primary transition-colors">
                      <Link href={`/`} className="hover:underline">
                        {project.name}
                      </Link>
                    </CardTitle>
                    <Badge variant="outline" className="font-mono bg-sidebar border-border">
                      {project.language}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                    {project.description}
                  </p>
                </CardHeader>
                
                <CardContent className="py-4 flex-1">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <GitFork className="w-4 h-4 text-[#ce9178]" />
                      <span className="font-mono">{project.nodeCount}</span> Nodes
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Activity className="w-4 h-4 text-[#4fc1ff]" />
                      <span className="font-mono">{project.edgeCount}</span> Edges
                    </div>
                  </div>
                </CardContent>
                
                <CardFooter className="pt-4 border-t border-border flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(project.updatedAt).toLocaleDateString()}
                  </div>
                  <Link href={`/projects/${project.id}/stats`}>
                    <Button variant="ghost" size="sm" className="h-8 gap-1.5 hover:bg-accent hover:text-accent-foreground text-xs">
                      <BarChart2 className="w-3.5 h-3.5" />
                      Stats
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
            
            {projects?.length === 0 && (
              <div className="col-span-full py-12 text-center border border-dashed border-border rounded-lg bg-card/50">
                <p className="text-muted-foreground">No projects found. Create one to get started.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}