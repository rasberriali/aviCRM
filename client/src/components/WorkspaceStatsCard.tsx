import { useQuery } from "@tanstack/react-query";
import { Folder, FileText, CheckSquare } from "lucide-react";

interface WorkspaceStats {
  categoriesCount: number;
  projectsCount: number;
  tasksCount: number;
  completedTasksCount: number;
  activeProjectsCount: number;
}

interface WorkspaceStatsCardProps {
  workspaceId: number;
}

export function WorkspaceStatsCard({ workspaceId }: WorkspaceStatsCardProps) {
  const { data: stats, isLoading } = useQuery({
    queryKey: [`/api/workspaces/${workspaceId}/stats`],
    queryFn: async () => {
      const response = await fetch(`/api/workspaces/${workspaceId}/stats`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json() as Promise<WorkspaceStats>;
    },
    staleTime: 30000, // Cache for 30 seconds
    retry: 1
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-100">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 animate-pulse">
            <div className="w-8 h-8 bg-slate-200 rounded"></div>
            <div>
              <div className="h-4 bg-slate-200 rounded w-8 mb-1"></div>
              <div className="h-3 bg-slate-200 rounded w-12"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const defaultStats: WorkspaceStats = {
    categoriesCount: 0,
    projectsCount: 0,
    tasksCount: 0,
    completedTasksCount: 0,
    activeProjectsCount: 0
  };

  const workspaceStats = stats || defaultStats;

  return (
    <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-100">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          <Folder className="w-8 h-8 text-blue-500" />
        </div>
        <div className="min-w-0">
          <p className="text-xl font-bold text-slate-900">{workspaceStats.categoriesCount}</p>
          <p className="text-xs text-slate-500 truncate">Categories</p>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          <FileText className="w-8 h-8 text-green-500" />
        </div>
        <div className="min-w-0">
          <p className="text-xl font-bold text-slate-900">{workspaceStats.projectsCount}</p>
          <p className="text-xs text-slate-500 truncate">Projects</p>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          <CheckSquare className="w-8 h-8 text-purple-500" />
        </div>
        <div className="min-w-0">
          <p className="text-xl font-bold text-slate-900">{workspaceStats.tasksCount}</p>
          <p className="text-xs text-slate-500 truncate">Tasks</p>
        </div>
      </div>
    </div>
  );
}