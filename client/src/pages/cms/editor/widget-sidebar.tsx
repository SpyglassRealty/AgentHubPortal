import { useState } from "react";
import { WIDGET_DEFINITIONS, WIDGET_CATEGORIES, type WidgetDefinition } from "../types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export function WidgetSidebar() {
  const [search, setSearch] = useState("");

  const filteredWidgets = search
    ? WIDGET_DEFINITIONS.filter(
        (w) =>
          w.label.toLowerCase().includes(search.toLowerCase()) ||
          w.type.toLowerCase().includes(search.toLowerCase())
      )
    : WIDGET_DEFINITIONS;

  const groupedWidgets = WIDGET_CATEGORIES.map((cat) => ({
    ...cat,
    widgets: filteredWidgets.filter((w) => w.category === cat.id),
  }));

  return (
    <div className="w-64 border-r bg-background flex flex-col shrink-0">
      <div className="p-3 border-b">
        <h3 className="font-semibold text-sm mb-2">Widgets</h3>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search widgets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <Accordion
          type="multiple"
          defaultValue={WIDGET_CATEGORIES.map((c) => c.id)}
          className="px-2"
        >
          {groupedWidgets.map((category) => {
            if (category.widgets.length === 0) return null;
            return (
              <AccordionItem key={category.id} value={category.id} className="border-b-0">
                <AccordionTrigger className="py-2 text-xs font-semibold uppercase text-muted-foreground hover:no-underline">
                  {category.label}
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-2 gap-1.5 pb-2">
                    {category.widgets.map((widget) => (
                      <DraggableWidget key={widget.type} widget={widget} />
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </ScrollArea>
    </div>
  );
}

function DraggableWidget({ widget }: { widget: WidgetDefinition }) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("widget-type", widget.type);
        e.dataTransfer.effectAllowed = "copy";
      }}
      className="flex flex-col items-center justify-center p-2 rounded-lg border border-dashed border-transparent hover:border-primary/50 hover:bg-muted/50 cursor-grab active:cursor-grabbing transition-colors select-none"
      title={widget.label}
    >
      <span className="text-lg mb-0.5">{widget.icon}</span>
      <span className="text-[10px] text-muted-foreground text-center leading-tight">
        {widget.label}
      </span>
    </div>
  );
}
