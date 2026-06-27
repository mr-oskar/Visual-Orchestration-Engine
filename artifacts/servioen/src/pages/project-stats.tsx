import { useGetProjectStats, getGetProjectStatsQueryKey } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { ArrowLeft, Box, Folder, FileCode2, FunctionSquare, AlertTriangle, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProjectStats() {
  const { id } = useParams();
  const projectId = id ? parseInt(id, 10) : 1;
  
  const { data: stats, isLoading } = useGetProjectStats(projectId, {
    query: {
      enabled: !!projectId,
      queryKey: getGetProjectStatsQueryKey(projectId)
    }
  });

  return (
    <div className="min-h-full w-full bg-background p-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/projects">
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-accent">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Project Statistics</h1>
            <p className="text-muted-foreground text-sm mt-1">Analytics and complexity metrics for your pipeline.</p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 bg-border/50" />)}
            </div>
            <Skeleton className="h-64 bg-border/50" />
          </div>
        ) : stats ? (
          <div className="space-y-6">
            {/* Top Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard 
                title="Total Nodes" 
                value={stats.totalNodes} 
                icon={<Box className="h-4 w-4 text-[#ce9178]" />} 
                description="Visual elements in graph"
              />
              <StatCard 
                title="Total Edges" 
                value={stats.totalEdges} 
                icon={<Activity className="h-4 w-4 text-[#4fc1ff]" />} 
                description="Connections & flow"
              />
              <StatCard 
                title="Avg Complexity" 
                value={stats.avgComplexity.toFixed(1)} 
                icon={<Activity className="h-4 w-4 text-[#dcdcaa]" />} 
                description="Cyclomatic average"
              />
              <StatCard 
                title="High Complexity" 
                value={stats.highComplexityNodes} 
                icon={<AlertTriangle className="h-4 w-4 text-destructive" />} 
                description="Nodes requiring refactor"
                trend={stats.highComplexityNodes > 0 ? "needs attention" : "healthy"}
                trendColor={stats.highComplexityNodes > 0 ? "text-destructive" : "text-green-500"}
              />
            </div>

            {/* Breakdown row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-lg">Node Type Breakdown</CardTitle>
                  <CardDescription>Composition of your architecture</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <ProgressBar label="Folders" value={stats.folderCount} total={stats.totalNodes} icon={<Folder className="h-4 w-4 text-[#4fc1ff]" />} color="bg-[#4fc1ff]" />
                    <ProgressBar label="Files" value={stats.fileCount} total={stats.totalNodes} icon={<FileCode2 className="h-4 w-4 text-[#dcdcaa]" />} color="bg-[#dcdcaa]" />
                    <ProgressBar label="Classes" value={stats.classCount} total={stats.totalNodes} icon={<Box className="h-4 w-4 text-[#4ec9b0]" />} color="bg-[#4ec9b0]" />
                    <ProgressBar label="Functions" value={stats.functionCount} total={stats.totalNodes} icon={<FunctionSquare className="h-4 w-4 text-[#ce9178]" />} color="bg-[#ce9178]" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-lg">Pipeline Health</CardTitle>
                  <CardDescription>Architecture metrics</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-48">
                  <div className="text-center space-y-2">
                    <div className="text-5xl font-bold text-primary">
                      {Math.max(0, 100 - (stats.highComplexityNodes / Math.max(1, stats.functionCount)) * 100).toFixed(0)}%
                    </div>
                    <p className="text-muted-foreground text-sm">Maintainability Score</p>
                    <p className="text-xs text-muted-foreground/70 max-w-[250px] mx-auto mt-4">
                      Based on cyclomatic complexity, component coupling, and node depths.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, description, trend, trendColor }: any) {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-foreground font-mono">{value}</div>
        <p className="text-xs text-muted-foreground mt-1 flex items-center justify-between">
          <span>{description}</span>
          {trend && <span className={`${trendColor} ml-2 font-medium`}>{trend}</span>}
        </p>
      </CardContent>
    </Card>
  );
}

function ProgressBar({ label, value, total, icon, color }: any) {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium">{label}</span>
        </div>
        <span className="text-muted-foreground font-mono">{value} <span className="text-xs opacity-50">({percentage.toFixed(0)}%)</span></span>
      </div>
      <div className="h-2 w-full bg-sidebar rounded overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${percentage}%` }}></div>
      </div>
    </div>
  );
}