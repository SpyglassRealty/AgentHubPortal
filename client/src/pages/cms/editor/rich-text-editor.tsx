import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link2,
  Image,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  Code,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Type,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const editorRef = useRef<HTMLDivElement>(null);

  const execCommand = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const insertHeading = useCallback((level: string) => {
    execCommand('formatBlock', `<${level}>`);
  }, [execCommand]);

  const insertLink = useCallback(() => {
    if (linkUrl && linkText) {
      const linkHtml = `<a href="${linkUrl}" target="_blank" rel="noopener noreferrer">${linkText}</a>`;
      execCommand('insertHTML', linkHtml);
      setLinkUrl("");
      setLinkText("");
      setShowLinkDialog(false);
    }
  }, [linkUrl, linkText, execCommand]);

  const insertImage = useCallback(() => {
    if (imageUrl) {
      const imgHtml = `<img src="${imageUrl}" alt="${imageAlt}" style="max-width: 100%; height: auto; border-radius: 0.5rem;" />`;
      execCommand('insertHTML', imgHtml);
      setImageUrl("");
      setImageAlt("");
      setShowImageDialog(false);
    }
  }, [imageUrl, imageAlt, execCommand]);

  return (
    <div className={`border rounded-lg ${className}`}>
      {/* Toolbar */}
      <div className="border-b p-2 flex flex-wrap gap-1">
        {/* Heading Dropdown */}
        <Select onValueChange={insertHeading}>
          <SelectTrigger className="w-24 h-8">
            <SelectValue placeholder={<Type className="h-4 w-4" />} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="p">Paragraph</SelectItem>
            <SelectItem value="h1">Heading 1</SelectItem>
            <SelectItem value="h2">Heading 2</SelectItem>
            <SelectItem value="h3">Heading 3</SelectItem>
            <SelectItem value="h4">Heading 4</SelectItem>
            <SelectItem value="h5">Heading 5</SelectItem>
            <SelectItem value="h6">Heading 6</SelectItem>
          </SelectContent>
        </Select>

        <div className="h-6 w-px bg-border mx-1" />

        {/* Text Formatting */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onMouseDown={(e) => {
            e.preventDefault();
            execCommand('bold');
          }}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onMouseDown={(e) => {
            e.preventDefault();
            execCommand('italic');
          }}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onMouseDown={(e) => {
            e.preventDefault();
            execCommand('underline');
          }}
        >
          <Underline className="h-4 w-4" />
        </Button>

        <div className="h-6 w-px bg-border mx-1" />

        {/* Lists */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onMouseDown={(e) => {
            e.preventDefault();
            execCommand('insertUnorderedList');
          }}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onMouseDown={(e) => {
            e.preventDefault();
            execCommand('insertOrderedList');
          }}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>

        <div className="h-6 w-px bg-border mx-1" />

        {/* Alignment */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onMouseDown={(e) => {
            e.preventDefault();
            execCommand('justifyLeft');
          }}
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onMouseDown={(e) => {
            e.preventDefault();
            execCommand('justifyCenter');
          }}
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onMouseDown={(e) => {
            e.preventDefault();
            execCommand('justifyRight');
          }}
        >
          <AlignRight className="h-4 w-4" />
        </Button>

        <div className="h-6 w-px bg-border mx-1" />

        {/* Link */}
        <Popover open={showLinkDialog} onOpenChange={setShowLinkDialog}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Link2 className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-3">
              <div>
                <Label htmlFor="link-text">Link Text</Label>
                <Input
                  id="link-text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="Enter link text"
                />
              </div>
              <div>
                <Label htmlFor="link-url">URL</Label>
                <Input
                  id="link-url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                />
              </div>
              <Button onClick={insertLink} size="sm" className="w-full">
                Insert Link
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Image */}
        <Popover open={showImageDialog} onOpenChange={setShowImageDialog}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Image className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-3">
              <div>
                <Label htmlFor="image-url">Image URL</Label>
                <Input
                  id="image-url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              <div>
                <Label htmlFor="image-alt">Alt Text</Label>
                <Input
                  id="image-alt"
                  value={imageAlt}
                  onChange={(e) => setImageAlt(e.target.value)}
                  placeholder="Describe the image"
                />
              </div>
              <Button onClick={insertImage} size="sm" className="w-full">
                Insert Image
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <div className="h-6 w-px bg-border mx-1" />

        {/* HTML Code */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onMouseDown={(e) => {
            e.preventDefault();
            const html = prompt("Enter HTML code:");
            if (html) {
              execCommand('insertHTML', html);
            }
          }}
        >
          <Code className="h-4 w-4" />
        </Button>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        className="min-h-[200px] p-4 focus:outline-none prose prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: value }}
        onInput={handleInput}
        style={{ 
          whiteSpace: 'pre-wrap',
          lineHeight: '1.6',
        }}
      />
    </div>
  );
}