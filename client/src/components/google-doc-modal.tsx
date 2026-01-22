import { useState } from 'react';
import { X, ExternalLink, Maximize2, Minimize2, Loader2 } from 'lucide-react';

interface GoogleDocModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  docId: string;
  externalUrl?: string;
}

export function GoogleDocModal({ 
  isOpen, 
  onClose, 
  title, 
  docId,
  externalUrl 
}: GoogleDocModalProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  if (!isOpen) return null;

  const embedUrl = `https://docs.google.com/document/d/${docId}/preview`;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/80"
      onClick={onClose}
    >
      <div 
        className={`
          relative flex flex-col
          ${isFullscreen ? 'w-full h-full' : 'w-full max-w-5xl h-[90vh]'}
          bg-background rounded-xl shadow-2xl overflow-hidden
          transition-all duration-300
        `}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 bg-muted border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM6 20V4h6v6h6v10H6z"/>
                <path d="M8 12h8v2H8zm0 4h8v2H8z"/>
              </svg>
            </div>
            <div>
              <h2 className="font-semibold text-foreground">{title}</h2>
              <p className="text-xs text-muted-foreground">Google Document</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {externalUrl && (
              <a
                href={externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground"
                title="Open in new tab"
              >
                <ExternalLink className="w-5 h-5" />
              </a>
            )}
            
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground"
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-5 h-5" />
              ) : (
                <Maximize2 className="w-5 h-5" />
              )}
            </button>
            
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 relative bg-muted/50">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                <p className="text-muted-foreground">Loading document...</p>
              </div>
            </div>
          )}
          
          <iframe
            src={embedUrl}
            className="w-full h-full border-0"
            onLoad={() => setIsLoading(false)}
            title={title}
            allow="autoplay"
          />
        </div>

        <div className="px-4 py-2 bg-muted border-t border-border flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Tip: Use Ctrl/Cmd + F to search within the document
          </p>
          <p className="text-xs text-muted-foreground">
            Viewing in read-only mode
          </p>
        </div>
      </div>
    </div>
  );
}
