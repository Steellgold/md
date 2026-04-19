"use client";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { TableIcon } from "lucide-react";
import { useState } from "react";

const MAX_COLS = 10;
const MAX_ROWS = 10;

type MarkdownTableInsertControlProps = {
  onInsertAction: (columns: number, rows: number) => void;
};

export const MarkdownTableInsertControl = ({
  onInsertAction,
}: MarkdownTableInsertControlProps) => {
  const [open, setOpen] = useState(false);
  const [hoverCol, setHoverCol] = useState(0);
  const [hoverRow, setHoverRow] = useState(0);

  const handleInsert = (columns: number, rows: number) => {
    onInsertAction(columns, rows);
    setOpen(false);
    setHoverCol(0);
    setHoverRow(0);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);

        if (!nextOpen) {
          setHoverCol(0);
          setHoverRow(0);
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          title="Insert table"
          aria-label="Insert table"
        >
          <TableIcon />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start" sideOffset={6}>
        <div className="flex flex-col gap-2">
          <div
            className="grid gap-0.5"
            style={{
              gridTemplateColumns: `repeat(${MAX_COLS}, minmax(0, 1fr))`,
            }}
            onMouseLeave={() => {
              setHoverCol(0);
              setHoverRow(0);
            }}
          >
            {Array.from({ length: MAX_ROWS }, (_, rowIndex) =>
              Array.from({ length: MAX_COLS }, (_, colIndex) => {
                const highlighted =
                  colIndex <= hoverCol && rowIndex <= hoverRow;

                return (
                  <button
                    key={`${rowIndex}-${colIndex}`}
                    type="button"
                    className={cn(
                      "size-4 rounded-sm border transition-colors",
                      highlighted
                        ? "border-primary bg-primary/25"
                        : "border-border bg-muted/50 hover:border-muted-foreground/40"
                    )}
                    aria-label={`Insert ${colIndex + 1} by ${rowIndex + 1} table`}
                    onMouseEnter={() => {
                      setHoverCol(colIndex);
                      setHoverRow(rowIndex);
                    }}
                    onClick={() => handleInsert(colIndex + 1, rowIndex + 1)}
                  />
                );
              })
            ).flat()}
          </div>
          <div className="flex flex-col gap-0.5 text-center">
            <span className="text-xs text-muted-foreground tabular-nums">
              {hoverCol + 1} × {hoverRow + 1}
            </span>
            <span className="text-[10px] text-muted-foreground/80">
              columns × rows
            </span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
