"use client";

import CaretCoordinates from "textarea-caret-position";

type CaretCoordinatesResult = {
  top: number;
  left: number;
  height: number;
};

export type TextareaRangeCoordinates = {
  top: number;
  left: number;
  width: number;
  height: number;
};

type TextareaCaretInstance = {
  get: (
    positionLeft: number,
    positionRight: number
  ) => {
    top: number;
    left: number;
    right: number;
  };
};

const caretInstanceCache = new WeakMap<
  HTMLTextAreaElement,
  TextareaCaretInstance
>();

const getCaretInstance = (textarea: HTMLTextAreaElement) => {
  const cachedInstance = caretInstanceCache.get(textarea);

  if (cachedInstance) {
    return cachedInstance;
  }

  const instance = new CaretCoordinates(textarea) as TextareaCaretInstance;
  caretInstanceCache.set(textarea, instance);
  return instance;
};

export const getTextareaCaretCoordinates = (
  textarea: HTMLTextAreaElement,
  position: number
): CaretCoordinatesResult => {
  const safePosition = Math.max(0, Math.min(position, textarea.value.length));
  const coordinates = getCaretInstance(textarea).get(safePosition, safePosition);
  const lineHeight = parseFloat(window.getComputedStyle(textarea).lineHeight);
  const resolvedLineHeight = Number.isFinite(lineHeight) ? lineHeight : 16;

  return {
    top: coordinates.top - textarea.scrollTop,
    left: coordinates.left - textarea.scrollLeft,
    height: Math.max(14, resolvedLineHeight),
  };
};

export const getTextareaRangeCoordinates = (
  textarea: HTMLTextAreaElement,
  start: number,
  end: number
): TextareaRangeCoordinates[] => {
  const safeStart = Math.max(0, Math.min(start, textarea.value.length));
  const safeEnd = Math.max(0, Math.min(end, textarea.value.length));
  const rangeStart = Math.min(safeStart, safeEnd);
  const rangeEnd = Math.max(safeStart, safeEnd);

  if (rangeStart === rangeEnd) {
    return [];
  }

  const value = textarea.value;
  const instance = getCaretInstance(textarea);
  const lineHeight = parseFloat(window.getComputedStyle(textarea).lineHeight);
  const resolvedLineHeight = Number.isFinite(lineHeight) ? lineHeight : 16;
  const rects: TextareaRangeCoordinates[] = [];
  let segmentStart = rangeStart;

  while (segmentStart < rangeEnd) {
    const nextLineBreakIndex = value.indexOf("\n", segmentStart);
    const segmentEnd =
      nextLineBreakIndex === -1 || nextLineBreakIndex >= rangeEnd
        ? rangeEnd
        : nextLineBreakIndex;

    if (segmentEnd > segmentStart) {
      const coordinates = instance.get(segmentStart, segmentEnd);
      rects.push({
        top: coordinates.top - textarea.scrollTop,
        left: coordinates.left - textarea.scrollLeft,
        width: Math.max(2, coordinates.right - coordinates.left),
        height: Math.max(14, resolvedLineHeight),
      });
    }

    if (nextLineBreakIndex === -1 || nextLineBreakIndex >= rangeEnd) {
      break;
    }

    segmentStart = nextLineBreakIndex + 1;

    if (segmentStart === rangeEnd) {
      const coordinates = instance.get(segmentStart, segmentStart);
      rects.push({
        top: coordinates.top - textarea.scrollTop,
        left: coordinates.left - textarea.scrollLeft,
        width: 2,
        height: Math.max(14, resolvedLineHeight),
      });
    }
  }

  return rects;
};
