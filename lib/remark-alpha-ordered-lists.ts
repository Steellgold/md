import type { List, ListItem, Paragraph, Root } from "mdast";
import type { Parent } from "unist";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";

const ALPHA_LINE = /^[a-z]\.\s.+/i;

const MARKER_SPLIT = /(^|[\s\u00a0]+)([a-z])(\.\s+)/gi;

const getParagraphLines = (paragraph: Paragraph): string[] | null => {
  const lines: string[] = [];
  let current = "";

  for (const child of paragraph.children) {
    if (child.type === "text") {
      current += child.value;
      continue;
    }

    if (child.type === "break") {
      lines.push(current);
      current = "";
      continue;
    }

    return null;
  }

  lines.push(current);
  return lines;
};

const splitSpacedAlphaItems = (text: string): string[] | null => {
  const t = text.trim();
  const hits: { start: number; letter: string }[] = [];
  let match: RegExpExecArray | null;

  MARKER_SPLIT.lastIndex = 0;
  while ((match = MARKER_SPLIT.exec(t)) !== null) {
    hits.push({
      start: match.index + match[1].length,
      letter: match[2]!.toLowerCase(),
    });
  }

  if (hits.length < 2 || hits[0]!.letter !== "a") {
    return null;
  }

  for (let index = 1; index < hits.length; index += 1) {
    const previous = hits[index - 1]!.letter.charCodeAt(0);
    const current = hits[index]!.letter.charCodeAt(0);

    if (current !== previous + 1) {
      return null;
    }
  }

  const segments: string[] = [];

  for (let index = 0; index < hits.length; index += 1) {
    const end =
      index + 1 < hits.length ? hits[index + 1]!.start : t.length;
    segments.push(t.slice(hits[index]!.start, end).trim());
  }

  if (!segments.every((line) => ALPHA_LINE.test(line))) {
    return null;
  }

  return segments;
};

const collectAlphaLines = (paragraph: Paragraph): string[] | null => {
  const rawLines = getParagraphLines(paragraph);

  if (!rawLines) {
    return null;
  }

  const nonEmpty = rawLines.map((line) => line.trim()).filter(Boolean);

  if (
    nonEmpty.length >= 2 &&
    nonEmpty.every((line) => ALPHA_LINE.test(line))
  ) {
    return nonEmpty;
  }

  if (nonEmpty.length === 1) {
    return splitSpacedAlphaItems(nonEmpty[0]!);
  }

  return null;
};

const listTypeFromFirstLine = (firstLine: string): "a" | "A" =>
  /^[A-Z]\./u.test(firstLine) ? "A" : "a";

export const remarkAlphaOrderedLists: Plugin<[], Root> = () => (tree) => {
  visit(tree, "paragraph", (node, index, parent) => {
    if (index === undefined || !parent) {
      return;
    }

    const lines = collectAlphaLines(node);

    if (!lines) {
      return;
    }

    const listType = listTypeFromFirstLine(lines[0]!);

    const listNode: List = {
      type: "list",
      ordered: true,
      start: 1,
      spread: false,
      data: { hProperties: { type: listType } },
      children: lines.map(
        (line): ListItem => ({
          type: "listItem",
          spread: false,
          children: [
            {
              type: "paragraph",
              children: [
                {
                  type: "text",
                  value: line.replace(/^[a-z]\.\s/i, "").trim(),
                },
              ],
            },
          ],
        })
      ),
    };

    (parent as Parent).children.splice(index, 1, listNode);
  });
};
