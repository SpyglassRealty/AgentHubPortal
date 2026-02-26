import React from 'react';
import type { BlockData } from './types';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X, Plus, Trash2 } from 'lucide-react';
import { getWidgetDefinition } from './BlockRegistry';

interface BlockSettingsPanelProps {
  block: BlockData | null;
  onUpdate: (blockId: string, props: Record<string, any>) => void;
  onClose: () => void;
}

export function BlockSettingsPanel({ block, onUpdate, onClose }: BlockSettingsPanelProps) {
  if (!block) {
    return (
      <div className="w-72 border-l bg-gray-50 dark:bg-muted/30 flex items-center justify-center p-6">
        <p className="text-sm text-gray-400 text-center">
          Click a block to edit its settings
        </p>
      </div>
    );
  }

  const widget = getWidgetDefinition(block.type);
  const props = block.props;

  const update = (key: string, value: any) => {
    onUpdate(block.id, { ...props, [key]: value });
  };

  const renderSettings = () => {
    switch (block.type) {
      case 'heading':
        return (
          <>
            <Field label="Text">
              <Input value={props.text || ''} onChange={e => update('text', e.target.value)} />
            </Field>
            <Field label="Level">
              <Select value={String(props.level || 2)} onValueChange={v => update('level', Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1,2,3,4,5,6].map(l => (
                    <SelectItem key={l} value={String(l)}>H{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <AlignmentField value={props.alignment} onChange={v => update('alignment', v)} />
            <Field label="Color">
              <div className="flex gap-2">
                <input type="color" value={props.color || '#000000'} onChange={e => update('color', e.target.value)} className="h-9 w-12 rounded border cursor-pointer" />
                <Input value={props.color || '#000000'} onChange={e => update('color', e.target.value)} className="flex-1" />
              </div>
            </Field>
          </>
        );

      case 'text':
        return (
          <>
            <Field label="Content">
              <Textarea value={props.content || ''} onChange={e => update('content', e.target.value)} rows={6} />
            </Field>
            <AlignmentField value={props.alignment} onChange={v => update('alignment', v)} />
          </>
        );

      case 'image':
        return (
          <>
            <Field label="Image URL">
              <Input value={props.url || ''} onChange={e => update('url', e.target.value)} placeholder="https://..." />
            </Field>
            <Field label="Alt Text">
              <Input value={props.alt || ''} onChange={e => update('alt', e.target.value)} />
            </Field>
            <Field label="Width">
              <Input value={props.width || '100%'} onChange={e => update('width', e.target.value)} placeholder="100% or 500px" />
            </Field>
            <AlignmentField value={props.alignment} onChange={v => update('alignment', v)} />
            <Field label="Link URL (optional)">
              <Input value={props.link || ''} onChange={e => update('link', e.target.value)} placeholder="https://..." />
            </Field>
          </>
        );

      case 'button':
        return (
          <>
            <Field label="Button Text">
              <Input value={props.text || ''} onChange={e => update('text', e.target.value)} />
            </Field>
            <Field label="URL">
              <Input value={props.url || ''} onChange={e => update('url', e.target.value)} placeholder="https://..." />
            </Field>
            <Field label="Style">
              <Select value={props.style || 'primary'} onValueChange={v => update('style', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">Primary</SelectItem>
                  <SelectItem value="secondary">Secondary</SelectItem>
                  <SelectItem value="outline">Outline</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Size">
              <Select value={props.size || 'md'} onValueChange={v => update('size', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sm">Small</SelectItem>
                  <SelectItem value="md">Medium</SelectItem>
                  <SelectItem value="lg">Large</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <AlignmentField value={props.alignment} onChange={v => update('alignment', v)} />
          </>
        );

      case 'spacer':
        return (
          <Field label="Height (px)">
            <Input type="number" value={props.height || 40} onChange={e => update('height', Number(e.target.value))} min={0} max={400} />
          </Field>
        );

      case 'divider':
        return (
          <>
            <Field label="Style">
              <Select value={props.style || 'solid'} onValueChange={v => update('style', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="solid">Solid</SelectItem>
                  <SelectItem value="dashed">Dashed</SelectItem>
                  <SelectItem value="dotted">Dotted</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Color">
              <div className="flex gap-2">
                <input type="color" value={props.color || '#e5e7eb'} onChange={e => update('color', e.target.value)} className="h-9 w-12 rounded border cursor-pointer" />
                <Input value={props.color || '#e5e7eb'} onChange={e => update('color', e.target.value)} className="flex-1" />
              </div>
            </Field>
            <Field label="Width">
              <Input value={props.width || '100%'} onChange={e => update('width', e.target.value)} placeholder="100% or 500px" />
            </Field>
          </>
        );

      case 'html':
        return (
          <Field label="HTML Code">
            <Textarea value={props.code || ''} onChange={e => update('code', e.target.value)} rows={10} className="font-mono text-xs" />
          </Field>
        );

      case 'video':
        return (
          <>
            <Field label="Video URL">
              <Input value={props.url || ''} onChange={e => update('url', e.target.value)} placeholder="YouTube or Vimeo URL" />
            </Field>
            <Field label="Autoplay">
              <div className="flex items-center gap-2">
                <Switch checked={props.autoplay || false} onCheckedChange={v => update('autoplay', v)} />
                <span className="text-sm text-gray-500">{props.autoplay ? 'On' : 'Off'}</span>
              </div>
            </Field>
          </>
        );

      case 'columns':
        return (
          <Field label="Columns">
            <Select value={String(props.columns || 2)} onValueChange={v => update('columns', Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2 Columns</SelectItem>
                <SelectItem value="3">3 Columns</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        );

      case 'hero':
        return (
          <>
            <Field label="Heading">
              <Input value={props.heading || ''} onChange={e => update('heading', e.target.value)} />
            </Field>
            <Field label="Subtitle">
              <Textarea value={props.subtext || ''} onChange={e => update('subtext', e.target.value)} rows={3} />
            </Field>
            <Field label="Background Image URL">
              <Input value={props.bgImage || ''} onChange={e => update('bgImage', e.target.value)} placeholder="https://..." />
            </Field>
            <Field label="Dark Overlay">
              <div className="flex items-center gap-2">
                <Switch checked={props.overlay ?? true} onCheckedChange={v => update('overlay', v)} />
                <span className="text-sm text-gray-500">{props.overlay !== false ? 'On' : 'Off'}</span>
              </div>
            </Field>
            <Field label="CTA Button 1 Text">
              <Input value={props.ctaText || ''} onChange={e => update('ctaText', e.target.value)} />
            </Field>
            <Field label="CTA Button 1 URL">
              <Input value={props.ctaUrl || ''} onChange={e => update('ctaUrl', e.target.value)} />
            </Field>
            <Field label="CTA Button 2 Text (optional)">
              <Input value={props.ctaText2 || ''} onChange={e => update('ctaText2', e.target.value)} />
            </Field>
            <Field label="CTA Button 2 URL">
              <Input value={props.ctaUrl2 || ''} onChange={e => update('ctaUrl2', e.target.value)} />
            </Field>
          </>
        );

      case 'cards':
        return (
          <>
            <Field label="Grid Columns">
              <Select value={String(props.columns || 3)} onValueChange={v => update('columns', Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 Columns</SelectItem>
                  <SelectItem value="3">3 Columns</SelectItem>
                  <SelectItem value="4">4 Columns</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <div className="space-y-3">
              <Label className="text-sm font-medium">Cards</Label>
              {(props.cards || []).map((card: any, i: number) => (
                <div key={i} className="border rounded-lg p-3 space-y-2 bg-white dark:bg-card">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500">Card {i + 1}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => {
                        const cards = [...(props.cards || [])];
                        cards.splice(i, 1);
                        update('cards', cards);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <Input placeholder="Title" value={card.title || ''} onChange={e => {
                    const cards = [...(props.cards || [])];
                    cards[i] = { ...cards[i], title: e.target.value };
                    update('cards', cards);
                  }} />
                  <Input placeholder="Description" value={card.description || ''} onChange={e => {
                    const cards = [...(props.cards || [])];
                    cards[i] = { ...cards[i], description: e.target.value };
                    update('cards', cards);
                  }} />
                  <Input placeholder="Image URL" value={card.image || ''} onChange={e => {
                    const cards = [...(props.cards || [])];
                    cards[i] = { ...cards[i], image: e.target.value };
                    update('cards', cards);
                  }} />
                  <Input placeholder="Link URL" value={card.link || ''} onChange={e => {
                    const cards = [...(props.cards || [])];
                    cards[i] = { ...cards[i], link: e.target.value };
                    update('cards', cards);
                  }} />
                </div>
              ))}
              <Button variant="outline" size="sm" className="w-full" onClick={() => {
                const cards = [...(props.cards || []), { image: '', title: 'New Card', description: '', link: '' }];
                update('cards', cards);
              }}>
                <Plus className="h-3 w-3 mr-1" /> Add Card
              </Button>
            </div>
          </>
        );

      case 'testimonial':
        return (
          <>
            <Field label="Quote">
              <Textarea value={props.quote || ''} onChange={e => update('quote', e.target.value)} rows={4} />
            </Field>
            <Field label="Author">
              <Input value={props.author || ''} onChange={e => update('author', e.target.value)} />
            </Field>
            <Field label="Rating">
              <Select value={String(props.rating || 5)} onValueChange={v => update('rating', Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1,2,3,4,5].map(r => (
                    <SelectItem key={r} value={String(r)}>{'★'.repeat(r)}{'☆'.repeat(5-r)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Avatar URL">
              <Input value={props.avatar || ''} onChange={e => update('avatar', e.target.value)} placeholder="https://..." />
            </Field>
          </>
        );

      case 'cta':
        return (
          <>
            <Field label="Heading">
              <Input value={props.heading || ''} onChange={e => update('heading', e.target.value)} />
            </Field>
            <Field label="Text">
              <Textarea value={props.text || ''} onChange={e => update('text', e.target.value)} rows={3} />
            </Field>
            <Field label="Button Text">
              <Input value={props.buttonText || ''} onChange={e => update('buttonText', e.target.value)} />
            </Field>
            <Field label="Button URL">
              <Input value={props.buttonUrl || ''} onChange={e => update('buttonUrl', e.target.value)} />
            </Field>
            <Field label="Background Color">
              <div className="flex gap-2">
                <input type="color" value={props.bgColor || '#EF4923'} onChange={e => update('bgColor', e.target.value)} className="h-9 w-12 rounded border cursor-pointer" />
                <Input value={props.bgColor || '#EF4923'} onChange={e => update('bgColor', e.target.value)} className="flex-1" />
              </div>
            </Field>
          </>
        );

      case 'image-gallery':
        return (
          <>
            <Field label="Grid Columns">
              <Select value={String(props.columns || 3)} onValueChange={v => update('columns', Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 Columns</SelectItem>
                  <SelectItem value="3">3 Columns</SelectItem>
                  <SelectItem value="4">4 Columns</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Images</Label>
              {(props.images || []).map((img: any, i: number) => (
                <div key={i} className="flex gap-2 items-start">
                  <div className="flex-1 space-y-1">
                    <Input placeholder="Image URL" value={img.url || ''} onChange={e => {
                      const images = [...(props.images || [])];
                      images[i] = { ...images[i], url: e.target.value };
                      update('images', images);
                    }} />
                    <Input placeholder="Alt text" value={img.alt || ''} onChange={e => {
                      const images = [...(props.images || [])];
                      images[i] = { ...images[i], alt: e.target.value };
                      update('images', images);
                    }} />
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 mt-0.5" onClick={() => {
                    const images = [...(props.images || [])];
                    images.splice(i, 1);
                    update('images', images);
                  }}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" className="w-full" onClick={() => {
                const images = [...(props.images || []), { url: '', alt: '' }];
                update('images', images);
              }}>
                <Plus className="h-3 w-3 mr-1" /> Add Image
              </Button>
            </div>
          </>
        );

      case 'faq':
        return (
          <div className="space-y-3">
            <Label className="text-sm font-medium">FAQ Items</Label>
            {(props.items || []).map((item: any, i: number) => (
              <div key={i} className="border rounded-lg p-3 space-y-2 bg-white dark:bg-card">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500">Item {i + 1}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                    const items = [...(props.items || [])];
                    items.splice(i, 1);
                    update('items', items);
                  }}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <Input placeholder="Question" value={item.question || ''} onChange={e => {
                  const items = [...(props.items || [])];
                  items[i] = { ...items[i], question: e.target.value };
                  update('items', items);
                }} />
                <Textarea placeholder="Answer" value={item.answer || ''} onChange={e => {
                  const items = [...(props.items || [])];
                  items[i] = { ...items[i], answer: e.target.value };
                  update('items', items);
                }} rows={3} />
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full" onClick={() => {
              const items = [...(props.items || []), { question: '', answer: '' }];
              update('items', items);
            }}>
              <Plus className="h-3 w-3 mr-1" /> Add FAQ Item
            </Button>
          </div>
        );

      default:
        return <p className="text-sm text-gray-400">No settings available for this block type.</p>;
    }
  };

  return (
    <div className="w-72 border-l bg-gray-50 dark:bg-muted/30 flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <span className="text-lg">{widget?.icon || '📦'}</span>
          <h3 className="font-semibold text-sm">{widget?.label || block.type} Settings</h3>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {renderSettings()}
        </div>
      </ScrollArea>
    </div>
  );
}

// ── Helper Components ──────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
    </div>
  );
}

function AlignmentField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Field label="Alignment">
      <div className="flex gap-1">
        {(['left', 'center', 'right'] as const).map(a => (
          <Button
            key={a}
            variant={value === a ? 'default' : 'outline'}
            size="sm"
            className="flex-1 capitalize"
            onClick={() => onChange(a)}
          >
            {a === 'left' ? '◀' : a === 'center' ? '◆' : '▶'}
          </Button>
        ))}
      </div>
    </Field>
  );
}
