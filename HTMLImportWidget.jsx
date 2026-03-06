import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import HTMLImportParser from './html-import-parser';
import { Button, Card, Alert, Spinner } from '@/components/ui';
import { Upload, FileText, Check, AlertCircle } from 'lucide-react';

/**
 * HTML Import Widget for Mission Control Page Builder
 * Allows drag & drop import of HTML files to create pages
 */
const HTMLImportWidget = ({ onImport, onCancel }) => {
  const [parsing, setParsing] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const [importProgress, setImportProgress] = useState({
    status: 'idle',
    message: '',
    progress: 0
  });

  const parser = new HTMLImportParser();

  /**
   * Process dropped HTML file
   */
  const handleFileDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setError(null);
    setParsing(true);
    setImportProgress({ status: 'parsing', message: 'Reading HTML file...', progress: 10 });

    try {
      // Read file content
      const content = await file.text();
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
      setError(`Failed to parse HTML: ${err.message}`);
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
   * Create page from parsed content
   */
  const handleCreatePage = async () => {
    if (!preview) return;

    setImportProgress({ status: 'creating', message: 'Creating page...', progress: 0 });

    try {
      const pageData = {
        title: preview.seo.title || 'Imported Page',
        slug: generateSlug(preview.seo.title),
        seo: {
          metaTitle: preview.seo.title,
          metaDescription: preview.seo.description,
          canonical: preview.seo.canonical,
          ogImage: preview.seo.ogImage
        },
        blocks: preview.blocks,
        status: 'draft'
      };

      await onImport(pageData);
      
      setImportProgress({ status: 'success', message: 'Page created successfully!', progress: 100 });
      
    } catch (err) {
      setError(`Failed to create page: ${err.message}`);
      setImportProgress({ status: 'error', message: 'Failed to create page', progress: 0 });
    }
  };

  /**
   * Generate slug from title
   */
  const generateSlug = (title) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  /**
   * Render block preview
   */
  const renderBlockPreview = (block, index) => {
    const typeLabels = {
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
      <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded">
        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
        <div>
          <div className="font-medium text-sm">{typeLabels[block.type] || block.type}</div>
          {block.props.heading && (
            <div className="text-xs text-gray-600 mt-1">{block.props.heading}</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Import HTML Page</h2>
        <p className="text-gray-600">
          Drop an HTML file to automatically convert it into page builder blocks
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="error" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </Alert>
      )}

      {/* Drop Zone */}
      {!preview && (
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
            transition-colors duration-200
            ${isDragActive ? 'border-orange-500 bg-orange-50' : 'border-gray-300 hover:border-gray-400'}
            ${parsing ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input {...getInputProps()} />
          
          {parsing ? (
            <div className="space-y-4">
              <Spinner className="w-12 h-12 mx-auto text-orange-500" />
              <div>
                <p className="text-lg font-medium">{importProgress.message}</p>
                <div className="w-64 mx-auto mt-3 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${importProgress.progress}%` }}
                  />
                </div>
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
        <Card className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {preview.fileName}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {preview.blocks.length} sections • {preview.assetCount} images
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setPreview(null);
                setError(null);
                setImportProgress({ status: 'idle', message: '', progress: 0 });
              }}
            >
              Clear
            </Button>
          </div>

          {/* SEO Preview */}
          <div className="mb-6 p-4 bg-gray-50 rounded">
            <h4 className="font-medium text-sm text-gray-700 mb-2">Page Details</h4>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-500">Title:</span>{' '}
                <span className="font-medium">{preview.seo.title || 'No title'}</span>
              </div>
              {preview.seo.description && (
                <div>
                  <span className="text-gray-500">Description:</span>{' '}
                  <span>{preview.seo.description}</span>
                </div>
              )}
              <div>
                <span className="text-gray-500">Slug:</span>{' '}
                <span className="font-mono text-xs bg-gray-200 px-2 py-1 rounded">
                  {generateSlug(preview.seo.title || 'imported-page')}
                </span>
              </div>
            </div>
          </div>

          {/* Blocks Preview */}
          <div className="mb-6">
            <h4 className="font-medium text-sm text-gray-700 mb-3">Page Structure</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {preview.blocks.map((block, index) => renderBlockPreview(block, index))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreatePage}
              disabled={importProgress.status === 'creating'}
            >
              {importProgress.status === 'creating' ? (
                <>
                  <Spinner className="w-4 h-4 mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Create Page
                </>
              )}
            </Button>
          </div>

          {/* Success Message */}
          {importProgress.status === 'success' && (
            <Alert variant="success" className="mt-4">
              <Check className="h-4 w-4" />
              <span>Page created successfully! Redirecting to editor...</span>
            </Alert>
          )}
        </Card>
      )}
    </div>
  );
};

export default HTMLImportWidget;