import { useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Youtube from "@tiptap/extension-youtube";
import { Button } from "@/components/ui/button";
import { 
  Bold, Italic, List, ListOrdered, Link2, Image as ImageIcon, 
  Heading1, Heading2, Code, Undo, Redo, Youtube as YoutubeIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const [htmlContent, setHtmlContent] = useState(value);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Image,
      Youtube.configure({ 
        inline: false,
        HTMLAttributes: { class: 'youtube-video' }
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      setHtmlContent(html);
      onChange(html);
    },
  });

  const toggleHtmlMode = () => {
    if (isHtmlMode) {
      // Switching from HTML to visual mode
      editor?.commands.setContent(htmlContent);
      onChange(htmlContent);
    } else {
      // Switching from visual to HTML mode
      setHtmlContent(editor?.getHTML() || "");
    }
    setIsHtmlMode(!isHtmlMode);
  };

  const handleHtmlChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setHtmlContent(e.target.value);
    onChange(e.target.value);
  };

  const addLink = () => {
    const url = window.prompt("Enter URL:");
    if (url) {
      editor?.chain().focus().setLink({ href: url }).run();
    }
  };

  const addImage = () => {
    const url = window.prompt("Enter image URL:");
    if (url) {
      editor?.chain().focus().setImage({ src: url }).run();
    }
  };

  const addYoutube = () => {
    const url = window.prompt("Enter YouTube URL:");
    if (url) {
      editor?.chain().focus().setYoutubeVideo({ src: url }).run();
    }
  };

  if (!editor) return null;

  return (
    <div className="border rounded-md">
      {/* Toolbar */}
      <div className="border-b p-2 flex items-center gap-1 flex-wrap">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={cn("p-1", editor.isActive("bold") && "bg-gray-200")}
        >
          <Bold size={18} />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={cn("p-1", editor.isActive("italic") && "bg-gray-200")}
        >
          <Italic size={18} />
        </Button>
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={cn("p-1", editor.isActive("heading", { level: 1 }) && "bg-gray-200")}
        >
          <Heading1 size={18} />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={cn("p-1", editor.isActive("heading", { level: 2 }) && "bg-gray-200")}
        >
          <Heading2 size={18} />
        </Button>
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={cn("p-1", editor.isActive("bulletList") && "bg-gray-200")}
        >
          <List size={18} />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={cn("p-1", editor.isActive("orderedList") && "bg-gray-200")}
        >
          <ListOrdered size={18} />
        </Button>
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <Button type="button" size="sm" variant="ghost" onClick={addLink} className="p-1">
          <Link2 size={18} />
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={addImage} className="p-1">
          <ImageIcon size={18} />
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={addYoutube} className="p-1">
          <YoutubeIcon size={18} />
        </Button>
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run()}
          className="p-1"
        >
          <Undo size={18} />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run()}
          className="p-1"
        >
          <Redo size={18} />
        </Button>
        <div className="ml-auto">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={toggleHtmlMode}
            className={cn("text-xs", isHtmlMode && "bg-gray-200")}
          >
            <Code size={16} className="mr-1" />
            {isHtmlMode ? "Visual" : "HTML"}
          </Button>
        </div>
      </div>

      {/* Editor Content */}
      <div className="p-3">
        {isHtmlMode ? (
          <textarea
            value={htmlContent}
            onChange={handleHtmlChange}
            className="w-full h-64 p-2 font-mono text-sm border rounded"
            placeholder="Enter HTML content..."
          />
        ) : (
          <EditorContent
            editor={editor}
            className="prose prose-sm max-w-none min-h-[200px] focus:outline-none"
            placeholder={placeholder}
          />
        )}
      </div>
    </div>
  );
}