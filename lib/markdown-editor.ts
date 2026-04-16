"use client";

type EditorCommand = "undo" | "redo" | "cut" | "copy" | "paste" | "selectAll";

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
  prefix: string,
  placeholder = "List item"
) => {
  if (!focusEditor(editor) || !editor) {
    return;
  }

  const { selectionStart, selectionEnd, value } = editor;
  const selectedText = value.slice(selectionStart, selectionEnd) || placeholder;
  const nextValue = selectedText
    .split("\n")
    .map((line) => `${prefix}${line}`)
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
