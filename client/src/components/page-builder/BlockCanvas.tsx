import React from 'react';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { BlockRenderer } from './BlockRenderer';
import type { BlockData } from './types';
import { GripVertical, Trash2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ── Sortable Block Wrapper ──────────────────────────────────

interface SortableBlockProps {
  block: BlockData;
  isSelected: boolean;
  isPreview: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}

function SortableBlock({ block, isSelected, isPreview, onSelect, onDelete, onDuplicate }: SortableBlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (isPreview) {
    return (
      <div className="mb-4 last:mb-0">
        <BlockRenderer block={block} isPreview />
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative mb-3 rounded-lg transition-all ${
        isDragging ? 'opacity-50 z-50' : ''
      } ${
        isSelected
          ? 'ring-2 ring-[#EF4923] shadow-md'
          : 'hover:ring-1 hover:ring-gray-300 dark:hover:ring-gray-600'
      }`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(block.id);
      }}
    >
      {/* Block Controls */}
      <div className={`absolute -top-3 left-2 flex items-center gap-1 z-10 transition-opacity ${
        isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
      }`}>
        <div
          {...attributes}
          {...listeners}
          className="flex items-center gap-1 bg-[#EF4923] text-white rounded px-2 py-1 cursor-grab active:cursor-grabbing text-xs font-medium shadow-sm"
        >
          <GripVertical className="h-3 w-3" />
          <span className="capitalize">{block.type}</span>
        </div>
      </div>

      <div className={`absolute -top-3 right-2 flex items-center gap-1 z-10 transition-opacity ${
        isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
      }`}>
        <Button
          variant="secondary"
          size="icon"
          className="h-6 w-6 shadow-sm"
          onClick={(e) => { e.stopPropagation(); onDuplicate(block.id); }}
        >
          <Copy className="h-3 w-3" />
        </Button>
        <Button
          variant="destructive"
          size="icon"
          className="h-6 w-6 shadow-sm"
          onClick={(e) => { e.stopPropagation(); onDelete(block.id); }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      {/* Block Content */}
      <div className="p-4 bg-white dark:bg-card rounded-lg border">
        <BlockRenderer block={block} />
      </div>
    </div>
  );
}

// ── Block Canvas ──────────────────────────────────

interface BlockCanvasProps {
  blocks: BlockData[];
  selectedBlockId: string | null;
  isPreview: boolean;
  onSelectBlock: (id: string | null) => void;
  onDeleteBlock: (id: string) => void;
  onDuplicateBlock: (id: string) => void;
}

export function BlockCanvas({
  blocks,
  selectedBlockId,
  isPreview,
  onSelectBlock,
  onDeleteBlock,
  onDuplicateBlock,
}: BlockCanvasProps) {
  const { setNodeRef, isOver } = useDroppable({ id: 'canvas-droppable' });

  if (isPreview) {
    return (
      <div className="flex-1 overflow-auto bg-white dark:bg-background">
        <div className="max-w-[1200px] mx-auto p-8">
          {blocks.map(block => (
            <div key={block.id} className="mb-6 last:mb-0">
              <BlockRenderer block={block} isPreview />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex-1 overflow-auto bg-gray-100 dark:bg-background"
      onClick={() => onSelectBlock(null)}
    >
      <div className="max-w-[1200px] mx-auto p-6 md:p-8 min-h-full">
        <div ref={setNodeRef} className="min-h-[400px]">
          <SortableContext
            items={blocks.map(b => b.id)}
            strategy={verticalListSortingStrategy}
          >
            {blocks.map(block => (
              <SortableBlock
                key={block.id}
                block={block}
                isSelected={selectedBlockId === block.id}
                isPreview={false}
                onSelect={onSelectBlock}
                onDelete={onDeleteBlock}
                onDuplicate={onDuplicateBlock}
              />
            ))}
          </SortableContext>

          {blocks.length === 0 && (
            <div
              className={`border-2 border-dashed rounded-xl p-16 text-center transition-colors ${
                isOver ? 'border-[#EF4923] bg-orange-50 dark:bg-orange-950/20' : 'border-gray-300 dark:border-gray-700'
              }`}
            >
              <div className="text-5xl mb-4">🎨</div>
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Start Building Your Page
              </h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto">
                Drag widgets from the left sidebar and drop them here to build your page.
                Click any block to edit its settings.
              </p>
            </div>
          )}

          {blocks.length > 0 && (
            <div
              className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors mt-4 ${
                isOver ? 'border-[#EF4923] bg-orange-50 dark:bg-orange-950/20' : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <p className="text-xs text-gray-400">Drop widget here to add at end</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
