import React, { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { nanoid } from 'nanoid';
import { WidgetSidebar } from './WidgetSidebar';
import { BlockCanvas } from './BlockCanvas';
import { BlockSettingsPanel } from './BlockSettingsPanel';
import { BlockRenderer } from './BlockRenderer';
import { getWidgetDefinition } from './BlockRegistry';
import type { BlockData } from './types';
import { Button } from '@/components/ui/button';
import { PanelLeft, Eye, EyeOff, Undo2, Redo2 } from 'lucide-react';

interface PageBuilderProps {
  blocks: BlockData[];
  onChange: (blocks: BlockData[]) => void;
}

// ── History for undo/redo ──────────────────────────────────

function useHistory(initial: BlockData[]) {
  const [history, setHistory] = useState<BlockData[][]>([initial]);
  const [index, setIndex] = useState(0);

  const current = history[index];

  const push = useCallback((newState: BlockData[]) => {
    setHistory(prev => {
      const sliced = prev.slice(0, index + 1);
      return [...sliced, newState].slice(-50); // Keep last 50 states
    });
    setIndex(prev => Math.min(prev + 1, 49));
  }, [index]);

  const undo = useCallback(() => {
    setIndex(prev => Math.max(prev - 1, 0));
  }, []);

  const redo = useCallback(() => {
    setIndex(prev => Math.min(prev + 1, history.length - 1));
  }, [history.length]);

  return { current, push, undo, redo, canUndo: index > 0, canRedo: index < history.length - 1 };
}

// ── Main Page Builder ──────────────────────────────────

export function PageBuilder({ blocks: initialBlocks, onChange }: PageBuilderProps) {
  const { current: blocks, push, undo, redo, canUndo, canRedo } = useHistory(initialBlocks);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [isPreview, setIsPreview] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // ── Update blocks and notify parent ──────────────────
  const updateBlocks = useCallback((newBlocks: BlockData[]) => {
    push(newBlocks);
    onChange(newBlocks);
  }, [push, onChange]);

  // ── DnD Handlers ──────────────────────────────────

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;

    if (!over) return;

    // Dropping a new widget from sidebar
    if (active.data.current?.type === 'widget') {
      const widgetType = active.data.current.widgetType;
      const defaultProps = active.data.current.defaultProps;
      const def = getWidgetDefinition(widgetType);

      const newBlock: BlockData = {
        id: nanoid(),
        type: widgetType,
        props: { ...defaultProps },
        ...(widgetType === 'columns' ? {
          children: Array.from({ length: defaultProps.columns || 2 }, () => []),
        } : {}),
      };

      // Find insert position
      const overIndex = blocks.findIndex(b => b.id === over.id);
      if (overIndex >= 0) {
        const newBlocks = [...blocks];
        newBlocks.splice(overIndex, 0, newBlock);
        updateBlocks(newBlocks);
      } else {
        // Drop at end
        updateBlocks([...blocks, newBlock]);
      }

      setSelectedBlockId(newBlock.id);
      return;
    }

    // Reordering existing blocks
    if (active.id !== over.id) {
      const oldIndex = blocks.findIndex(b => b.id === active.id);
      const newIndex = blocks.findIndex(b => b.id === over.id);
      if (oldIndex >= 0 && newIndex >= 0) {
        updateBlocks(arrayMove(blocks, oldIndex, newIndex));
      }
    }
  };

  // ── Block operations ──────────────────────────────────

  const handleDeleteBlock = useCallback((id: string) => {
    updateBlocks(blocks.filter(b => b.id !== id));
    if (selectedBlockId === id) setSelectedBlockId(null);
  }, [blocks, selectedBlockId, updateBlocks]);

  const handleDuplicateBlock = useCallback((id: string) => {
    const blockIndex = blocks.findIndex(b => b.id === id);
    if (blockIndex < 0) return;

    const original = blocks[blockIndex];
    const duplicate: BlockData = {
      ...JSON.parse(JSON.stringify(original)),
      id: nanoid(),
    };
    // Generate new IDs for children
    if (duplicate.children) {
      duplicate.children = duplicate.children.map(col =>
        col.map(child => ({ ...child, id: nanoid() }))
      );
    }

    const newBlocks = [...blocks];
    newBlocks.splice(blockIndex + 1, 0, duplicate);
    updateBlocks(newBlocks);
    setSelectedBlockId(duplicate.id);
  }, [blocks, updateBlocks]);

  const handleUpdateBlock = useCallback((blockId: string, newProps: Record<string, any>) => {
    const newBlocks = blocks.map(b => {
      if (b.id === blockId) {
        const updated = { ...b, props: newProps };
        // Handle columns count change
        if (b.type === 'columns' && newProps.columns !== b.props.columns) {
          const currentChildren = b.children || [];
          const newColCount = newProps.columns || 2;
          const newChildren = Array.from({ length: newColCount }, (_, i) => 
            currentChildren[i] || []
          );
          updated.children = newChildren;
        }
        return updated;
      }
      return b;
    });
    updateBlocks(newBlocks);
  }, [blocks, updateBlocks]);

  const selectedBlock = blocks.find(b => b.id === selectedBlockId) || null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col h-full">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b bg-white dark:bg-card">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              <PanelLeft className="h-4 w-4 mr-1" />
              {isSidebarOpen ? 'Hide' : 'Show'} Widgets
            </Button>
            <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={undo} disabled={!canUndo}>
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={redo} disabled={!canRedo}>
              <Redo2 className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">{blocks.length} block{blocks.length !== 1 ? 's' : ''}</span>
            <Button
              variant={isPreview ? 'default' : 'outline'}
              size="sm"
              onClick={() => setIsPreview(!isPreview)}
            >
              {isPreview ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
              {isPreview ? 'Edit' : 'Preview'}
            </Button>
          </div>
        </div>

        {/* Main 3-panel layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Widget Sidebar */}
          {!isPreview && (
            <WidgetSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
          )}

          {/* Center: Canvas */}
          <BlockCanvas
            blocks={blocks}
            selectedBlockId={selectedBlockId}
            isPreview={isPreview}
            onSelectBlock={setSelectedBlockId}
            onDeleteBlock={handleDeleteBlock}
            onDuplicateBlock={handleDuplicateBlock}
          />

          {/* Right: Settings Panel */}
          {!isPreview && (
            <BlockSettingsPanel
              block={selectedBlock}
              onUpdate={handleUpdateBlock}
              onClose={() => setSelectedBlockId(null)}
            />
          )}
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeDragId && activeDragId.startsWith('widget-') ? (
          <div className="bg-white dark:bg-card border rounded-lg p-3 shadow-xl opacity-80">
            <span className="text-sm font-medium">
              {getWidgetDefinition(activeDragId.replace('widget-', ''))?.label || 'Widget'}
            </span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
