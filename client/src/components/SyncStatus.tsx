import { RefreshCw, Wifi, WifiOff, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSyncStatus } from "@/hooks/useLocalData";

export function SyncStatus() {
  const { lastSync, isStale, forceSyncNow } = useSyncStatus();

  const formatLastSync = (timestamp: string) => {
    if (!timestamp) return "Never";
    
    const now = new Date();
    const syncTime = new Date(timestamp);
    const diffMinutes = Math.floor((now.getTime() - syncTime.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return `${Math.floor(diffMinutes / 1440)}d ago`;
  };

  return (
    <div className="flex items-center gap-2 text-sm text-slate-600">
      <div className="flex items-center gap-1">
        {isStale ? (
          <WifiOff className="h-4 w-4 text-orange-500" />
        ) : (
          <Wifi className="h-4 w-4 text-green-500" />
        )}
        <span>Sync: {formatLastSync(lastSync)}</span>
      </div>
      
      <Badge variant={isStale ? "destructive" : "secondary"} className="px-2 py-1">
        {isStale ? "Stale" : "Fresh"}
      </Badge>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={forceSyncNow}
        className="h-6 px-2"
        title="Force sync now"
      >
        <RefreshCw className="h-3 w-3" />
      </Button>
    </div>
  );
}