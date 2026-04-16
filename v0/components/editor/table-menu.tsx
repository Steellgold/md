"use client"

import type { Editor } from "@tiptap/react"
import {
  Columns3,
  Rows3,
  Trash2,
  ArrowLeftToLine,
  ArrowRightToLine,
  ArrowUpToLine,
  ArrowDownToLine,
} from "lucide-react"
import { cn } from "@/lib/utils"

type Props = { editor: Editor | null }

type BtnProps = {
  onClick: () => void
  label: string
  children: React.ReactNode
  destructive?: boolean
}

function Btn({ onClick, label, children, destructive }: BtnProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors",
        destructive
          ? "text-destructive hover:bg-destructive/10"
          : "text-popover-foreground hover:bg-accent/60",
      )}
    >
      {children}
    </button>
  )
}

export function TableMenu({ editor }: Props) {
  if (!editor || !editor.isActive("table")) return null

  return (
    <div className="sticky top-2 z-10 mx-auto mb-3 flex w-fit flex-wrap items-center gap-1 rounded-lg border border-border bg-popover p-1 shadow-sm">
      <Btn onClick={() => editor.chain().focus().addColumnBefore().run()} label="Colonne avant">
        <ArrowLeftToLine className="h-3.5 w-3.5" />
        Col. avant
      </Btn>
      <Btn onClick={() => editor.chain().focus().addColumnAfter().run()} label="Colonne après">
        <ArrowRightToLine className="h-3.5 w-3.5" />
        Col. après
      </Btn>
      <Btn onClick={() => editor.chain().focus().deleteColumn().run()} label="Supprimer colonne" destructive>
        <Columns3 className="h-3.5 w-3.5" />
        Suppr. col.
      </Btn>
      <div className="mx-1 h-4 w-px bg-border" />
      <Btn onClick={() => editor.chain().focus().addRowBefore().run()} label="Ligne avant">
        <ArrowUpToLine className="h-3.5 w-3.5" />
        Ligne avant
      </Btn>
      <Btn onClick={() => editor.chain().focus().addRowAfter().run()} label="Ligne après">
        <ArrowDownToLine className="h-3.5 w-3.5" />
        Ligne après
      </Btn>
      <Btn onClick={() => editor.chain().focus().deleteRow().run()} label="Supprimer ligne" destructive>
        <Rows3 className="h-3.5 w-3.5" />
        Suppr. ligne
      </Btn>
      <div className="mx-1 h-4 w-px bg-border" />
      <Btn onClick={() => editor.chain().focus().toggleHeaderRow().run()} label="Basculer en-tête">
        En-tête
      </Btn>
      <Btn onClick={() => editor.chain().focus().deleteTable().run()} label="Supprimer le tableau" destructive>
        <Trash2 className="h-3.5 w-3.5" />
        Supprimer
      </Btn>
    </div>
  )
}
