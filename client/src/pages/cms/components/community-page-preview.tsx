import { BlockRenderer } from "../editor/block-renderer";
import { CommunityFooter, useFooterData } from "./community-footer";
import type { PageContent, CmsPage } from "../types";

interface CommunityPagePreviewProps {
  page: Partial<CmsPage>;
  content: PageContent;
  showFooter?: boolean;
}

export function CommunityPagePreview({ page, content, showFooter = true }: CommunityPagePreviewProps) {
  const { footerData } = useFooterData();
  
  return (
    <div className="min-h-screen bg-white">
      {/* Page Header */}
      {page.featuredImageUrl && (
        <div className="relative h-64 bg-gray-900 overflow-hidden">
          <img 
            src={page.featuredImageUrl} 
            alt={page.title} 
            className="w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
            <div className="text-center text-white">
              <h1 className="text-4xl font-bold mb-2">{page.title || 'Community Page'}</h1>
              {page.excerpt && (
                <p className="text-lg opacity-90 max-w-2xl">{page.excerpt}</p>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto">
        {content.sections.map((section) => (
          <div key={section.id} className="w-full">
            <div 
              className={`grid grid-cols-12 gap-4`}
              style={{
                padding: section.style?.padding,
                margin: section.style?.margin,
                backgroundColor: section.style?.backgroundColor,
                color: section.style?.textColor,
              }}
            >
              {section.columns.map((column) => (
                <div 
                  key={column.id} 
                  className={`col-span-${column.width} space-y-4`}
                >
                  {column.blocks.map((block) => (
                    <div key={block.id}>
                      <BlockRenderer block={block} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer - Always render for community pages */}
      {showFooter && page.type === 'community' && footerData && (
        <CommunityFooter data={footerData} />
      )}
    </div>
  );
}

export function CommunityPagePreviewModal({ 
  isOpen, 
  onClose, 
  page, 
  content 
}: {
  isOpen: boolean;
  onClose: () => void;
  page: Partial<CmsPage>;
  content: PageContent;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg w-full h-full max-w-6xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Community Page Preview</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl font-bold"
          >
            ×
          </button>
        </div>
        <div className="overflow-auto h-full">
          <CommunityPagePreview page={page} content={content} />
        </div>
      </div>
    </div>
  );
}