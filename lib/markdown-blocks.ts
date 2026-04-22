const CODE_FENCE_PATTERN = /^(\s*)(`{3,}|~{3,})/u;
const TABLE_LINE_PATTERN = /^\s*\|.*\|\s*$/u;

const isBlankLine = (line: string) => line.trim().length === 0;

const isTableSeparator = (line: string) => {
  const trimmed = line.trim();
  return /^[:\-| ]+$/u.test(trimmed) && trimmed.includes("-");
};

const isTableLine = (line: string) =>
  TABLE_LINE_PATTERN.test(line) || isTableSeparator(line);

export const normalizeMarkdownBlocks = (content: string) => {
  if (!content) {
    return "";
  }

  const lines = content.replaceAll("\r\n", "\n").split("\n");
  const output: string[] = [];
  let inCodeFence = false;
  let activeFenceMarker = "";
  let activeFenceIndent = "";

  const pushLine = (line: string) => {
    output.push(line);
  };

  const pushBlockSeparatorIfNeeded = () => {
    if (output.length === 0 || isBlankLine(output[output.length - 1] ?? "")) {
      return;
    }

    output.push("");
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";

    if (inCodeFence) {
      pushLine(line);

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
      pushLine(line);
      inCodeFence = true;
      activeFenceIndent = fenceMatch[1] ?? "";
      activeFenceMarker = fenceMatch[2] ?? "```";
      continue;
    }

    if (isTableLine(line)) {
      if (!isTableLine(output[output.length - 1] ?? "")) {
        pushBlockSeparatorIfNeeded();
      }

      pushLine(line);
      continue;
    }

    const previousLine = output[output.length - 1] ?? "";
    if (!isBlankLine(previousLine)) {
      pushBlockSeparatorIfNeeded();
    }

    pushLine(line);
  }

  return output.join("\n").trimEnd();
};
