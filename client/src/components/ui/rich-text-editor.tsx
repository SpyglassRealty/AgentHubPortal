import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  List,
  ListOrdered,
  Link as LinkIcon,
  Unlink,
  Undo2,
  Redo2,
  Code,
  RemoveFormatting,
  Image as ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Quote,
  Minus,
  Upload,
  Loader2,
  FileCode,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  /** Category for image uploads */
  imageCategory?: "images" | "blogs" | "pages" | "communities" | "agents";
  /** Show HTML source toggle */
  showSourceToggle?: boolean;
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  children,
  title,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "p-1.5 rounded-md transition-colors inline-flex items-center justify-center",
        active
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-5 bg-border mx-1" />;
}

function LinkPopover({ editor }: { editor: any }) {
  const [url, setUrl] = useState("");
  const [open, setOpen] = useState(false);

  const handleSetLink = useCallback(() => {
    if (!url) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: url, target: "_blank" })
        .run();
    }
    setOpen(false);
    setUrl("");
  }, [editor, url]);

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      const existingLink = editor.getAttributes("link").href;
      setUrl(existingLink || "");
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Insert Link (Ctrl+K)"
          className={cn(
            "p-1.5 rounded-md transition-colors inline-flex items-center justify-center",
            editor.isActive("link")
              ? "bg-[#EF4923]/10 text-[#EF4923]"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <LinkIcon className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-3">
          <Label className="text-sm font-medium">Link URL</Label>
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://spyglassrealty.com/..."
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSetLink();
              }
            }}
          />
          <p className="text-xs text-muted-foreground">
            Internal links boost SEO. Use relative paths like /buy or
            /communities/...
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSetLink} className="flex-1">
              {editor.isActive("link") ? "Update Link" : "Add Link"}
            </Button>
            {editor.isActive("link") && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  editor
                    .chain()
                    .focus()
                    .extendMarkRange("link")
                    .unsetLink()
                    .run();
                  setOpen(false);
                }}
              >
                <Unlink className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ImagePopover({
  editor,
  imageCategory,
}: {
  editor: any;
  imageCategory: string;
}) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [alt, setAlt] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInsertFromUrl = () => {
    if (url.trim()) {
      editor
        .chain()
        .focus()
        .setImage({ src: url.trim(), alt: alt.trim() || undefined })
        .run();
      setUrl("");
      setAlt("");
      setOpen(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(
        `/api/admin/upload?category=${imageCategory}`,
        {
          method: "POST",
          credentials: "include",
          body: formData,
        }
      );

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();
      editor
        .chain()
        .focus()
        .setImage({ src: data.url, alt: alt.trim() || file.name })
        .run();
      setUrl("");
      setAlt("");
      setOpen(false);
    } catch {
      // Silently fail — toast handled at component level
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Insert Image"
          className={cn(
            "p-1.5 rounded-md transition-colors inline-flex items-center justify-center",
            "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <ImageIcon className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-3">
          <Label className="text-sm font-medium">Insert Image</Label>

          {/* Upload button */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
            />
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload from Computer
                </>
              )}
            </Button>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="flex-1 border-t" />
            or paste URL
            <div className="flex-1 border-t" />
          </div>

          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/image.jpg"
          />
          <Input
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            placeholder="Alt text (for SEO & accessibility)"
          />
          <Button
            size="sm"
            onClick={handleInsertFromUrl}
            disabled={!url.trim()}
            className="w-full"
          >
            Insert Image
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = "Start typing...",
  className,
  minHeight = "200px",
  imageCategory = "images",
  showSourceToggle = true,
}: RichTextEditorProps) {
  const [showSource, setShowSource] = useState(false);
  const [sourceContent, setSourceContent] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-[#EF4923] underline cursor-pointer",
          rel: "noopener noreferrer",
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: "rounded-lg max-w-full mx-auto",
        },
        allowBase64: false,
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Highlight.configure({
        multicolor: false,
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm sm:prose max-w-none dark:prose-invert focus:outline-none",
          "prose-a:text-[#EF4923] prose-a:underline",
          "prose-headings:font-semibold",
          "prose-img:rounded-lg prose-img:mx-auto",
          "[&_.is-editor-empty:first-child::before]:text-muted-foreground [&_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.is-editor-empty:first-child::before]:float-left [&_.is-editor-empty:first-child::before]:h-0 [&_.is-editor-empty:first-child::before]:pointer-events-none"
        ),
        style: `min-height: ${minHeight}; padding: 0.5rem;`,
      },
      // Handle pasted images
      handleDrop: (view, event, slice, moved) => {
        if (!moved && event.dataTransfer?.files?.length) {
          const file = event.dataTransfer.files[0];
          if (file?.type.startsWith("image/")) {
            // Upload and insert
            const formData = new FormData();
            formData.append("file", file);
            fetch(`/api/admin/upload?category=${imageCategory}`, {
              method: "POST",
              credentials: "include",
              body: formData,
            })
              .then((res) => res.json())
              .then((data) => {
                if (data.url) {
                  const { schema } = view.state;
                  const node = schema.nodes.image?.create({
                    src: data.url,
                    alt: file.name,
                  });
                  if (node) {
                    const coordinates = view.posAtCoords({
                      left: event.clientX,
                      top: event.clientY,
                    });
                    if (coordinates) {
                      const transaction = view.state.tr.insert(
                        coordinates.pos,
                        node
                      );
                      view.dispatch(transaction);
                    }
                  }
                }
              })
              .catch(() => {});
            return true;
          }
        }
        return false;
      },
    },
  });

  // Sync external content changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content]);

  const toggleSourceView = () => {
    if (!editor) return;

    if (!showSource) {
      // Switching TO source view
      setSourceContent(editor.getHTML());
    } else {
      // Switching FROM source view — apply changes
      editor.commands.setContent(sourceContent);
      onChange(sourceContent);
    }
    setShowSource(!showSource);
  };

  if (!editor) return null;

  return (
    <div className={cn("border rounded-md", className)}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b px-2 py-1.5 bg-muted/30">
        {/* Text formatting */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          title="Bold (Ctrl+B)"
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          title="Italic (Ctrl+I)"
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive("underline")}
          title="Underline (Ctrl+U)"
        >
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          active={editor.isActive("highlight")}
          title="Highlight"
        >
          <span className="h-4 w-4 flex items-center justify-center text-xs font-bold bg-yellow-200 rounded px-0.5">
            H
          </span>
        </ToolbarButton>

        <ToolbarDivider />

        {/* Headings */}
        <ToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
          active={editor.isActive("heading", { level: 1 })}
          title="Heading 1"
        >
          <Heading1 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          active={editor.isActive("heading", { level: 2 })}
          title="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          active={editor.isActive("heading", { level: 3 })}
          title="Heading 3"
        >
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 4 }).run()
          }
          active={editor.isActive("heading", { level: 4 })}
          title="Heading 4"
        >
          <Heading4 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 5 }).run()
          }
          active={editor.isActive("heading", { level: 5 })}
          title="Heading 5"
        >
          <span className="h-4 w-4 flex items-center justify-center text-xs font-bold">H5</span>
        </ToolbarButton>
        <ToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 6 }).run()
          }
          active={editor.isActive("heading", { level: 6 })}
          title="Heading 6"
        >
          <span className="h-4 w-4 flex items-center justify-center text-xs font-bold">H6</span>
        </ToolbarButton>

        <ToolbarDivider />

        {/* Lists */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          title="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive("blockquote")}
          title="Blockquote"
        >
          <Quote className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Horizontal Rule"
        >
          <Minus className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Alignment */}
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          active={editor.isActive({ textAlign: "left" })}
          title="Align Left"
        >
          <AlignLeft className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          active={editor.isActive({ textAlign: "center" })}
          title="Align Center"
        >
          <AlignCenter className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          active={editor.isActive({ textAlign: "right" })}
          title="Align Right"
        >
          <AlignRight className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Link + Image */}
        <LinkPopover editor={editor} />
        <ImagePopover editor={editor} imageCategory={imageCategory} />

        <ToolbarDivider />

        {/* Code block */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          active={editor.isActive("codeBlock")}
          title="Code Block"
        >
          <Code className="h-4 w-4" />
        </ToolbarButton>

        {/* Undo / Redo */}
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo2 className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Clear formatting */}
        <ToolbarButton
          onClick={() =>
            editor.chain().focus().clearNodes().unsetAllMarks().run()
          }
          title="Clear Formatting"
        >
          <RemoveFormatting className="h-4 w-4" />
        </ToolbarButton>

        {/* Source toggle */}
        {showSourceToggle && (
          <>
            <div className="flex-1" />
            <ToolbarButton
              onClick={toggleSourceView}
              active={showSource}
              title={showSource ? "Visual Editor" : "HTML Source"}
            >
              {showSource ? (
                <Eye className="h-4 w-4" />
              ) : (
                <FileCode className="h-4 w-4" />
              )}
            </ToolbarButton>
          </>
        )}
      </div>

      {/* Editor Content / Source */}
      {showSource ? (
        <Textarea
          value={sourceContent}
          onChange={(e) => setSourceContent(e.target.value)}
          className="border-0 rounded-none font-mono text-sm resize-none focus-visible:ring-0"
          style={{ minHeight }}
          placeholder="<p>Write HTML here...</p>"
        />
      ) : (
        <div className="px-3 py-2">
          <EditorContent editor={editor} />
        </div>
      )}
    </div>
  );
}

export default RichTextEditor;
