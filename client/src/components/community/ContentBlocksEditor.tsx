import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageUpload } from "@/components/editor/ImageUpload";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  Trash2,
  GripVertical,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Video,
  Type,
  Link,
} from "lucide-react";

export interface ContentBlock {
  id: number;
  communityId: number;
  blockType: string;
  title: string;
  content: string;
  imageUrl: string;
  videoUrl: string;
  ctaEnabled: boolean;
  ctaText: string;
  ctaUrl: string;
  iframeUrl: string;
  headingLevel: 'h1' | 'h2' | 'h3' | 'h4';
  mediaPosition: 'left' | 'right';
  backgroundColor: 'white' | 'light' | 'dark';
  sortOrder: number;
  isPublished: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface ContentBlocksEditorProps {
  communityId: number;
  onSave?: () => void;
}

export function ContentBlocksEditor({ communityId, onSave }: ContentBlocksEditorProps) {
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // ── Fetch blocks ──────────────────────────────
  useEffect(() => {
    fetchBlocks();
  }, [communityId]);

  const fetchBlocks = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/communities/${communityId}/content-blocks`);
      if (response.ok) {
        const data = await response.json();
        // Map from API format to editor format
        const mappedBlocks = data.blocks.map((block: any) => ({
          ...block,
          imageUrl: block.images?.[0] || '',
          videoUrl: block.videos?.[0] || '',
          ctaEnabled: !!(block.ctaButtons?.[0]?.text || block.ctaButtons?.[0]?.url),
          ctaText: block.ctaButtons?.[0]?.text || '',
          ctaUrl: block.ctaButtons?.[0]?.url || '',
          iframeUrl: block.iframeUrl || '',
          headingLevel: block.headingLevel || 'h2',
          mediaPosition: block.mediaPosition || 'left',
          isPublished: block.isPublished !== undefined ? block.isPublished : true
        }));
        setBlocks(mappedBlocks);
      }
    } catch (error) {
      console.error('Error fetching content blocks:', error);
    } finally {
      setLoading(false);
    }
  };

  // ── Add new block ──────────────────────────────
  const addBlock = async (blockType: string = 'split') => {
    try {
      setSaving(true);
      const response = await fetch(`/api/admin/communities/${communityId}/content-blocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blockType,
          title: 'New Section',
          content: '<p>Your content goes here...</p>',
          images: [],
          videos: [],
          ctaButtons: [],
          mediaPosition: 'right',
          headingLevel: 'h2',
          backgroundColor: 'white',
          sortOrder: blocks.length,
          isPublished: true,
          iframeUrl: ''
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Map response to editor format
        const mappedBlock = {
          ...data.block,
          imageUrl: data.block.images?.[0] || '',
          videoUrl: data.block.videos?.[0] || '',
          ctaEnabled: !!(data.block.ctaButtons?.[0]?.text || data.block.ctaButtons?.[0]?.url),
          ctaText: data.block.ctaButtons?.[0]?.text || '',
          ctaUrl: data.block.ctaButtons?.[0]?.url || '',
          iframeUrl: data.block.iframeUrl || '',
          headingLevel: data.block.headingLevel || 'h2',
          mediaPosition: data.block.mediaPosition || 'left',
          isPublished: data.block.isPublished !== undefined ? data.block.isPublished : true
        };
        setBlocks([...blocks, mappedBlock]);
        toast({ title: 'Block added', description: 'New content block created.' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to add block.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // ── Update block ──────────────────────────────
  const updateBlock = async (blockId: number, updates: Partial<ContentBlock>) => {
    try {
      // Map from editor format to API format
      const apiUpdates: any = { ...updates };
      
      if (updates.imageUrl !== undefined) {
        apiUpdates.images = updates.imageUrl ? [updates.imageUrl] : [];
        delete apiUpdates.imageUrl;
      }
      if (updates.videoUrl !== undefined) {
        apiUpdates.videos = updates.videoUrl ? [updates.videoUrl] : [];
        delete apiUpdates.videoUrl;
      }
      if (updates.ctaEnabled === false) {
        apiUpdates.ctaButtons = [];
        delete apiUpdates.ctaEnabled;
        delete apiUpdates.ctaText;
        delete apiUpdates.ctaUrl;
      } else if (updates.ctaText !== undefined || updates.ctaUrl !== undefined) {
        const currentBlock = blocks.find(b => b.id === blockId);
        apiUpdates.ctaButtons = [{
          text: updates.ctaText !== undefined ? updates.ctaText : currentBlock?.ctaText || '',
          url: updates.ctaUrl !== undefined ? updates.ctaUrl : currentBlock?.ctaUrl || ''
        }];
        delete apiUpdates.ctaEnabled;
        delete apiUpdates.ctaText;
        delete apiUpdates.ctaUrl;
      }
      delete apiUpdates.ctaEnabled;
      if (updates.isPublished !== undefined) {
        apiUpdates.isPublished = updates.isPublished;
      }

      const response = await fetch(`/api/admin/communities/${communityId}/content-blocks/${blockId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiUpdates),
      });

      if (response.ok) {
        const data = await response.json();
        // Map response back to editor format
        const mappedBlock = {
          ...data.block,
          imageUrl: data.block.images?.[0] || '',
          videoUrl: data.block.videos?.[0] || '',
          ctaEnabled: !!(data.block.ctaButtons?.[0]?.text || data.block.ctaButtons?.[0]?.url),
          ctaText: data.block.ctaButtons?.[0]?.text || '',
          ctaUrl: data.block.ctaButtons?.[0]?.url || '',
          iframeUrl: data.block.iframeUrl || '',
          headingLevel: data.block.headingLevel || 'h2',
          mediaPosition: data.block.mediaPosition || 'left',
          isPublished: data.block.isPublished !== undefined ? data.block.isPublished : true
        };
        setBlocks(blocks.map(block =>
          block.id === blockId ? { ...block, ...mappedBlock } : block
        ));
      }
    } catch (error) {
      console.error('Error updating block:', error);
    }
  };

  // ── Delete block ──────────────────────────────
  const deleteBlock = async (blockId: number) => {
    if (!confirm('Are you sure you want to delete this block?')) return;

    try {
      const response = await fetch(`/api/admin/communities/${communityId}/content-blocks/${blockId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setBlocks(blocks.filter(block => block.id !== blockId));
        toast({ title: 'Block deleted', description: 'Content block removed.' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete block.', variant: 'destructive' });
    }
  };

  // ── Reorder blocks ──────────────────────────────
  const moveBlock = (fromIndex: number, toIndex: number) => {
    const newBlocks = [...blocks];
    const [moved] = newBlocks.splice(fromIndex, 1);
    newBlocks.splice(toIndex, 0, moved);
    
    // Update sort order
    const reorderedBlocks = newBlocks.map((block, index) => ({
      ...block,
      sortOrder: index
    }));
    
    setBlocks(reorderedBlocks);
    
    // Save new order to backend
    const blockIds = reorderedBlocks.map(block => block.id);
    fetch(`/api/admin/communities/${communityId}/content-blocks/reorder`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blockIds }),
    }).catch(error => console.error('Error reordering blocks:', error));
  };

  if (loading) {
    return <div className="p-4">Loading content blocks...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Type className="h-5 w-5" />
              Content Blocks
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Drag-and-drop content sections with images, videos, and text
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => addBlock('split')}
              size="sm"
              disabled={saving}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Block
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {blocks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Type className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No content blocks yet</p>
            <p className="text-sm">Add your first block to get started</p>
          </div>
        ) : (
          blocks.map((block, index) => (
            <ContentBlockEditor
              key={block.id}
              block={block}
              index={index}
              totalBlocks={blocks.length}
              onUpdate={(updates) => updateBlock(block.id, updates)}
              onDelete={() => deleteBlock(block.id)}
              onMoveUp={() => index > 0 && moveBlock(index, index - 1)}
              onMoveDown={() => index < blocks.length - 1 && moveBlock(index, index + 1)}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

// ── Individual Block Editor ──────────────────────────────
interface ContentBlockEditorProps {
  block: ContentBlock;
  index: number;
  totalBlocks: number;
  onUpdate: (updates: Partial<ContentBlock>) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function ContentBlockEditor({ 
  block, 
  index, 
  totalBlocks, 
  onUpdate, 
  onDelete, 
  onMoveUp, 
  onMoveDown 
}: ContentBlockEditorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localBlock, setLocalBlock] = useState(block);

  // Sync local state when block identity changes (not on every update)
  useEffect(() => {
    setLocalBlock(block);
  }, [block.id]);

  const handleFieldChange = (field: string, value: any) => {
    setLocalBlock(prev => ({ ...prev, [field]: value }));
  };

  const handleBlur = (field: string) => {
    onUpdate({ [field]: localBlock[field] });
  };

  const handleImmediateUpdate = (field: string, value: any) => {
    setLocalBlock(prev => ({ ...prev, [field]: value }));
    onUpdate({ [field]: value });
  };

  // Debounced save for RTE content (avoids a PUT on every keystroke)
  const contentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingContentRef = useRef<string | null>(null);
  const handleDebouncedContentUpdate = useCallback((value: string) => {
    setLocalBlock(prev => ({ ...prev, content: value }));
    pendingContentRef.current = value;
    if (contentTimerRef.current) clearTimeout(contentTimerRef.current);
    contentTimerRef.current = setTimeout(() => {
      onUpdate({ content: value });
      pendingContentRef.current = null;
    }, 800);
  }, [onUpdate]);

  // Flush pending content save on unmount (block collapse / navigation)
  useEffect(() => {
    return () => {
      if (contentTimerRef.current) clearTimeout(contentTimerRef.current);
      if (pendingContentRef.current !== null) {
        onUpdate({ content: pendingContentRef.current });
      }
    };
  }, [onUpdate]);

  const flushAllFields = () => {
    onUpdate({
      title: localBlock.title,
      content: localBlock.content,
      headingLevel: localBlock.headingLevel,
      videoUrl: localBlock.videoUrl,
      iframeUrl: localBlock.iframeUrl,
      ctaText: localBlock.ctaText,
      ctaUrl: localBlock.ctaUrl,
    });
  };

  return (
    <div className="border rounded-lg p-4 space-y-3 bg-card">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
          <div>
            <h4 className="font-medium">{localBlock.title || 'Untitled Block'}</h4>
            <p className="text-sm text-muted-foreground">
              {localBlock.blockType === 'split' ? 'Split Layout' : 'Content Block'} 
              {localBlock.imageUrl && ' • Image'}
              {localBlock.videoUrl && ' • Video'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleImmediateUpdate('isPublished', !localBlock.isPublished)}
            className="h-8 w-8 p-0"
          >
            {localBlock.isPublished ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </Button>
          
          {index > 0 && (
            <Button variant="ghost" size="sm" onClick={onMoveUp} className="h-8 w-8 p-0">
              ↑
            </Button>
          )}
          {index < totalBlocks - 1 && (
            <Button variant="ghost" size="sm" onClick={onMoveDown} className="h-8 w-8 p-0">
              ↓
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (isExpanded) flushAllFields();
              setIsExpanded(!isExpanded);
            }}
            className="h-8 px-3"
          >
            {isExpanded ? 'Collapse' : 'Edit'}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              flushAllFields();
              onDelete();
            }}
            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Expanded Edit Form */}
      {isExpanded && (
        <div className="space-y-4 pt-4 border-t">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Title</Label>
              <Input
                value={localBlock.title}
                onChange={(e) => handleFieldChange('title', e.target.value)}
                onBlur={() => handleBlur('title')}
                placeholder="Section title..."
              />
            </div>
            <div>
              <Label>Heading Level</Label>
              <Select value={localBlock.headingLevel || 'h2'} onValueChange={(value: any) => handleImmediateUpdate('headingLevel', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="h1">H1</SelectItem>
                  <SelectItem value="h2">H2</SelectItem>
                  <SelectItem value="h3">H3</SelectItem>
                  <SelectItem value="h4">H4</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Background</Label>
              <Select value={localBlock.backgroundColor} onValueChange={(value: any) => handleImmediateUpdate('backgroundColor', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="white">White</SelectItem>
                  <SelectItem value="light">Light Gray</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Content</Label>
            <RichTextEditor
              value={localBlock.content}
              onChange={handleDebouncedContentUpdate}
              placeholder="Enter your content..."
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Image
              </Label>
              <ImageUpload
                value={localBlock.imageUrl}
                onChange={(url) => handleImmediateUpdate('imageUrl', url)}
              />
            </div>
            <div>
              <Label className="flex items-center gap-2">
                <Video className="h-4 w-4" />
                Video URL
              </Label>
              <Input
                value={localBlock.videoUrl}
                onChange={(e) => handleFieldChange('videoUrl', e.target.value)}
                onBlur={() => handleBlur('videoUrl')}
                placeholder="YouTube, Vimeo, or direct video URL..."
              />
              {localBlock.videoUrl && (
                <div className="mt-2">
                  {localBlock.videoUrl.includes('youtube.com') || localBlock.videoUrl.includes('youtu.be') ? (
                    (() => {
                      const match = localBlock.videoUrl.match(/(?:v=|youtu\.be\/)([^&?/]+)/);
                      return match ? (
                        <img 
                          src={`https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`}
                          alt="Video thumbnail"
                          className="w-full max-w-md h-auto rounded-lg border"
                        />
                      ) : null;
                    })()
                  ) : (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Video className="h-3 w-3" /> <a href={localBlock.videoUrl} target="_blank" rel="noopener noreferrer" className="underline truncate">{localBlock.videoUrl}</a>
                    </p>
                  )}
                </div>
              )}
            </div>
            <div>
              <Label className="flex items-center gap-2">
                <Link className="h-4 w-4" />
                iFrame URL
              </Label>
              <Input
                value={localBlock.iframeUrl}
                onChange={(e) => handleFieldChange('iframeUrl', e.target.value)}
                onBlur={() => handleBlur('iframeUrl')}
                placeholder="Embedded content URL..."
              />
              {localBlock.iframeUrl && (
                <div className="mt-2 space-y-1">
                  <iframe src={localBlock.iframeUrl} width="100%" height="300" frameBorder="0" className="rounded-lg border" />
                  <p className="text-xs text-muted-foreground">Preview may not load for all URLs due to iframe restrictions.</p>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Media Position</Label>
              <Select value={localBlock.mediaPosition} onValueChange={(value: any) => handleImmediateUpdate('mediaPosition', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-3">
              <div className="flex items-center gap-2">
                <Switch
                  checked={localBlock.ctaEnabled}
                  onCheckedChange={(checked) => {
                    handleImmediateUpdate('ctaEnabled', checked);
                    if (!checked) {
                      onUpdate({ ctaEnabled: false, ctaText: '', ctaUrl: '' });
                    }
                  }}
                />
                <Label>CTA Button</Label>
              </div>
              {localBlock.ctaEnabled && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Button Text</Label>
                    <Input
                      value={localBlock.ctaText}
                      onChange={(e) => handleFieldChange('ctaText', e.target.value)}
                      onBlur={() => handleBlur('ctaText')}
                      placeholder="Get Started"
                    />
                  </div>
                  <div>
                    <Label>Button URL</Label>
                    <Input
                      value={localBlock.ctaUrl}
                      onChange={(e) => handleFieldChange('ctaUrl', e.target.value)}
                      onBlur={() => handleBlur('ctaUrl')}
                      placeholder="/contact"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}