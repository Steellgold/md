"use client"

import { Extension, type Editor, type Range } from "@tiptap/core"
import Suggestion from "@tiptap/suggestion"
import { ReactRenderer } from "@tiptap/react"
import tippy, { type Instance as TippyInstance } from "tippy.js"
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListChecks,
  Quote,
  Code2,
  Minus,
  Table as TableIcon,
  Type,
  type LucideIcon,
} from "lucide-react"
import { SlashMenu, type SlashMenuRef } from "./slash-menu"

export type SlashItem = {
  title: string
  description: string
  icon: LucideIcon
  searchTerms: string[]
  command: (props: { editor: Editor; range: Range }) => void
}

export const getSuggestionItems = ({ query }: { query: string }): SlashItem[] => {
  const items: SlashItem[] = [
    {
      title: "Texte",
      description: "Commencez à écrire en texte simple.",
      icon: Type,
      searchTerms: ["paragraph", "text", "texte"],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setNode("paragraph").run()
      },
    },
    {
      title: "Titre 1",
      description: "Grand titre de section.",
      icon: Heading1,
      searchTerms: ["h1", "titre", "heading"],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setNode("heading", { level: 1 }).run()
      },
    },
    {
      title: "Titre 2",
      description: "Sous-titre moyen.",
      icon: Heading2,
      searchTerms: ["h2", "titre", "heading"],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setNode("heading", { level: 2 }).run()
      },
    },
    {
      title: "Titre 3",
      description: "Petit sous-titre.",
      icon: Heading3,
      searchTerms: ["h3", "titre", "heading"],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setNode("heading", { level: 3 }).run()
      },
    },
    {
      title: "Liste à puces",
      description: "Créez une liste simple.",
      icon: List,
      searchTerms: ["bullet", "liste", "list", "ul"],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleBulletList().run()
      },
    },
    {
      title: "Liste numérotée",
      description: "Créez une liste ordonnée.",
      icon: ListOrdered,
      searchTerms: ["numbered", "ordered", "ol", "liste"],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleOrderedList().run()
      },
    },
    {
      title: "Liste de tâches",
      description: "Suivez vos tâches avec des cases.",
      icon: ListChecks,
      searchTerms: ["todo", "task", "checkbox", "tâche"],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleTaskList().run()
      },
    },
    {
      title: "Citation",
      description: "Mettez en évidence une citation.",
      icon: Quote,
      searchTerms: ["blockquote", "quote", "citation"],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleBlockquote().run()
      },
    },
    {
      title: "Bloc de code",
      description: "Insérez un bloc de code.",
      icon: Code2,
      searchTerms: ["code", "codeblock", "pre"],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleCodeBlock().run()
      },
    },
    {
      title: "Séparateur",
      description: "Divisez visuellement les sections.",
      icon: Minus,
      searchTerms: ["divider", "hr", "separator", "séparateur"],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setHorizontalRule().run()
      },
    },
    {
      title: "Tableau",
      description: "Insérez un tableau 3x3.",
      icon: TableIcon,
      searchTerms: ["table", "tableau", "grid"],
      command: ({ editor, range }) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
          .run()
      },
    },
  ]

  if (!query) return items
  const q = query.toLowerCase()
  return items.filter(
    (item) =>
      item.title.toLowerCase().includes(q) ||
      item.searchTerms.some((t) => t.toLowerCase().includes(q)),
  )
}

const renderItems = () => {
  let component: ReactRenderer<SlashMenuRef> | null = null
  let popup: TippyInstance[] | null = null

  return {
    onStart: (props: {
      editor: Editor
      clientRect: (() => DOMRect | null) | null
      items: SlashItem[]
      command: (item: SlashItem) => void
    }) => {
      component = new ReactRenderer(SlashMenu, {
        props,
        editor: props.editor,
      })

      if (!props.clientRect) return

      popup = tippy("body", {
        getReferenceClientRect: props.clientRect as () => DOMRect,
        appendTo: () => document.body,
        content: component.element,
        showOnCreate: true,
        interactive: true,
        trigger: "manual",
        placement: "bottom-start",
        maxWidth: "none",
      })
    },
    onUpdate: (props: {
      editor: Editor
      clientRect: (() => DOMRect | null) | null
      items: SlashItem[]
      command: (item: SlashItem) => void
    }) => {
      component?.updateProps(props)
      if (!props.clientRect) return
      popup?.[0].setProps({
        getReferenceClientRect: props.clientRect as () => DOMRect,
      })
    },
    onKeyDown: (props: { event: KeyboardEvent }) => {
      if (props.event.key === "Escape") {
        popup?.[0].hide()
        return true
      }
      return component?.ref?.onKeyDown(props) ?? false
    },
    onExit: () => {
      popup?.[0].destroy()
      component?.destroy()
    },
  }
}

export const SlashCommand = Extension.create({
  name: "slashCommand",
  addOptions() {
    return {
      suggestion: {
        char: "/",
        startOfLine: false,
        command: ({
          editor,
          range,
          props,
        }: {
          editor: Editor
          range: Range
          props: SlashItem
        }) => {
          props.command({ editor, range })
        },
      },
    }
  },
  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
        items: getSuggestionItems,
        render: renderItems,
      }),
    ]
  },
})
