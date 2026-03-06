/**
 * Integration example for HTML Import in Mission Control Page Builder
 */

import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui';
import { Upload, Plus } from 'lucide-react';
import HTMLImportWidget from './HTMLImportWidget';

// Add to existing page builder toolbar
const PageBuilderToolbar = ({ onAddWidget }) => {
  const [showImport, setShowImport] = useState(false);
  
  return (
    <>
      <div className="flex items-center gap-2 p-4 border-b">
        <Button onClick={() => onAddWidget()}>
          <Plus className="w-4 h-4 mr-2" />
          Add Widget
        </Button>
        
        <Button 
          variant="outline" 
          onClick={() => setShowImport(true)}
        >
          <Upload className="w-4 h-4 mr-2" />
          Import HTML
        </Button>
      </div>
      
      {/* Import Modal */}
      {showImport && (
        <ImportModal 
          onClose={() => setShowImport(false)}
        />
      )}
    </>
  );
};

// Import Modal Component
const ImportModal = ({ onClose }) => {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  
  const handleImport = async (pageData) => {
    setCreating(true);
    
    try {
      // Create page via API
      const response = await fetch('/api/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...pageData,
          // Convert blocks to Mission Control format
          content: {
            blocks: pageData.blocks.map(block => ({
              id: generateId(),
              type: block.type,
              data: block.props
            }))
          }
        })
      });
      
      const newPage = await response.json();
      
      // Redirect to edit the new page
      router.push(`/admin/pages/${newPage.id}/edit`);
      
    } catch (error) {
      console.error('Failed to create page:', error);
      alert('Failed to create page. Please try again.');
    } finally {
      setCreating(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <HTMLImportWidget 
          onImport={handleImport}
          onCancel={onClose}
        />
      </div>
    </div>
  );
};

// API endpoint to handle import
export async function POST(req) {
  const { blocks, seo, title, slug } = await req.json();
  
  // Process and store assets
  const processedBlocks = await Promise.all(
    blocks.map(async (block) => {
      if (block.assets && block.assets.length > 0) {
        // Download and re-host images
        const newAssets = await Promise.all(
          block.assets.map(url => downloadAndStoreImage(url))
        );
        
        // Update block with new URLs
        return updateBlockAssets(block, newAssets);
      }
      return block;
    })
  );
  
  // Create page in database
  const page = await db.pages.create({
    title,
    slug,
    seo,
    content: { blocks: processedBlocks },
    status: 'draft',
    createdBy: req.user.id
  });
  
  return Response.json(page);
}

// Helper to download and store images
async function downloadAndStoreImage(url) {
  try {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    const fileName = url.split('/').pop();
    
    // Upload to your CDN/storage
    const newUrl = await uploadToStorage(buffer, fileName);
    
    return { original: url, new: newUrl };
  } catch (error) {
    console.error(`Failed to download image: ${url}`, error);
    return { original: url, new: url }; // Fallback to original
  }
}

// Helper to generate unique IDs
function generateId() {
  return `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Usage in page builder
const PageBuilder = () => {
  return (
    <div className="page-builder">
      <PageBuilderToolbar 
        onAddWidget={handleAddWidget}
      />
      
      {/* Rest of page builder UI */}
    </div>
  );
};