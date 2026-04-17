import { type Element, type Root, type RootContent, type Text } from "hast";

import { type MarkdownViewerSelection } from "@/types/markdown-viewer-selection";

type TextSegment = {
  start: number;
  end: number;
  node: Text;
};

type CaretTarget = {
  node: Text;
  offset: number;
};

const skippedTagNames = new Set(["code", "pre", "script", "style"]);

const createTextNode = (value: string): Text => ({
  type: "text",
  value,
});

const createSelectionNode = (value: string): Element => ({
  type: "element",
  tagName: "span",
  properties: {
    className: ["md-viewer-selection"],
  },
  children: [createTextNode(value)],
});

const createCaretNode = (): Element => ({
  type: "element",
  tagName: "span",
  properties: {
    className: ["md-viewer-caret"],
    ariaHidden: "true",
  },
  children: [],
});

const getTextOffsets = (node: Text) => {
  const start = node.position?.start.offset;
  const end = node.position?.end.offset;

  if (typeof start !== "number" || typeof end !== "number" || end < start) {
    return null;
  }

  return { start, end };
};

const getLocalTextOffset = (node: Text, sourceOffset: number) => {
  const offsets = getTextOffsets(node);

  if (!offsets) {
    return 0;
  }

  const rawLength = offsets.end - offsets.start;
  const nextOffset = Math.max(
    0,
    Math.min(sourceOffset - offsets.start, rawLength)
  );

  if (rawLength === 0 || rawLength === node.value.length) {
    return Math.max(0, Math.min(nextOffset, node.value.length));
  }

  return Math.max(
    0,
    Math.min(
      Math.round((nextOffset / rawLength) * node.value.length),
      node.value.length
    )
  );
};

const collectTextSegments = (node: Root | Element, segments: TextSegment[]) => {
  node.children.forEach((child) => {
    if (child.type === "element") {
      if (skippedTagNames.has(child.tagName)) {
        return;
      }

      collectTextSegments(child, segments);
      return;
    }

    if (child.type !== "text" || child.value.length === 0) {
      return;
    }

    const offsets = getTextOffsets(child);

    if (!offsets) {
      return;
    }

    segments.push({
      ...offsets,
      node: child,
    });
  });
};

const getCaretTarget = (caret: number, segments: TextSegment[]) => {
  const firstSegment = segments[0];

  if (!firstSegment) {
    return null;
  }

  if (caret <= firstSegment.start) {
    return {
      node: firstSegment.node,
      offset: 0,
    };
  }

  for (const segment of segments) {
    if (caret <= segment.start) {
      return {
        node: segment.node,
        offset: 0,
      };
    }

    if (caret < segment.end) {
      return {
        node: segment.node,
        offset: getLocalTextOffset(segment.node, caret),
      };
    }
  }

  const lastSegment = segments.at(-1);

  if (!lastSegment) {
    return null;
  }

  return {
    node: lastSegment.node,
    offset: lastSegment.node.value.length,
  };
};

const decorateTextNode = (
  node: Text,
  selectionStart: number,
  selectionEnd: number,
  caretTarget: CaretTarget | null
): RootContent[] => {
  const offsets = getTextOffsets(node);

  if (!offsets || node.value.length === 0) {
    return [node];
  }

  const hasSelection =
    selectionStart < selectionEnd &&
    selectionStart < offsets.end &&
    selectionEnd > offsets.start;
  const hasCaret = caretTarget?.node === node;

  if (!hasSelection && !hasCaret) {
    return [node];
  }

  const boundaries = new Set<number>([0, node.value.length]);

  if (hasSelection) {
    boundaries.add(getLocalTextOffset(node, selectionStart));
    boundaries.add(getLocalTextOffset(node, selectionEnd));
  }

  if (hasCaret && caretTarget) {
    boundaries.add(caretTarget.offset);
  }

  const sortedBoundaries = [...boundaries].sort((left, right) => left - right);
  const nextChildren: RootContent[] = [];

  for (let index = 0; index < sortedBoundaries.length - 1; index += 1) {
    const segmentStart = sortedBoundaries[index]!;
    const segmentEnd = sortedBoundaries[index + 1]!;

    if (hasCaret && caretTarget?.offset === segmentStart) {
      nextChildren.push(createCaretNode());
    }

    if (segmentStart === segmentEnd) {
      continue;
    }

    const value = node.value.slice(segmentStart, segmentEnd);

    if (!value) {
      continue;
    }

    const rawSegmentStart =
      offsets.start + Math.min(segmentStart, offsets.end - offsets.start);
    const rawSegmentEnd =
      offsets.start + Math.min(segmentEnd, offsets.end - offsets.start);
    const isSelected =
      hasSelection &&
      rawSegmentStart >= selectionStart &&
      rawSegmentEnd <= selectionEnd;

    nextChildren.push(
      isSelected ? createSelectionNode(value) : createTextNode(value)
    );
  }

  if (hasCaret && caretTarget?.offset === node.value.length) {
    nextChildren.push(createCaretNode());
  }

  return nextChildren.length > 0 ? nextChildren : [node];
};

const decorateTree = (
  node: Root | Element,
  selectionStart: number,
  selectionEnd: number,
  caretTarget: CaretTarget | null
) => {
  const nextChildren: RootContent[] = [];

  node.children.forEach((child) => {
    if (child.type === "element") {
      if (!skippedTagNames.has(child.tagName)) {
        decorateTree(child, selectionStart, selectionEnd, caretTarget);
      }

      nextChildren.push(child);
      return;
    }

    if (child.type === "text") {
      nextChildren.push(
        ...decorateTextNode(child, selectionStart, selectionEnd, caretTarget)
      );
      return;
    }

    nextChildren.push(child);
  });

  node.children = nextChildren;
};

export const rehypeMarkdownViewerSelection = (
  selection: MarkdownViewerSelection
) => {
  return (tree: Root) => {
    const selectionStart = Math.max(0, Math.min(selection.start, selection.end));
    const selectionEnd = Math.max(selection.start, selection.end);
    const segments: TextSegment[] = [];

    collectTextSegments(tree, segments);

    if (segments.length === 0) {
      return;
    }

    const caretTarget =
      selectionStart === selectionEnd
        ? getCaretTarget(selectionStart, segments)
        : null;

    decorateTree(tree, selectionStart, selectionEnd, caretTarget);
  };
};
