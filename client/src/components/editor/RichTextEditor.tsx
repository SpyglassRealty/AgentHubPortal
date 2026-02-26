import { useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Heading from "@tiptap/extension-heading";
import Placeholder from "@tiptap/extension-placeholder";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Link as LinkIcon,
  Image as ImageIcon,
  Heading1,
  Heading2,
  Heading3,
  Code,
  Type,
  Undo,
  Redo,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({ 
  value, 
  onChange, 
  placeholder = "Start writing...", 
  className 
}: RichTextEditorProps) {
  const [isHtmlMode, setIsHtmlMode] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false, // We'll use our custom heading extension
      }),
      Heading.configure({
        levels: [1, 2, 3, 4, 5, 6],
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 hover:text-blue-800 underline',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm max-w-none focus:outline-none min-h-[200px] p-4",
          "prose-headings:font-semibold prose-headings:text-foreground",
          "prose-p:text-foreground prose-p:leading-relaxed",
          "prose-strong:text-foreground prose-em:text-foreground",
          "prose-ul:text-foreground prose-ol:text-foreground",
          "prose-li:text-foreground prose-a:text-primary",
          className
        ),
      },
    },
  });

  const toggleLink = () => {
    if (!editor) return;
    
    const url = window.prompt("Enter URL:");
    if (url) {
      editor.chain().focus().toggleLink({ href: url }).run();
    }
  };

  const insertImage = () => {
    if (!editor) return;
    
    const url = window.prompt("Enter image URL:");
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const handleHtmlChange = (html: string) => {
    onChange(html);
    if (editor && !isHtmlMode) {
      editor.commands.setContent(html, false);
    }
  };

  if (!editor) {
    return (
      <div className="border border-input rounded-md p-4 text-center text-muted-foreground">
        Loading editor...
      </div>
    );
  }

  return (
    <div className={cn("border border-input rounded-md", className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-border">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={cn("h-8 px-2", editor.isActive('bold') && "bg-secondary")}
            disabled={isHtmlMode}
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={cn("h-8 px-2", editor.isActive('italic') && "bg-secondary")}
            disabled={isHtmlMode}
          >
            <Italic className="h-4 w-4" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-6" />

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={cn("h-8 px-2", editor.isActive('heading', { level: 1 }) && "bg-secondary")}
            disabled={isHtmlMode}
          >
            <Heading1 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={cn("h-8 px-2", editor.isActive('heading', { level: 2 }) && "bg-secondary")}
            disabled={isHtmlMode}
          >
            <Heading2 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={cn("h-8 px-2", editor.isActive('heading', { level: 3 }) && "bg-secondary")}
            disabled={isHtmlMode}
          >
            <Heading3 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().setParagraph().run()}
            className={cn("h-8 px-2", editor.isActive('paragraph') && "bg-secondary")}
            disabled={isHtmlMode}
          >
            <Type className="h-4 w-4" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-6" />

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={cn("h-8 px-2", editor.isActive('bulletList') && "bg-secondary")}
            disabled={isHtmlMode}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={cn("h-8 px-2", editor.isActive('orderedList') && "bg-secondary")}
            disabled={isHtmlMode}
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-6" />

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={toggleLink}
            className={cn("h-8 px-2", editor.isActive('link') && "bg-secondary")}
            disabled={isHtmlMode}
          >
            <LinkIcon className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={insertImage}
            className="h-8 px-2"
            disabled={isHtmlMode}
          >
            <ImageIcon className="h-4 w-4" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-6" />

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo() || isHtmlMode}
            className="h-8 px-2"
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo() || isHtmlMode}
            className="h-8 px-2"
          >
            <Redo className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1" />

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setIsHtmlMode(!isHtmlMode);
            if (!isHtmlMode) {
              // Switching to HTML mode - get current content
              handleHtmlChange(editor.getHTML());
            } else {
              // Switching back to visual mode - update editor with current HTML
              editor.commands.setContent(value, false);
            }
          }}
          className="h-8"
        >
          <Code className="h-4 w-4 mr-2" />
          {isHtmlMode ? "Visual" : "HTML"}
        </Button>
      </div>

      {/* Editor Content */}
      <div className="relative">
        {isHtmlMode ? (
          <Textarea
            value={value}
            onChange={(e) => handleHtmlChange(e.target.value)}
            className="min-h-[300px] border-none rounded-none resize-none font-mono text-sm"
            placeholder="Enter your HTML content here..."
          />
        ) : (
          <EditorContent 
            editor={editor} 
            className="min-h-[200px] max-h-[600px] overflow-y-auto"
          />
        )}
      </div>
    </div>
  );
}