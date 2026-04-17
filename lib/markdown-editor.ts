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

  const orderedMatch = /^(\s*)(\d+)([.)])\s+(.*)$/u.exec(line);

  if (orderedMatch) {
    const [, indent, rawNumber, delimiter, content] = orderedMatch;
    const number = Number(rawNumber);

    return {
      type: "ordered",
      prefix: `${indent}${rawNumber}${delimiter} `,
      nextPrefix: `${indent}${number + 1}${delimiter} `,
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
