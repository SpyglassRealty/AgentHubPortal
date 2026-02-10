import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { CMA_WIDGETS } from "../constants/widgets";
import type { CmaData } from "../types";

interface CmaPresentationPlayerProps {
  cmaData: CmaData;
  activeWidgetId: string | null;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
}

export function CmaPresentationPlayer({
  cmaData,
  activeWidgetId,
  onClose,
  onNext,
  onPrevious,
}: CmaPresentationPlayerProps) {
  const activeWidget = CMA_WIDGETS.find(w => w.id === activeWidgetId);
  const activeIndex = CMA_WIDGETS.findIndex(w => w.id === activeWidgetId);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (!activeWidget) return null;

  const WidgetComponent = activeWidget.component;

  return (
    <Dialog open={!!activeWidgetId} onOpenChange={onClose}>
      <DialogContent className="max-w-full h-screen p-0 m-0">
        <div className="flex h-full">
          {/* Sidebar with thumbnails - will be populated once Contract Conduit files are copied */}
          {sidebarOpen && (
            <div className="w-80 border-r bg-muted/20 flex flex-col">
              {/* Sidebar Header */}
              <div className="p-4 border-b">
                <h3 className="font-semibold">Presentation Slides</h3>
                <p className="text-sm text-muted-foreground">
                  {activeIndex + 1} of {CMA_WIDGETS.length}
                </p>
              </div>
              
              {/* Thumbnail Grid */}
              <div className="flex-1 overflow-y-auto p-2">
                <div className="grid grid-cols-2 gap-2">
                  {CMA_WIDGETS.map((widget, index) => (
                    <div
                      key={widget.id}
                      className={`
                        relative cursor-pointer rounded-lg border-2 transition-all
                        ${activeWidget.id === widget.id 
                          ? 'border-[#EF4923] bg-[#EF4923]/10' 
                          : 'border-transparent hover:border-muted-foreground/30'
                        }
                      `}
                      onClick={() => {
                        // Navigate to this widget
                        const targetIndex = CMA_WIDGETS.findIndex(w => w.id === widget.id);
                        // Implementation will call appropriate navigation function
                      }}
                    >
                      {/* Thumbnail placeholder - will be replaced with actual thumbnails */}
                      <div className="aspect-video bg-background rounded border flex items-center justify-center">
                        <widget.icon className="h-6 w-6 text-muted-foreground" />
                      </div>
                      
                      {/* Widget info */}
                      <div className="p-2">
                        <p className="text-xs font-medium truncate">{widget.title}</p>
                        <p className="text-xs text-muted-foreground">{index + 1}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Main content area */}
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-background">
              <div className="flex items-center gap-3">
                <activeWidget.icon className="h-6 w-6 text-[#EF4923]" />
                <h2 className="text-xl font-semibold">{activeWidget.title}</h2>
                <Badge variant="outline">{activeWidget.category}</Badge>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                >
                  {sidebarOpen ? 'Hide' : 'Show'} Thumbnails
                </Button>
                
                <span className="text-sm text-muted-foreground px-3">
                  {activeIndex + 1} of {CMA_WIDGETS.length}
                </span>
                
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Widget content area */}
            <div className="flex-1 overflow-auto">
              <div className="p-8 max-w-6xl mx-auto">
                {/* Render the actual widget component from Contract Conduit */}
                <WidgetComponent 
                  cmaData={cmaData}
                  subjectProperty={cmaData.subjectProperty}
                  comparableProperties={cmaData.comparableProperties}
                  isFullscreen={true}
                />
              </div>
            </div>

            {/* Navigation footer */}
            <div className="flex items-center justify-between p-4 border-t bg-muted/20">
              <Button
                variant="outline"
                onClick={onPrevious}
                disabled={activeIndex === 0}
                className="flex items-center gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              
              {/* Progress bar */}
              <div className="flex-1 mx-8">
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-[#EF4923] h-2 rounded-full transition-all"
                    style={{ 
                      width: `${((activeIndex + 1) / CMA_WIDGETS.length) * 100}%` 
                    }}
                  />
                </div>
              </div>

              <Button
                variant="outline"
                onClick={onNext}
                disabled={activeIndex === CMA_WIDGETS.length - 1}
                className="flex items-center gap-2"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}