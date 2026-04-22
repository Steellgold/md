const CODE_FENCE_PATTERN = /^(\s*)(`{3,}|~{3,})/u;
const TABLE_LINE_PATTERN = /^\s*\|.*\|\s*$/u;

const isBlankLine = (line: string) => line.trim().length === 0;

const isTableSeparator = (line: string) => {
  const trimmed = line.trim();
  return /^[:\-| ]+$/u.test(trimmed) && trimmed.includes("-");
};

const isTableLine = (line: string) =>
  TABLE_LINE_PATTERN.test(line) || isTableSeparator(line);

type SourceLine = {
  start: number;
  end: number;
  value: string;
};

type MarkdownNormalizationResult = {
  content: string;
  mapOffset: (offset: number) => number;
};

const buildSourceLines = (content: string): SourceLine[] => {
  const lines: SourceLine[] = [];
  let cursor = 0;

  while (cursor <= content.length) {
    const lineEnd = content.indexOf("\n", cursor);

    if (lineEnd === -1) {
      lines.push({
        start: cursor,
        end: content.length,
        value: content.slice(cursor),
      });
      break;
    }

    lines.push({
      start: cursor,
      end: lineEnd,
      value: content.slice(cursor, lineEnd),
    });
    cursor = lineEnd + 1;
  }

  return lines;
};

export const normalizeMarkdownBlocksWithMap = (
  content: string
): MarkdownNormalizationResult => {
  if (!content) {
    return {
      content: "",
      mapOffset: () => 0,
    };
  }

  const lines = buildSourceLines(content);
  const output: string[] = [];
  const lineStartMap = new Map<number, number>();
  let inCodeFence = false;
  let activeFenceMarker = "";
  let activeFenceIndent = "";
  let outputLength = 0;

  const pushLine = (line: string, sourceStart?: number) => {
    if (typeof sourceStart === "number") {
      lineStartMap.set(sourceStart, outputLength);
    }

    output.push(line);
    outputLength += line.length;
  };

  const pushBlockSeparatorIfNeeded = () => {
    if (output.length === 0 || isBlankLine(output[output.length - 1] ?? "")) {
      return;
    }

    output.push("");
    outputLength += 1;
  };

  for (let index = 0; index < lines.length; index += 1) {
    const sourceLine = lines[index];
    const line = sourceLine?.value ?? "";

    if (inCodeFence) {
      pushLine(line, sourceLine?.start);

      const closingPattern = new RegExp(
        `^${activeFenceIndent}${activeFenceMarker}\\s*$`,
        "u"
      );

      if (closingPattern.test(line)) {
        inCodeFence = false;
        activeFenceMarker = "";
        activeFenceIndent = "";
      }

      continue;
    }

    if (isBlankLine(line)) {
      pushBlockSeparatorIfNeeded();
      continue;
    }

    const fenceMatch = CODE_FENCE_PATTERN.exec(line);
    if (fenceMatch) {
      pushBlockSeparatorIfNeeded();
      pushLine(line, sourceLine?.start);
      inCodeFence = true;
      activeFenceIndent = fenceMatch[1] ?? "";
      activeFenceMarker = fenceMatch[2] ?? "```";
      continue;
    }

    if (isTableLine(line)) {
      if (!isTableLine(output[output.length - 1] ?? "")) {
        pushBlockSeparatorIfNeeded();
      }

      pushLine(line, sourceLine?.start);
      continue;
    }

    const previousLine = output[output.length - 1] ?? "";
    if (!isBlankLine(previousLine)) {
      pushBlockSeparatorIfNeeded();
    }

    pushLine(line, sourceLine?.start);
  }

  const normalized = output.join("\n");

  const mapOffset = (offset: number) => {
    const safeOffset = Math.max(0, Math.min(offset, content.length));

    for (let index = 0; index < lines.length; index += 1) {
      const sourceLine = lines[index];
      if (!sourceLine) {
        continue;
      }

      if (safeOffset < sourceLine.start) {
        continue;
      }

      if (safeOffset <= sourceLine.end) {
        const mappedLineStart = lineStartMap.get(sourceLine.start);
        if (typeof mappedLineStart !== "number") {
          return normalized.length;
        }

        const localOffset = Math.min(
          safeOffset - sourceLine.start,
          sourceLine.value.length
        );
        return mappedLineStart + localOffset;
      }
    }

    return normalized.length;
  };

  return {
    content: normalized,
    mapOffset,
  };
};

export const normalizeMarkdownBlocks = (content: string) =>
  normalizeMarkdownBlocksWithMap(content).content;
