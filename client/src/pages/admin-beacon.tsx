import AdminLayout from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { ExternalLink, RefreshCw, Radar } from "lucide-react";
import { useRef } from "react";

export default function AdminBeaconPage() {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleRefresh = () => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
  };

  return (
    <AdminLayout>
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b bg-card">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-orange-500/10">
              <Radar className="h-4 w-4 text-orange-500" />
            </div>
            <span className="font-semibold text-sm">Beacon Recruiting Intelligence</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open("https://beacon.realtyhack.com", "_blank")}
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              Open in New Tab
            </Button>
          </div>
        </div>

        {/* Iframe */}
        <iframe
          ref={iframeRef}
          src="https://beacon.realtyhack.com"
          className="flex-1 w-full border-0"
          title="Beacon Recruiting Intelligence"
          allow="clipboard-write"
        />
      </div>
    </AdminLayout>
  );
}
