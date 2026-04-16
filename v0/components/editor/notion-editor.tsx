"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import Link from "@tiptap/extension-link"
import Placeholder from "@tiptap/extension-placeholder"
import TaskList from "@tiptap/extension-task-list"
import TaskItem from "@tiptap/extension-task-item"
import TextAlign from "@tiptap/extension-text-align"
import Table from "@tiptap/extension-table"
import TableRow from "@tiptap/extension-table-row"
import TableCell from "@tiptap/extension-table-cell"
import TableHeader from "@tiptap/extension-table-header"

import { SlashCommand } from "./slash-command"
import { EditorBubbleMenu } from "./editor-bubble-menu"
import { EditorToolbar } from "./editor-toolbar"
import { TableMenu } from "./table-menu"

const DEFAULT_CONTENT = `
<h1>Bienvenue dans votre éditeur ✍️</h1>
<p>Tapez <code>/</code> n'importe où pour ouvrir le menu des blocs — comme dans Notion.</p>
<p>Sélectionnez du texte pour voir apparaître la barre de mise en forme flottante (<strong>gras</strong>, <em>italique</em>, <u>souligné</u>, <s>barré</s>, <code>code</code>, liens).</p>
<h2>Fonctionnalités supportées</h2>
<ul>
  <li>Titres, paragraphes, citations</li>
  <li>Listes à puces, numérotées et de tâches</li>
  <li>Séparateurs, blocs de code, alignement</li>
  <li>Tableaux redimensionnables</li>
</ul>
<hr />
<h3>Exemple de tableau</h3>
<table>
  <tbody>
    <tr>
      <th><p>Fonctionnalité</p></th>
      <th><p>Raccourci</p></th>
      <th><p>Support</p></th>
    </tr>
    <tr>
      <td><p>Gras</p></td>
      <td><p><code>⌘/Ctrl + B</code></p></td>
      <td><p>✅</p></td>
    </tr>
    <tr>
      <td><p>Italique</p></td>
      <td><p><code>⌘/Ctrl + I</code></p></td>
      <td><p>✅</p></td>
    </tr>
    <tr>
      <td><p>Menu slash</p></td>
      <td><p><code>/</code></p></td>
      <td><p>✅</p></td>
    </tr>
  </tbody>
</table>
<blockquote><p>Conseil : essayez <code>/tableau</code>, <code>/séparateur</code> ou <code>/titre</code> pour voir le menu filtrer en direct.</p></blockquote>
`

type Props = {
  initialContent?: string
  onChange?: (html: string) => void
}

export function NotionEditor({ initialContent = DEFAULT_CONTENT, onChange }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        horizontalRule: {
          HTMLAttributes: {
            class: "my-6 border-t border-border",
          },
        },
        codeBlock: {
          HTMLAttributes: {
            class:
              "rounded-md bg-muted px-4 py-3 font-mono text-sm text-foreground overflow-x-auto",
          },
        },
        blockquote: {
          HTMLAttributes: {
            class: "border-l-4 border-border pl-4 text-muted-foreground italic",
          },
        },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          class: "text-primary underline underline-offset-2 hover:opacity-80",
        },
      }),
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === "heading") {
            return `Titre ${node.attrs.level}`
          }
          return "Tapez '/' pour les commandes…"
        },
      }),
      TaskList.configure({
        HTMLAttributes: { class: "not-prose list-none pl-0 space-y-1" },
      }),
      TaskItem.configure({
        nested: true,
        HTMLAttributes: { class: "flex items-start gap-2" },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: "tiptap-table",
        },
      }),
      TableRow,
      TableHeader,
      TableCell,
      SlashCommand,
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class:
          "tiptap-editor prose prose-neutral dark:prose-invert max-w-none focus:outline-none px-8 py-10 min-h-[500px]",
      },
    },
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML())
    },
  })

  return (
    <div className="flex w-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <EditorToolbar editor={editor} />
      <div className="relative">
        <TableMenu editor={editor} />
        <EditorContent editor={editor} />
        <EditorBubbleMenu editor={editor} />
      </div>
    </div>
  )
}
