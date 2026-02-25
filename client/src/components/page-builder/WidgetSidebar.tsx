import React, { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { widgetCategories, getWidgetsByCategory } from './BlockRegistry';
import type { WidgetDefinition } from './types';
import { ChevronDown, ChevronRight, GripVertical, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

// ── Draggable Widget Item ──────────────────────────────────

function DraggableWidget({ widget }: { widget: WidgetDefinition }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `widget-${widget.type}`,
    data: {
      type: 'widget',
      widgetType: widget.type,
      defaultProps: widget.defaultProps,
    },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 1000,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`flex items-center gap-3 p-3 rounded-lg border bg-white dark:bg-card cursor-grab active:cursor-grabbing hover:border-[#EF4923] hover:shadow-sm transition-all ${
        isDragging ? 'opacity-50 shadow-lg border-[#EF4923]' : ''
      }`}
    >
      <GripVertical className="h-4 w-4 text-gray-400 flex-shrink-0" />
      <span className="text-lg">{widget.icon}</span>
      <span className="text-sm font-medium">{widget.label}</span>
    </div>
  );
}

// ── Widget Sidebar ──────────────────────────────────

interface WidgetSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WidgetSidebar({ isOpen, onClose }: WidgetSidebarProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(widgetCategories)
  );

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  if (!isOpen) return null;

  return (
    <div className="w-64 border-r bg-gray-50 dark:bg-muted/30 flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold text-sm uppercase tracking-wider text-gray-500">Widgets</h3>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7 md:hidden">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {widgetCategories.map(cat => {
            const widgets = getWidgetsByCategory(cat);
            const isExpanded = expandedCategories.has(cat);
            return (
              <div key={cat}>
                <button
                  onClick={() => toggleCategory(cat)}
                  className="flex items-center gap-2 w-full text-left px-2 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  {cat}
                </button>
                {isExpanded && (
                  <div className="space-y-1.5 mb-2">
                    {widgets.map(w => (
                      <DraggableWidget key={w.type} widget={w} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
