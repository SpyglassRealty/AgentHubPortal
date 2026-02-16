import { useState, useCallback } from "react";
import type { PageContent, CmsSection, CmsColumn, CmsBlock } from "../types";
import { BlockRenderer } from "./block-renderer";
import { Button } from "@/components/ui/button";
import {
  Plus,
  GripVertical,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Columns2,
  Columns3,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface EditorCanvasProps {
  content: PageContent;
  selectedBlockId: string | null;
  selectedSectionId: string | null;
  onSelectBlock: (id: string | null) => void;
  onSelectSection: (id: string | null) => void;
  onAddSection: (atIndex?: number) => void;
  onDeleteSection: (sectionId: string) => void;
  onAddBlock: (sectionId: string, columnId: string, blockType: string, atIndex?: number) => void;
  onDeleteBlock: (blockId: string) => void;
  onDuplicateBlock: (blockId: string) => void;
  onMoveBlock: (
    fromSectionId: string,
    fromColumnId: string,
    fromIndex: number,
    toSectionId: string,
    toColumnId: string,
    toIndex: number
  ) => void;
  onMoveSection: (fromIndex: number, toIndex: number) => void;
  onUpdateContent: (content: PageContent) => void;
}

export function EditorCanvas({
  content,
  selectedBlockId,
  selectedSectionId,
  onSelectBlock,
  onSelectSection,
  onAddSection,
  onDeleteSection,
  onAddBlock,
  onDeleteBlock,
  onDuplicateBlock,
  onMoveBlock,
  onMoveSection,
  onUpdateContent,
}: EditorCanvasProps) {
  return (
    <div
      className="min-h-full p-6"
      onClick={(e) => {
        // Deselect when clicking on the canvas background
        if (e.target === e.currentTarget) {
          onSelectBlock(null);
          onSelectSection(null);
        }
      }}
    >
      {content.sections.length === 0 && (
        <EmptyCanvas onAddSection={() => onAddSection()} />
      )}

      {content.sections.map((section, sectionIndex) => (
        <div key={section.id}>
          {/* Add Section Button (between sections) */}
          {sectionIndex === 0 && (
            <AddSectionDivider onAdd={() => onAddSection(0)} />
          )}

          <SectionRenderer
            section={section}
            sectionIndex={sectionIndex}
            totalSections={content.sections.length}
            isSelected={selectedSectionId === section.id}
            selectedBlockId={selectedBlockId}
            onSelectSection={() => {
              onSelectSection(section.id);
              onSelectBlock(null);
            }}
            onSelectBlock={onSelectBlock}
            onDeleteSection={() => onDeleteSection(section.id)}
            onAddBlock={(columnId, blockType, atIndex) =>
              onAddBlock(section.id, columnId, blockType, atIndex)
            }
            onDeleteBlock={onDeleteBlock}
            onDuplicateBlock={onDuplicateBlock}
            onMoveBlock={(fromColumnId, fromIndex, toColumnId, toIndex) =>
              onMoveBlock(section.id, fromColumnId, fromIndex, section.id, toColumnId, toIndex)
            }
            onMoveSection={(direction) => {
              const newIndex = sectionIndex + direction;
              if (newIndex >= 0 && newIndex < content.sections.length) {
                onMoveSection(sectionIndex, newIndex);
              }
            }}
          />

          <AddSectionDivider onAdd={() => onAddSection(sectionIndex + 1)} />
        </div>
      ))}
    </div>
  );
}

function EmptyCanvas({ onAddSection }: { onAddSection: () => void }) {
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <div
      className={`border-2 border-dashed rounded-xl p-16 text-center transition-colors ${
        isDragOver
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:border-muted-foreground/50"
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        // If they drop a widget on the empty canvas, add a section first
        onAddSection();
      }}
    >
      <div className="text-muted-foreground space-y-4">
        <div className="text-4xl">📄</div>
        <h3 className="text-lg font-semibold">Start Building Your Page</h3>
        <p className="text-sm">
          Drag widgets from the left sidebar or click the button below to add your first section.
        </p>
        <Button onClick={onAddSection}>
          <Plus className="mr-2 h-4 w-4" />
          Add Section
        </Button>
      </div>
    </div>
  );
}

function AddSectionDivider({ onAdd }: { onAdd: () => void }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="relative h-8 flex items-center justify-center group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`absolute inset-x-0 h-0.5 transition-colors ${
          isHovered ? "bg-primary/30" : "bg-transparent"
        }`}
      />
      <button
        onClick={onAdd}
        className={`relative z-10 flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-all ${
          isHovered
            ? "bg-primary text-primary-foreground shadow-md scale-100"
            : "bg-muted text-muted-foreground scale-90 opacity-0 group-hover:opacity-100 group-hover:scale-100"
        }`}
      >
        <Plus className="h-3 w-3" />
        Add Section
      </button>
    </div>
  );
}

interface SectionRendererProps {
  section: CmsSection;
  sectionIndex: number;
  totalSections: number;
  isSelected: boolean;
  selectedBlockId: string | null;
  onSelectSection: () => void;
  onSelectBlock: (id: string | null) => void;
  onDeleteSection: () => void;
  onAddBlock: (columnId: string, blockType: string, atIndex?: number) => void;
  onDeleteBlock: (blockId: string) => void;
  onDuplicateBlock: (blockId: string) => void;
  onMoveBlock: (fromColumnId: string, fromIndex: number, toColumnId: string, toIndex: number) => void;
  onMoveSection: (direction: -1 | 1) => void;
}

function SectionRenderer({
  section,
  sectionIndex,
  totalSections,
  isSelected,
  selectedBlockId,
  onSelectSection,
  onSelectBlock,
  onDeleteSection,
  onAddBlock,
  onDeleteBlock,
  onDuplicateBlock,
  onMoveBlock,
  onMoveSection,
}: SectionRendererProps) {
  const sectionStyle: React.CSSProperties = {
    padding: section.style?.padding,
    margin: section.style?.margin,
    backgroundColor: section.style?.backgroundColor,
  };

  return (
    <div
      className={`relative group/section rounded-lg transition-all ${
        isSelected
          ? "ring-2 ring-primary ring-offset-2"
          : "ring-1 ring-transparent hover:ring-muted-foreground/20"
      }`}
      style={sectionStyle}
      onClick={(e) => {
        e.stopPropagation();
        onSelectSection();
      }}
    >
      {/* Section Controls */}
      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-20 flex items-center gap-1 opacity-0 group-hover/section:opacity-100 transition-opacity">
        <div className="flex items-center gap-0.5 bg-background border rounded-lg shadow-sm px-1 py-0.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onMoveSection(-1);
            }}
            disabled={sectionIndex === 0}
          >
            <ChevronUp className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onMoveSection(1);
            }}
            disabled={sectionIndex === totalSections - 1}
          >
            <ChevronDown className="h-3 w-3" />
          </Button>
          <div className="w-px h-4 bg-border mx-0.5" />
          <span className="text-[10px] text-muted-foreground px-1">Section</span>
          <div className="w-px h-4 bg-border mx-0.5" />
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteSection();
            }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Columns Grid */}
      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: section.columns
            .map((col) => `${(col.width / 12) * 100}%`)
            .join(" "),
        }}
      >
        {section.columns.map((column) => (
          <ColumnRenderer
            key={column.id}
            column={column}
            sectionId={section.id}
            selectedBlockId={selectedBlockId}
            onSelectBlock={onSelectBlock}
            onAddBlock={(blockType, atIndex) => onAddBlock(column.id, blockType, atIndex)}
            onDeleteBlock={onDeleteBlock}
            onDuplicateBlock={onDuplicateBlock}
            onMoveBlock={(fromIndex, toIndex) =>
              onMoveBlock(column.id, fromIndex, column.id, toIndex)
            }
          />
        ))}
      </div>
    </div>
  );
}

interface ColumnRendererProps {
  column: CmsColumn;
  sectionId: string;
  selectedBlockId: string | null;
  onSelectBlock: (id: string | null) => void;
  onAddBlock: (blockType: string, atIndex?: number) => void;
  onDeleteBlock: (blockId: string) => void;
  onDuplicateBlock: (blockId: string) => void;
  onMoveBlock: (fromIndex: number, toIndex: number) => void;
}

function ColumnRenderer({
  column,
  sectionId,
  selectedBlockId,
  onSelectBlock,
  onAddBlock,
  onDeleteBlock,
  onDuplicateBlock,
  onMoveBlock,
}: ColumnRendererProps) {
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverIndex(null);

    const widgetType = e.dataTransfer.getData("widget-type");
    const blockId = e.dataTransfer.getData("block-id");
    const fromIndex = e.dataTransfer.getData("block-index");

    if (widgetType) {
      // New widget from sidebar
      onAddBlock(widgetType, index);
    } else if (blockId && fromIndex !== "") {
      // Reordering existing block
      onMoveBlock(parseInt(fromIndex), index);
    }
  };

  return (
    <div
      className="min-h-[60px] rounded-md border border-dashed border-muted-foreground/20 p-2"
      onDragOver={(e) => handleDragOver(e, column.blocks.length)}
      onDragLeave={() => setDragOverIndex(null)}
      onDrop={(e) => handleDrop(e, column.blocks.length)}
    >
      {column.blocks.length === 0 ? (
        <div
          className={`flex items-center justify-center h-16 rounded-md text-xs text-muted-foreground transition-colors ${
            dragOverIndex !== null ? "bg-primary/10 border-primary" : ""
          }`}
        >
          {dragOverIndex !== null ? (
            <span className="text-primary font-medium">Drop here</span>
          ) : (
            <span>Drop widgets here</span>
          )}
        </div>
      ) : (
        <div className="space-y-1">
          {column.blocks.map((block, blockIndex) => (
            <div key={block.id}>
              {/* Drop indicator before block */}
              {dragOverIndex === blockIndex && (
                <div className="h-1 bg-primary rounded-full my-1 transition-all" />
              )}
              <BlockWrapper
                block={block}
                blockIndex={blockIndex}
                isSelected={selectedBlockId === block.id}
                columnId={column.id}
                onSelect={() => onSelectBlock(block.id)}
                onDelete={() => onDeleteBlock(block.id)}
                onDuplicate={() => onDuplicateBlock(block.id)}
                onDragOver={(e) => handleDragOver(e, blockIndex)}
                onDrop={(e) => handleDrop(e, blockIndex)}
              />
            </div>
          ))}
          {/* Drop indicator at end */}
          {dragOverIndex === column.blocks.length && column.blocks.length > 0 && (
            <div className="h-1 bg-primary rounded-full my-1 transition-all" />
          )}
        </div>
      )}
    </div>
  );
}

interface BlockWrapperProps {
  block: CmsBlock;
  blockIndex: number;
  isSelected: boolean;
  columnId: string;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}

function BlockWrapper({
  block,
  blockIndex,
  isSelected,
  columnId,
  onSelect,
  onDelete,
  onDuplicate,
  onDragOver,
  onDrop,
}: BlockWrapperProps) {
  return (
    <div
      className={`relative group/block rounded-md transition-all cursor-pointer ${
        isSelected
          ? "ring-2 ring-blue-500 ring-offset-1"
          : "ring-1 ring-transparent hover:ring-muted-foreground/30"
      }`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("block-id", block.id);
        e.dataTransfer.setData("block-index", blockIndex.toString());
        e.dataTransfer.setData("column-id", columnId);
        e.dataTransfer.effectAllowed = "move";
      }}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {/* Block Controls */}
      <div className="absolute -top-2 right-1 z-20 flex items-center gap-0.5 opacity-0 group-hover/block:opacity-100 transition-opacity">
        <div className="flex items-center bg-background border rounded-md shadow-sm">
          <button
            className="p-1 hover:bg-muted rounded-l-md cursor-grab active:cursor-grabbing"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-3 w-3 text-muted-foreground" />
          </button>
          <button
            className="p-1 hover:bg-muted"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
          >
            <Copy className="h-3 w-3 text-muted-foreground" />
          </button>
          <button
            className="p-1 hover:bg-muted rounded-r-md text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Block Content */}
      <div className="p-2" style={blockStyleToCSS(block.style)}>
        <BlockRenderer block={block} />
      </div>
    </div>
  );
}

function blockStyleToCSS(style?: Record<string, any>): React.CSSProperties {
  if (!style) return {};
  return {
    padding: style.padding,
    margin: style.margin,
    backgroundColor: style.backgroundColor,
    color: style.textColor,
    fontSize: style.fontSize,
    textAlign: style.textAlign as any,
  };
}
