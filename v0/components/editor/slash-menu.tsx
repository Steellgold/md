"use client"

import { forwardRef, useEffect, useImperativeHandle, useState } from "react"
import { cn } from "@/lib/utils"
import type { SlashItem } from "./slash-command"

export type SlashMenuRef = {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean
}

type Props = {
  items: SlashItem[]
  command: (item: SlashItem) => void
}

export const SlashMenu = forwardRef<SlashMenuRef, Props>(function SlashMenu({ items, command }, ref) {
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => setSelectedIndex(0), [items])

  const selectItem = (index: number) => {
    const item = items[index]
    if (item) command(item)
  }

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === "ArrowUp") {
        setSelectedIndex((i) => (i + items.length - 1) % items.length)
        return true
      }
      if (event.key === "ArrowDown") {
        setSelectedIndex((i) => (i + 1) % items.length)
        return true
      }
      if (event.key === "Enter") {
        selectItem(selectedIndex)
        return true
      }
      return false
    },
  }))

  if (items.length === 0) {
    return (
      <div className="z-50 w-72 rounded-lg border border-border bg-popover p-2 text-sm text-muted-foreground shadow-md">
        Aucun résultat
      </div>
    )
  }

  return (
    <div className="z-50 max-h-80 w-72 overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-md">
      <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Blocs</div>
      {items.map((item, index) => {
        const Icon = item.icon
        return (
          <button
            key={item.title}
            type="button"
            onMouseEnter={() => setSelectedIndex(index)}
            onClick={() => selectItem(index)}
            className={cn(
              "flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
              selectedIndex === index
                ? "bg-accent text-accent-foreground"
                : "text-popover-foreground hover:bg-accent/60",
            )}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-background">
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="truncate font-medium">{item.title}</span>
              <span className="truncate text-xs text-muted-foreground">{item.description}</span>
            </div>
          </button>
        )
      })}
    </div>
  )
})
