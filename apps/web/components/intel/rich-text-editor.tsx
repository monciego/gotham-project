"use client";

import { cn } from "@gotham/ui/lib/utils";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Heading2, Italic, List, type LucideIcon } from "lucide-react";
import { useEffect } from "react";
import { RICH_TEXT_CLASS } from "./rich-text";

type RichTextEditorProps = {
  id: string;
  value: string;
  onChange: (html: string) => void;
  invalid?: boolean;
  describedBy?: string;
};

/** Tiptap with bold, italic, headings and bullet lists. Emits HTML. */
export function RichTextEditor({ id, value, onChange, invalid, describedBy }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      // Only what the API keeps (see App\Support\RichText).
      StarterKit.configure({ heading: { levels: [2, 3] }, link: false, underline: false, code: false, codeBlock: false }),
    ],
    content: value,
    // The page renders on the server first; Tiptap must wait for the browser.
    immediatelyRender: false,
    editorProps: {
      attributes: {
        id,
        role: "textbox",
        "aria-multiline": "true",
        "aria-labelledby": `${id}-label`,
        ...(describedBy && { "aria-describedby": describedBy }),
        class: cn("min-h-48 px-3 py-2.5 outline-none", RICH_TEXT_CLASS),
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  const active = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor?.isActive("bold") ?? false,
      italic: editor?.isActive("italic") ?? false,
      heading: editor?.isActive("heading", { level: 2 }) ?? false,
      list: editor?.isActive("bulletList") ?? false,
    }),
  });

  // Outside changes (a restored draft) replace the content; typing doesn't come back through here.
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [editor, value]);

  const tools: { label: string; icon: LucideIcon; on: boolean | undefined; run: () => void }[] = [
    { label: "Bold", icon: Bold, on: active?.bold, run: () => editor?.chain().focus().toggleBold().run() },
    { label: "Italic", icon: Italic, on: active?.italic, run: () => editor?.chain().focus().toggleItalic().run() },
    {
      label: "Heading",
      icon: Heading2,
      on: active?.heading,
      run: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    { label: "Bullet list", icon: List, on: active?.list, run: () => editor?.chain().focus().toggleBulletList().run() },
  ];

  return (
    <div
      className={cn(
        "rounded-lg border border-input bg-input/30 transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
        invalid && "border-destructive",
      )}
    >
      <div role="toolbar" aria-label="Formatting" className="flex gap-1 border-b border-border p-1">
        {tools.map(({ label, icon: Icon, on, run }) => (
          <button
            key={label}
            type="button"
            aria-label={label}
            aria-pressed={on}
            title={label}
            onClick={run}
            className={cn(
              "flex size-8 items-center justify-center rounded-md transition-colors duration-200",
              on ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden />
          </button>
        ))}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
