"use client";

type EditorCommand = "undo" | "redo" | "cut" | "copy" | "paste" | "selectAll";

type LinePrefixBuilder = string | ((index: number) => string);

const focusEditor = (editor: HTMLTextAreaElement | null) => {
  if (!editor) {
    return false;
  }

  editor.focus();
  return true;
};

const applySelection = (
  editor: HTMLTextAreaElement,
  nextValue: string,
  selectionStart: number,
  selectionEnd: number
) => {
  editor.setRangeText(
    nextValue,
    editor.selectionStart,
    editor.selectionEnd,
    "end"
  );
  editor.setSelectionRange(selectionStart, selectionEnd);
};

export const replaceRangeAction = (
  editor: HTMLTextAreaElement | null,
  start: number,
  end: number,
  value: string,
  select?: { start: number; end: number }
) => {
  if (!focusEditor(editor) || !editor) {
    return;
  }

  editor.setRangeText(value, start, end, "end");

  if (select) {
    editor.setSelectionRange(select.start, select.end);
  }

  editor.dispatchEvent(new Event("input", { bubbles: true }));
};

export const runEditorCommandAction = async (
  command: EditorCommand,
  editor: HTMLTextAreaElement | null
) => {
  if (!focusEditor(editor)) {
    return;
  }

  const activeEditor = editor!;

  switch (command) {
    case "selectAll": {
      activeEditor.select();
      return;
    }
    case "copy": {
      document.execCommand("copy");
      return;
    }
    case "cut": {
      document.execCommand("cut");
      return;
    }
    case "paste": {
      document.execCommand("paste");
      return;
    }
    case "undo": {
      document.execCommand("undo");
      return;
    }
    case "redo": {
      document.execCommand("redo");
      return;
    }
  }
};

export const wrapSelectionAction = (
  editor: HTMLTextAreaElement | null,
  prefix: string,
  suffix = prefix,
  placeholder = "text"
) => {
  if (!focusEditor(editor) || !editor) {
    return;
  }

  const { selectionStart, selectionEnd, value } = editor;
  const selectedText = value.slice(selectionStart, selectionEnd) || placeholder;
  const nextValue = `${prefix}${selectedText}${suffix}`;
  const nextSelectionStart = selectionStart + prefix.length;
  const nextSelectionEnd = nextSelectionStart + selectedText.length;

  applySelection(editor, nextValue, nextSelectionStart, nextSelectionEnd);
  editor.dispatchEvent(new Event("input", { bubbles: true }));
};

export const prefixLinesAction = (
  editor: HTMLTextAreaElement | null,
  prefix: LinePrefixBuilder,
  placeholder = "List item"
) => {
  if (!focusEditor(editor) || !editor) {
    return;
  }

  const { selectionStart, selectionEnd, value } = editor;
  const selectedText = value.slice(selectionStart, selectionEnd) || placeholder;
  const nextValue = selectedText
    .split("\n")
    .map((line, index) => {
      const linePrefix =
        typeof prefix === "function" ? prefix(index) : prefix;

      return `${linePrefix}${line}`;
    })
    .join("\n");

  applySelection(
    editor,
    nextValue,
    selectionStart,
    selectionStart + nextValue.length
  );
  editor.dispatchEvent(new Event("input", { bubbles: true }));
};

export const insertBlockAction = (
  editor: HTMLTextAreaElement | null,
  before: string,
  after = "",
  placeholder = ""
) => {
  if (!focusEditor(editor) || !editor) {
    return;
  }

  const { selectionStart, selectionEnd, value } = editor;
  const selectedText = value.slice(selectionStart, selectionEnd) || placeholder;
  const nextValue = `${before}${selectedText}${after}`;
  const cursorStart = selectionStart + before.length;
  const cursorEnd = cursorStart + selectedText.length;

  applySelection(editor, nextValue, cursorStart, cursorEnd);
  editor.dispatchEvent(new Event("input", { bubbles: true }));
};

export const buildMarkdownTableMarkdown = (
  columns: number,
  rowCount: number
) => {
  const columnCount = Math.max(1, Math.min(Math.floor(columns), 20));
  const totalRowCount = Math.max(1, Math.min(Math.floor(rowCount), 30));
  const emptyCell = "   ";
  const makeRow = () =>
    `| ${Array.from({ length: columnCount }, () => emptyCell).join(" | ")} |`;
  const makeSeparator = () =>
    `| ${Array.from({ length: columnCount }, () => "---").join(" | ")} |`;
  const lines = [makeRow(), makeSeparator()];

  for (let index = 1; index < totalRowCount; index += 1) {
    lines.push(makeRow());
  }

  return lines.join("\n");
};

export const insertMarkdownTableAction = (
  editor: HTMLTextAreaElement | null,
  columns: number,
  rowCount: number
) => {
  if (!focusEditor(editor) || !editor) {
    return;
  }

  const { selectionStart, selectionEnd, value } = editor;
  const before = value.slice(0, selectionStart);
  const after = value.slice(selectionEnd);
  const table = buildMarkdownTableMarkdown(columns, rowCount);

  const prefix = (() => {
    if (before.length === 0) {
      return "";
    }

    if (before.endsWith("\n\n")) {
      return "";
    }

    if (before.endsWith("\n")) {
      return "\n";
    }

    return "\n\n";
  })();

  const suffix = (() => {
    if (after.length === 0) {
      return "\n";
    }

    if (after.startsWith("\n")) {
      return "";
    }

    return "\n";
  })();

  const insertion = `${prefix}${table}${suffix}`;

  editor.setRangeText(insertion, selectionStart, selectionEnd, "end");

  const tableStart = selectionStart + prefix.length;
  const firstCellStart = tableStart + 2;
  const firstCellEnd = firstCellStart + 3;

  editor.setSelectionRange(firstCellStart, firstCellEnd);
  editor.dispatchEvent(new Event("input", { bubbles: true }));
};

type ListContinuationMatch =
  | {
      type: "bullet";
      prefix: string;
      nextPrefix: string;
      content: string;
    }
  | {
      type: "ordered";
      prefix: string;
      nextPrefix: string;
      content: string;
    }
  | {
      type: "task";
      prefix: string;
      nextPrefix: string;
      content: string;
    };

const getListContinuationMatch = (
  line: string
): ListContinuationMatch | null => {
  const taskMatch = /^(\s*)([-+*])\s+\[(?: |x|X)\]\s?(.*)$/u.exec(line);

  if (taskMatch) {
    const [, indent, marker, content] = taskMatch;

    return {
      type: "task",
      prefix: `${indent}${marker} [ ] `,
      nextPrefix: `${indent}${marker} [ ] `,
      content,
    };
  }

  const orderedMatch = /^(\s*)(\d+|[a-zA-Z]+)([.)])\s+(.*)$/u.exec(line);

  if (orderedMatch) {
    const [, indent, rawMarker, delimiter, content] = orderedMatch;
    const nextMarker = (() => {
      if (/^\d+$/u.test(rawMarker)) {
        return String(Number(rawMarker) + 1);
      }

      const letters = rawMarker.split("");
      const isUpperCase = letters[0] === letters[0]?.toUpperCase();
      const normalized = rawMarker.toLowerCase();
      let carry = 1;
      const next: string[] = [];

      for (let index = normalized.length - 1; index >= 0; index -= 1) {
        const code = normalized.charCodeAt(index) - 97 + carry;

        if (code >= 26) {
          next.unshift("a");
          carry = 1;
          continue;
        }

        next.unshift(String.fromCharCode(97 + code));
        carry = 0;
      }

      if (carry === 1) {
        next.unshift("a");
      }

      const result = next.join("");
      return isUpperCase ? result.toUpperCase() : result;
    })();

    return {
      type: "ordered",
      prefix: `${indent}${rawMarker}${delimiter} `,
      nextPrefix: `${indent}${nextMarker}${delimiter} `,
      content,
    };
  }

  const bulletMatch = /^(\s*)([-+*])\s+(.*)$/u.exec(line);

  if (bulletMatch) {
    const [, indent, marker, content] = bulletMatch;

    return {
      type: "bullet",
      prefix: `${indent}${marker} `,
      nextPrefix: `${indent}${marker} `,
      content,
    };
  }

  return null;
};

export const continueListOnEnterAction = (
  editor: HTMLTextAreaElement | null
) => {
  if (!focusEditor(editor) || !editor) {
    return false;
  }

  const { selectionStart, selectionEnd, value } = editor;

  if (selectionStart !== selectionEnd) {
    return false;
  }

  const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
  const nextLineBreakIndex = value.indexOf("\n", selectionStart);
  const lineEnd =
    nextLineBreakIndex === -1 ? value.length : nextLineBreakIndex;
  const line = value.slice(lineStart, lineEnd);
  const lineBeforeCursor = value.slice(lineStart, selectionStart);
  const lineAfterCursor = value.slice(selectionStart, lineEnd);
  const listMatch = getListContinuationMatch(line);

  if (!listMatch || !lineBeforeCursor.startsWith(listMatch.prefix)) {
    return false;
  }

  const itemText =
    lineBeforeCursor.slice(listMatch.prefix.length) + lineAfterCursor;

  if (itemText.trim().length === 0) {
    editor.setRangeText("", lineStart, lineEnd, "start");
    editor.setSelectionRange(lineStart, lineStart);
    editor.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  }

  const nextValue = `\n${listMatch.nextPrefix}`;
  const nextSelectionStart = selectionStart + nextValue.length;

  editor.setRangeText(nextValue, selectionStart, selectionEnd, "end");
  editor.setSelectionRange(nextSelectionStart, nextSelectionStart);
  editor.dispatchEvent(new Event("input", { bubbles: true }));
  return true;
};

const LIST_LINE_REGEX = /^(\s*)(?:[-+*]\s+|(?:\d+|[a-zA-Z]+)[.)]\s+)/u;
const LIST_INDENT = "  ";

export const indentListOnTabAction = (
  editor: HTMLTextAreaElement | null,
  outdent = false
) => {
  if (!focusEditor(editor) || !editor) {
    return false;
  }

  const { selectionStart, selectionEnd, value } = editor;
  const blockStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
  const blockEndLineBreak = value.indexOf("\n", selectionEnd);
  const blockEnd = blockEndLineBreak === -1 ? value.length : blockEndLineBreak;
  const block = value.slice(blockStart, blockEnd);
  const lines = block.split("\n");

  if (lines.length === 0) {
    return false;
  }

  let cursor = blockStart;
  let startShift = 0;
  let endShift = 0;
  let changed = false;

  const nextLines = lines.map((line) => {
    const isListLine = LIST_LINE_REGEX.test(line);

    if (!isListLine) {
      cursor += line.length + 1;
      return line;
    }

    let nextLine = line;
    let delta = 0;

    if (outdent) {
      if (line.startsWith(LIST_INDENT)) {
        nextLine = line.slice(LIST_INDENT.length);
        delta = -LIST_INDENT.length;
      } else if (line.startsWith("\t")) {
        nextLine = line.slice(1);
        delta = -1;
      }
    } else {
      nextLine = `${LIST_INDENT}${line}`;
      delta = LIST_INDENT.length;
    }

    if (delta !== 0) {
      changed = true;

      if (cursor < selectionStart) {
        startShift += delta;
      }

      if (cursor < selectionEnd) {
        endShift += delta;
      }
    }

    cursor += line.length + 1;
    return nextLine;
  });

  if (!changed) {
    return false;
  }

  const nextBlock = nextLines.join("\n");
  const nextSelectionStart = Math.max(0, selectionStart + startShift);
  const nextSelectionEnd = Math.max(0, selectionEnd + endShift);

  editor.setRangeText(nextBlock, blockStart, blockEnd, "end");
  editor.setSelectionRange(nextSelectionStart, nextSelectionEnd);
  editor.dispatchEvent(new Event("input", { bubbles: true }));
  return true;
};
