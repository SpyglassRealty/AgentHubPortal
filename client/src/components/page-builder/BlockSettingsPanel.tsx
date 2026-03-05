import React from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { X, Plus, Trash2, Upload } from 'lucide-react';
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
              <Input value={props.text || ''} onChange={e => {
                const newText = e.target.value;
                const autoAnchor = newText.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                const currentAnchor = props.anchorId || '';
                const prevAutoAnchor = (props.text || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                // Auto-update anchorId if it was auto-generated or empty
                const newAnchor = (!currentAnchor || currentAnchor === prevAutoAnchor) ? autoAnchor : currentAnchor;
                onUpdate(block.id, { ...props, text: newText, anchorId: newAnchor });
              }} />
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
            {(props.level === 2 || props.level === 3) && (
              <Field label="Anchor ID">
                <Input
                  value={props.anchorId || ''}
                  onChange={e => update('anchorId', e.target.value)}
                  placeholder="auto-generated from text"
                />
                <p className="text-xs text-muted-foreground mt-1">Used for TOC links. Auto-set from heading text.</p>
              </Field>
            )}
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
            <Field label="Alt Text *">
              <Input
                value={props.alt || ''}
                onChange={e => update('alt', e.target.value)}
                className={!props.alt ? 'border-red-400 focus-visible:ring-red-400' : ''}
              />
              {!props.alt && (
                <p className="text-xs text-red-500 mt-1 font-medium">Alt text is required for accessibility & SEO</p>
              )}
            </Field>
            <Field label="Width">
              <Input value={props.width || '100%'} onChange={e => update('width', e.target.value)} placeholder="100% or 500px" />
            </Field>
            <AlignmentField value={props.alignment} onChange={v => update('alignment', v)} />
            <Field label="Lazy Loading">
              <div className="flex items-center gap-2">
                <Switch
                  checked={(props.loading || 'lazy') === 'lazy'}
                  onCheckedChange={v => update('loading', v ? 'lazy' : 'eager')}
                />
                <span className="text-sm text-gray-500">{(props.loading || 'lazy') === 'lazy' ? 'Lazy (recommended)' : 'Eager'}</span>
              </div>
            </Field>
            <Field label="Srcset (optional)">
              <Textarea
                value={props.srcset || ''}
                onChange={e => update('srcset', e.target.value)}
                placeholder="img-400.jpg 400w, img-800.jpg 800w"
                rows={2}
                className="text-xs"
              />
            </Field>
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
            <Field label="Hero Image">
              <div className="space-y-2">
                {props.bgImage && (
                  <img src={props.bgImage} alt="Hero preview" className="w-full h-32 object-cover rounded-lg" />
                )}
                <div className="flex gap-2">
                  <Input
                    value={props.bgImage || ''}
                    onChange={e => update('bgImage', e.target.value)}
                    placeholder="Image URL or upload below..."
                    className="flex-1"
                  />
                </div>
                <label className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm">
                  <Upload className="h-4 w-4" />
                  <span>Upload Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const formData = new FormData();
                      formData.append('image', file);
                      try {
                        const res = await fetch('/api/admin/uploads', { method: 'POST', credentials: 'include', body: formData });
                        const data = await res.json();
                        if (data.success && data.url) {
                          update('bgImage', data.url);
                        }
                      } catch (err) {
                        console.error('Upload failed:', err);
                      }
                    }}
                  />
                </label>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={async () => {
                    const imageUrl = props.bgImage;
                    if (!imageUrl || imageUrl.startsWith('/uploads/')) return;
                    try {
                      const res = await fetch('/api/admin/uploads/from-url', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ url: imageUrl }),
                      });
                      const data = await res.json();
                      if (data.success && data.url) {
                        update('bgImage', data.url);
                      }
                    } catch (err) {
                      console.error('URL import failed:', err);
                    }
                  }}
                  disabled={!props.bgImage || props.bgImage.startsWith('/uploads/')}
                >
                  Download &amp; Host Image
                </Button>
              </div>
            </Field>
            <Field label="Dark Overlay">
              <div className="flex items-center gap-2">
                <Switch checked={props.overlay ?? true} onCheckedChange={v => update('overlay', v)} />
                <span className="text-sm text-gray-500">{props.overlay !== false ? 'On' : 'Off'}</span>
              </div>
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

      case 'toc':
        return (
          <div className="space-y-3">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-700 font-medium">Auto-Generated Block</p>
              <p className="text-xs text-blue-600 mt-1">
                The Table of Contents automatically updates based on H2 and H3 headings in this page.
                No manual editing needed.
              </p>
            </div>
            <div className="text-xs text-gray-500">
              <p className="font-medium mb-1">Currently tracking:</p>
              {(props.headings || []).length === 0 ? (
                <p className="italic">No H2/H3 headings on this page yet.</p>
              ) : (
                <ul className="space-y-0.5">
                  {(props.headings || []).map((h: any, i: number) => (
                    <li key={i} style={{ paddingLeft: h.level === 3 ? '0.75rem' : '0' }}>
                      {h.level === 2 ? '▸' : '↳'} {h.text}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        );

      case 'idx-feed':
        return <IdxFeedSettings props={props} update={update} />;

      // Core Pages blocks
      case 'core-hero':
        return (
          <>
            <Field label="Title">
              <Input value={props.title || ''} onChange={e => update('title', e.target.value)} />
            </Field>
            <Field label="Subtitle">
              <Input value={props.subtitle || ''} onChange={e => update('subtitle', e.target.value)} />
            </Field>
            <Field label="Background Image URL">
              <Input value={props.backgroundImage || ''} onChange={e => update('backgroundImage', e.target.value)} placeholder="https://..." />
            </Field>
            <Field label="Overlay Opacity">
              <Input type="number" min="0" max="1" step="0.1" value={props.overlayOpacity || 0.4} onChange={e => update('overlayOpacity', e.target.value)} />
            </Field>
            <Field label="Height">
              <Input value={props.height || '300px'} onChange={e => update('height', e.target.value)} placeholder="300px, 50vh, etc." />
            </Field>
          </>
        );

      case 'core-split':
        return (
          <>
            <Field label="Image URL">
              <Input value={props.imageUrl || ''} onChange={e => update('imageUrl', e.target.value)} placeholder="https://..." />
            </Field>
            <Field label="Image Alt Text">
              <Input value={props.imageAlt || ''} onChange={e => update('imageAlt', e.target.value)} />
            </Field>
            <Field label="Heading">
              <Input value={props.heading || ''} onChange={e => update('heading', e.target.value)} />
            </Field>
            <Field label="Content">
              <Textarea value={props.content || ''} onChange={e => update('content', e.target.value)} rows={4} />
            </Field>
            <Field label="Primary Button Text">
              <Input value={props.primaryButtonText || ''} onChange={e => update('primaryButtonText', e.target.value)} />
            </Field>
            <Field label="Primary Button URL">
              <Input value={props.primaryButtonUrl || '#'} onChange={e => update('primaryButtonUrl', e.target.value)} />
            </Field>
            <Field label="Secondary Button Text">
              <Input value={props.secondaryButtonText || ''} onChange={e => update('secondaryButtonText', e.target.value)} />
            </Field>
            <Field label="Secondary Button URL">
              <Input value={props.secondaryButtonUrl || '#'} onChange={e => update('secondaryButtonUrl', e.target.value)} />
            </Field>
            <Field label="Reverse Layout">
              <Select value={props.reverse ? 'true' : 'false'} onValueChange={v => update('reverse', v === 'true')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="false">Image Left</SelectItem>
                  <SelectItem value="true">Image Right</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Background">
              <Select value={props.background || 'white'} onValueChange={v => update('background', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="white">White</SelectItem>
                  <SelectItem value="light">Light Gray</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </>
        );

      case 'core-cards':
        return (
          <>
            <Field label="Section Heading">
              <Input value={props.heading || ''} onChange={e => update('heading', e.target.value)} />
            </Field>
            <Field label="Columns">
              <Select value={String(props.columns || 3)} onValueChange={v => update('columns', Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 Columns</SelectItem>
                  <SelectItem value="3">3 Columns</SelectItem>
                  <SelectItem value="4">4 Columns</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Background">
              <Select value={props.background || 'white'} onValueChange={v => update('background', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="white">White</SelectItem>
                  <SelectItem value="light">Light Gray</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Cards">
              <div className="space-y-3">
                {(props.cards || []).map((card: any, i: number) => (
                  <div key={i} className="p-3 border rounded space-y-2">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Card {i + 1}</span>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => {
                        const newCards = [...(props.cards || [])];
                        newCards.splice(i, 1);
                        update('cards', newCards);
                      }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <Input placeholder="Title" value={card.title || ''} onChange={e => {
                      const newCards = [...(props.cards || [])];
                      newCards[i] = { ...newCards[i], title: e.target.value };
                      update('cards', newCards);
                    }} />
                    <Textarea placeholder="Description" rows={2} value={card.description || ''} onChange={e => {
                      const newCards = [...(props.cards || [])];
                      newCards[i] = { ...newCards[i], description: e.target.value };
                      update('cards', newCards);
                    }} />
                    <Input placeholder="Image URL" value={card.imageUrl || ''} onChange={e => {
                      const newCards = [...(props.cards || [])];
                      newCards[i] = { ...newCards[i], imageUrl: e.target.value };
                      update('cards', newCards);
                    }} />
                    <Input placeholder="Link Text" value={card.linkText || ''} onChange={e => {
                      const newCards = [...(props.cards || [])];
                      newCards[i] = { ...newCards[i], linkText: e.target.value };
                      update('cards', newCards);
                    }} />
                    <Input placeholder="Link URL" value={card.linkUrl || '#'} onChange={e => {
                      const newCards = [...(props.cards || [])];
                      newCards[i] = { ...newCards[i], linkUrl: e.target.value };
                      update('cards', newCards);
                    }} />
                  </div>
                ))}
                <Button size="sm" variant="outline" className="w-full" onClick={() => {
                  const newCards = [...(props.cards || []), { title: 'New Card', description: 'Description', linkText: 'Learn More', linkUrl: '#' }];
                  update('cards', newCards);
                }}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add Card
                </Button>
              </div>
            </Field>
          </>
        );

      case 'core-testimonial':
        return (
          <>
            <Field label="Section Heading">
              <Input value={props.heading || ''} onChange={e => update('heading', e.target.value)} />
            </Field>
            <Field label="Background">
              <Select value={props.background || 'light'} onValueChange={v => update('background', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="white">White</SelectItem>
                  <SelectItem value="light">Light Gray</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Testimonials">
              <div className="space-y-3">
                {(props.testimonials || []).map((item: any, i: number) => (
                  <div key={i} className="p-3 border rounded space-y-2">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Testimonial {i + 1}</span>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => {
                        const newItems = [...(props.testimonials || [])];
                        newItems.splice(i, 1);
                        update('testimonials', newItems);
                      }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <Textarea placeholder="Quote" rows={3} value={item.quote || ''} onChange={e => {
                      const newItems = [...(props.testimonials || [])];
                      newItems[i] = { ...newItems[i], quote: e.target.value };
                      update('testimonials', newItems);
                    }} />
                    <Input placeholder="Author Name" value={item.author || ''} onChange={e => {
                      const newItems = [...(props.testimonials || [])];
                      newItems[i] = { ...newItems[i], author: e.target.value };
                      update('testimonials', newItems);
                    }} />
                    <Select value={String(item.rating || 5)} onValueChange={v => {
                      const newItems = [...(props.testimonials || [])];
                      newItems[i] = { ...newItems[i], rating: Number(v) };
                      update('testimonials', newItems);
                    }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[1,2,3,4,5].map(r => (
                          <SelectItem key={r} value={String(r)}>{'★'.repeat(r)}{'☆'.repeat(5-r)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
                <Button size="sm" variant="outline" className="w-full" onClick={() => {
                  const newItems = [...(props.testimonials || []), { quote: 'Great experience!', author: 'New Client', rating: 5 }];
                  update('testimonials', newItems);
                }}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add Testimonial
                </Button>
              </div>
            </Field>
          </>
        );

      case 'core-text':
        return (
          <>
            <Field label="Heading">
              <Input value={props.heading || ''} onChange={e => update('heading', e.target.value)} />
            </Field>
            <Field label="Content">
              <Textarea value={props.content || ''} onChange={e => update('content', e.target.value)} rows={6} />
            </Field>
            <Field label="Text Align">
              <Select value={props.textAlign || 'center'} onValueChange={v => update('textAlign', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Max Width">
              <Input value={props.maxWidth || '800px'} onChange={e => update('maxWidth', e.target.value)} placeholder="800px, 100%, etc." />
            </Field>
            <Field label="Background">
              <Select value={props.background || 'white'} onValueChange={v => update('background', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="white">White</SelectItem>
                  <SelectItem value="light">Light Gray</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </>
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

// ── IDX Feed Settings ──────────────────────────────────

function IdxFeedSettings({ props, update }: { props: Record<string, any>; update: (key: string, value: any) => void }) {
  const { data: communities = [] } = useQuery<Array<{ id: number; name: string; slug: string }>>({
    queryKey: ['/api/admin/communities/with-polygons'],
    queryFn: async () => {
      const res = await fetch('/api/admin/communities/with-polygons', { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 60000,
  });

  return (
    <>
      <Field label="Community">
        <Select
          value={props.communityId ? String(props.communityId) : 'all'}
          onValueChange={(v) => update('communityId', v === 'all' ? null : parseInt(v))}
        >
          <SelectTrigger><SelectValue placeholder="Select community" /></SelectTrigger>
          <SelectContent className="max-h-60 overflow-y-auto">
            <SelectItem value="all">All Communities</SelectItem>
            {communities.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Search Type">
        <Select
          value={props.searchType || 'Residential'}
          onValueChange={(v) => update('searchType', v)}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Residential">Residential</SelectItem>
            <SelectItem value="Commercial">Commercial</SelectItem>
            <SelectItem value="Land">Land</SelectItem>
            <SelectItem value="MultiFamily">Multi-Family</SelectItem>
            <SelectItem value="Rental">Rental</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Search Subtype">
        <Input
          value={props.searchSubtype || ''}
          onChange={(e) => update('searchSubtype', e.target.value)}
          placeholder="e.g., SingleFamily, Condo, Townhouse"
        />
      </Field>
      <Field label="Sort Field">
        <Select
          value={props.sortField || 'ListingPrice'}
          onValueChange={(v) => update('sortField', v)}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ListingPrice">Listing Price</SelectItem>
            <SelectItem value="ListDate">List Date</SelectItem>
            <SelectItem value="ModificationTimestamp">Last Modified</SelectItem>
            <SelectItem value="LivingArea">Square Footage</SelectItem>
            <SelectItem value="BedroomsTotal">Bedrooms</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Sort Order">
        <Select
          value={props.sortOrder || 'DESC'}
          onValueChange={(v) => update('sortOrder', v)}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="DESC">Descending (High to Low)</SelectItem>
            <SelectItem value="ASC">Ascending (Low to High)</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Results Per Page">
        <Select
          value={String(props.pageLimit || 12)}
          onValueChange={(v) => update('pageLimit', parseInt(v))}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="6">6</SelectItem>
            <SelectItem value="9">9</SelectItem>
            <SelectItem value="12">12</SelectItem>
            <SelectItem value="18">18</SelectItem>
            <SelectItem value="24">24</SelectItem>
          </SelectContent>
        </Select>
      </Field>
    </>
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
