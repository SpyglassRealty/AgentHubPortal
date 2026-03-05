import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { nanoid } from 'nanoid';
import { HTMLImportParser } from '@/utils/html-import-parser';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, Upload, FileText, Check, AlertCircle, X } from 'lucide-react';
import type { BlockData } from '@/components/page-builder/types';

interface HTMLImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (blocks: BlockData[]) => void;
}

interface ImportPreview {
  fileName: string;
  seo: {
    title: string;
    description: string;
    canonical: string;
    ogImage: string;
    keywords: string;
  };
  blocks: BlockData[];
  assetCount: number;
}

export function HTMLImportDialog({ isOpen, onClose, onImport }: HTMLImportDialogProps) {
  const [parsing, setParsing] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preserveOriginal, setPreserveOriginal] = useState(true);
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [importProgress, setImportProgress] = useState({
    status: 'idle',
    message: '',
    progress: 0
  });

  const parser = new HTMLImportParser();

  /**
   * Process dropped HTML file
   */
  const handleFileDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setError(null);
    setParsing(true);
    setImportProgress({ status: 'parsing', message: 'Reading HTML file...', progress: 10 });

    try {
      // Read file content
      const content = await file.text();
      setHtmlContent(content); // Store original HTML
      setImportProgress({ status: 'parsing', message: 'Parsing HTML structure...', progress: 30 });

      // Parse HTML to blocks
      const result = parser.parseHTML(content);
      
      setImportProgress({ status: 'parsing', message: 'Converting to page blocks...', progress: 60 });

      // Process assets if needed
      if (result.assets.length > 0) {
        setImportProgress({ 
          status: 'assets', 
          message: `Found ${result.assets.length} images to import...`, 
          progress: 70 
        });
        // In real implementation, would download and re-host assets here
      }

      setImportProgress({ status: 'complete', message: 'Import complete!', progress: 100 });

      // Set preview
      setPreview({
        fileName: file.name,
        seo: result.seo,
        blocks: result.blocks,
        assetCount: result.assets.length
      });

    } catch (err) {
      setError(`Failed to parse HTML: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setImportProgress({ status: 'error', message: 'Import failed', progress: 0 });
    } finally {
      setParsing(false);
    }
  }, [parser]);

  /**
   * Dropzone configuration
   */
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFileDrop,
    accept: {
      'text/html': ['.html', '.htm']
    },
    maxFiles: 1,
    disabled: parsing
  });

  /**
   * Import blocks into page builder
   */
  const handleImportBlocks = () => {
    if (!preview) return;
    
    if (preserveOriginal) {
      // Create a single HTML widget with the original content
      const htmlBlock: BlockData = {
        id: nanoid(),
        type: 'html',
        props: {
          content: htmlContent || ''
        }
      };
      onImport([htmlBlock]);
    } else {
      // Use the parsed blocks
      onImport(preview.blocks);
    }
    
    handleReset();
    onClose();
  };

  /**
   * Reset state
   */
  const handleReset = () => {
    setPreview(null);
    setError(null);
    setHtmlContent('');
    setImportProgress({ status: 'idle', message: '', progress: 0 });
  };

  /**
   * Render block preview
   */
  const renderBlockPreview = (block: BlockData, index: number) => {
    const typeLabels: Record<string, string> = {
      'idx-hero': 'Hero Section',
      'idx-cards': 'Feature Cards',
      'idx-two-column': 'Two Column Layout',
      'idx-testimonials': 'Testimonials',
      'idx-neighborhoods': 'Neighborhood Grid',
      'idx-features': 'Services List',
      'text': 'Text Content',
      'faq': 'FAQ Section'
    };

    return (
      <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-muted rounded">
        <div className="w-2 h-2 bg-[#EF4923] rounded-full"></div>
        <div className="flex-1">
          <div className="font-medium text-sm">{typeLabels[block.type] || block.type}</div>
          {block.props.heading && (
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{block.props.heading}</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import HTML Page</DialogTitle>
          <DialogDescription>
            Drop an HTML file to automatically convert it into page builder blocks
          </DialogDescription>
        </DialogHeader>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Drop Zone */}
        {!preview && (
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
              transition-colors duration-200
              ${isDragActive ? 'border-[#EF4923] bg-orange-50 dark:bg-orange-950/20' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'}
              ${parsing ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <input {...getInputProps()} />
            
            {parsing ? (
              <div className="space-y-4">
                <Loader2 className="w-12 h-12 mx-auto text-[#EF4923] animate-spin" />
                <div>
                  <p className="text-lg font-medium">{importProgress.message}</p>
                  <Progress value={importProgress.progress} className="w-64 mx-auto mt-3" />
                </div>
              </div>
            ) : (
              <>
                <Upload className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <p className="text-lg mb-2">
                  {isDragActive ? 'Drop HTML file here' : 'Drag & drop HTML file here'}
                </p>
                <p className="text-sm text-gray-500">or click to browse</p>
              </>
            )}
          </div>
        )}

        {/* Preview */}
        {preview && (
          <div className="space-y-4">
            <Card className="p-4">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    {preview.fileName}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {preview.blocks.length} sections • {preview.assetCount} images
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleReset}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* SEO Preview */}
              {(preview.seo.title || preview.seo.description) && (
                <div className="mb-4 p-4 bg-gray-50 dark:bg-muted rounded">
                  <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-2">Page Details</h4>
                  <div className="space-y-2 text-sm">
                    {preview.seo.title && (
                      <div>
                        <span className="text-gray-500">Title:</span>{' '}
                        <span className="font-medium">{preview.seo.title}</span>
                      </div>
                    )}
                    {preview.seo.description && (
                      <div>
                        <span className="text-gray-500">Description:</span>{' '}
                        <span>{preview.seo.description}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Import Options */}
              <div className="flex items-center space-x-2 p-4 bg-gray-50 dark:bg-muted rounded mb-4">
                <Switch
                  id="preserve-html"
                  checked={preserveOriginal}
                  onCheckedChange={setPreserveOriginal}
                />
                <Label htmlFor="preserve-html" className="text-sm font-medium cursor-pointer">
                  Preserve original HTML and styling
                  <span className="block text-xs text-gray-500 font-normal">
                    Keep custom CSS and structure intact (recommended for complex layouts)
                  </span>
                </Label>
              </div>

              {/* Blocks Preview */}
              {!preserveOriginal && (
                <div>
                  <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-3">Page Structure</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {preview.blocks.map((block, index) => renderBlockPreview(block, index))}
                  </div>
                </div>
              )}
            </Card>

            {/* Actions */}
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleImportBlocks}
                disabled={!preserveOriginal && preview.blocks.length === 0}
              >
                <Check className="w-4 h-4 mr-2" />
                {preserveOriginal ? 'Import as HTML' : `Import ${preview.blocks.length} Blocks`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}