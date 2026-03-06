import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Bold, 
  Italic, 
  Underline, 
  Link, 
  List, 
  ListOrdered, 
  Heading1, 
  Heading2, 
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  Image,
  Code,
  Quote,
  AlignLeft,
  AlignCenter,
  AlignRight
} from 'lucide-react';

interface WYSIWYGEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: string;
}

export function WYSIWYGEditor({ 
  value, 
  onChange, 
  placeholder = "Start typing...",
  height = "300px" 
}: WYSIWYGEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      const content = editorRef.current.innerHTML;
      onChange(content);
    }
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
    }
    handleInput();
  };

  const formatBlock = (tag: string) => {
    execCommand('formatBlock', `<${tag}>`);
  };

  const insertLink = () => {
    const selection = window.getSelection();
    const selectedText = selection?.toString() || '';
    
    if (selectedText) {
      setLinkText(selectedText);
    }
    setIsLinkModalOpen(true);
  };

  const handleLinkSubmit = () => {
    if (linkUrl) {
      if (linkText && window.getSelection()?.toString() !== linkText) {
        // Insert new link with custom text
        const linkHtml = `<a href="${linkUrl}" target="_blank" rel="noopener noreferrer">${linkText}</a>`;
        execCommand('insertHTML', linkHtml);
      } else {
        // Create link from selection
        execCommand('createLink', linkUrl);
      }
    }
    setIsLinkModalOpen(false);
    setLinkUrl('');
    setLinkText('');
  };

  const insertImage = () => {
    const url = prompt('Enter image URL:');
    if (url) {
      const alt = prompt('Enter alt text (optional):') || '';
      const imgHtml = `<img src="${url}" alt="${alt}" style="max-width: 100%; height: auto; border-radius: 4px; margin: 8px 0;" />`;
      execCommand('insertHTML', imgHtml);
    }
  };

  const insertHTML = () => {
    const html = prompt('Enter custom HTML:');
    if (html) {
      execCommand('insertHTML', html);
    }
  };

  const toolbarButtons = [
    {
      group: 'headings',
      buttons: [
        { icon: Heading1, command: () => formatBlock('h1'), title: 'Heading 1' },
        { icon: Heading2, command: () => formatBlock('h2'), title: 'Heading 2' },
        { icon: Heading3, command: () => formatBlock('h3'), title: 'Heading 3' },
        { icon: Heading4, command: () => formatBlock('h4'), title: 'Heading 4' },
        { icon: Heading5, command: () => formatBlock('h5'), title: 'Heading 5' },
        { icon: Heading6, command: () => formatBlock('h6'), title: 'Heading 6' },
      ]
    },
    {
      group: 'formatting',
      buttons: [
        { icon: Bold, command: () => execCommand('bold'), title: 'Bold' },
        { icon: Italic, command: () => execCommand('italic'), title: 'Italic' },
        { icon: Underline, command: () => execCommand('underline'), title: 'Underline' },
      ]
    },
    {
      group: 'alignment',
      buttons: [
        { icon: AlignLeft, command: () => execCommand('justifyLeft'), title: 'Align Left' },
        { icon: AlignCenter, command: () => execCommand('justifyCenter'), title: 'Align Center' },
        { icon: AlignRight, command: () => execCommand('justifyRight'), title: 'Align Right' },
      ]
    },
    {
      group: 'lists',
      buttons: [
        { icon: List, command: () => execCommand('insertUnorderedList'), title: 'Bullet List' },
        { icon: ListOrdered, command: () => execCommand('insertOrderedList'), title: 'Numbered List' },
      ]
    },
    {
      group: 'media',
      buttons: [
        { icon: Link, command: insertLink, title: 'Insert Link' },
        { icon: Image, command: insertImage, title: 'Insert Image' },
      ]
    },
    {
      group: 'advanced',
      buttons: [
        { icon: Quote, command: () => formatBlock('blockquote'), title: 'Blockquote' },
        { icon: Code, command: insertHTML, title: 'Custom HTML' },
      ]
    }
  ];

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="bg-gray-50 border-b border-gray-300 p-2 flex flex-wrap gap-1">
        {toolbarButtons.map((group, groupIndex) => (
          <React.Fragment key={group.group}>
            <div className="flex gap-0.5">
              {group.buttons.map((button, buttonIndex) => {
                const IconComponent = button.icon;
                return (
                  <Button
                    key={buttonIndex}
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={button.command}
                    className="h-8 w-8 p-0"
                    title={button.title}
                  >
                    <IconComponent className="w-4 h-4" />
                  </Button>
                );
              })}
            </div>
            {groupIndex < toolbarButtons.length - 1 && (
              <div className="w-px h-8 bg-gray-300 mx-1" />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className="p-4 focus:outline-none prose prose-gray max-w-none"
        style={{ 
          minHeight: height,
          maxHeight: '600px',
          overflowY: 'auto'
        }}
        dangerouslySetInnerHTML={{ __html: value }}
        suppressContentEditableWarning={true}
      />

      {/* Link Modal */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-sm mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Insert Link</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Link Text
                </label>
                <Input
                  type="text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="Link text"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL
                </label>
                <Input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                  autoFocus
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setIsLinkModalOpen(false);
                  setLinkUrl('');
                  setLinkText('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleLinkSubmit}
                disabled={!linkUrl}
              >
                Insert Link
              </Button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        [contenteditable]:empty:before {
          content: '${placeholder}';
          color: #9ca3af;
          pointer-events: none;
          font-style: italic;
        }
        
        [contenteditable] h1,
        [contenteditable] h2,
        [contenteditable] h3,
        [contenteditable] h4,
        [contenteditable] h5,
        [contenteditable] h6 {
          margin: 1rem 0 0.5rem 0;
          font-weight: bold;
          line-height: 1.3;
        }
        
        [contenteditable] h1 { font-size: 2rem; }
        [contenteditable] h2 { font-size: 1.5rem; }
        [contenteditable] h3 { font-size: 1.25rem; }
        [contenteditable] h4 { font-size: 1.125rem; }
        [contenteditable] h5 { font-size: 1rem; }
        [contenteditable] h6 { font-size: 0.875rem; }
        
        [contenteditable] p {
          margin: 0.5rem 0;
          line-height: 1.6;
        }
        
        [contenteditable] ul,
        [contenteditable] ol {
          margin: 0.5rem 0;
          padding-left: 2rem;
        }
        
        [contenteditable] li {
          margin: 0.25rem 0;
          line-height: 1.6;
        }
        
        [contenteditable] blockquote {
          border-left: 4px solid #e5e7eb;
          margin: 1rem 0;
          padding: 0.5rem 0 0.5rem 1rem;
          font-style: italic;
          color: #6b7280;
          background: #f9fafb;
        }
        
        [contenteditable] a {
          color: #2563eb;
          text-decoration: underline;
        }
        
        [contenteditable] a:hover {
          color: #1d4ed8;
        }
      `}</style>
    </div>
  );
}