"use client"

import { BubbleMenu, type Editor } from "@tiptap/react"
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Link as LinkIcon,
  Unlink,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useCallback } from "react"

type Props = { editor: Editor | null }

type ToolButtonProps = {
  onClick: () => void
  active?: boolean
  label: string
  children: React.ReactNode
}

function ToolButton({ onClick, active, label, children }: ToolButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md text-sm transition-colors",
        active
          ? "bg-accent text-accent-foreground"
          : "text-popover-foreground hover:bg-accent/60",
      )}
    >
      {children}
    </button>
  )
}

export function EditorBubbleMenu({ editor }: Props) {
  const handleLink = useCallback(() => {
    if (!editor) return
    const previous = editor.getAttributes("link").href as string | undefined
    const url = window.prompt("URL du lien", previous ?? "https://")
    if (url === null) return
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run()
  }, [editor])

  if (!editor) return null

  return (
    <BubbleMenu
      editor={editor}
      tippyOptions={{ duration: 120, placement: "top" }}
      shouldShow={({ editor, from, to }) => {
        if (from === to) return false
        // Hide in code blocks
        if (editor.isActive("codeBlock")) return false
        return true
      }}
    >
      <div className="flex items-center gap-0.5 rounded-lg border border-border bg-popover p-1 shadow-md">
        <ToolButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          label="Gras"
        >
          <Bold className="h-4 w-4" />
        </ToolButton>
        <ToolButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          label="Italique"
        >
          <Italic className="h-4 w-4" />
        </ToolButton>
        <ToolButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive("underline")}
          label="Souligné"
        >
          <UnderlineIcon className="h-4 w-4" />
        </ToolButton>
        <ToolButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive("strike")}
          label="Barré"
        >
          <Strikethrough className="h-4 w-4" />
        </ToolButton>
        <ToolButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          active={editor.isActive("code")}
          label="Code inline"
        >
          <Code className="h-4 w-4" />
        </ToolButton>
        <div className="mx-1 h-5 w-px bg-border" />
        <ToolButton onClick={handleLink} active={editor.isActive("link")} label="Lien">
          <LinkIcon className="h-4 w-4" />
        </ToolButton>
        {editor.isActive("link") && (
          <ToolButton
            onClick={() => editor.chain().focus().unsetLink().run()}
            label="Supprimer le lien"
          >
            <Unlink className="h-4 w-4" />
          </ToolButton>
        )}
      </div>
    </BubbleMenu>
  )
}
