const stripHashAndQuery = (value: string) =>
  value.replace(/[?#].*$/u, "").trim();

const decodeWorkspacePathSegment = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const normalizeWorkspacePath = (value: string) => {
  const sanitized = stripHashAndQuery(value).replace(/\\/gu, "/");

  if (!sanitized) {
    return null;
  }

  const normalized = sanitized
    .split("/")
    .map((segment) => decodeWorkspacePathSegment(segment))
    .filter((segment) => segment !== "" && segment !== ".")
    .reduce<string[] | null>((segments, segment) => {
      if (!segments) {
        return null;
      }

      if (segment === "..") {
        if (segments.length === 0) {
          return null;
        }

        return segments.slice(0, -1);
      }

      return segments.concat(segment);
    }, []);

  if (!normalized || normalized.length === 0) {
    return null;
  }

  return normalized.join("/");
};

const basename = (value: string) => {
  const normalized = value.replace(/\\/gu, "/");
  const segments = normalized.split("/");
  return segments.at(-1) ?? normalized;
};

export const isInternalMarkdownLink = (href: string) => {
  const normalizedHref = href.trim();

  if (!normalizedHref) {
    return false;
  }

  if (
    normalizedHref.startsWith("#") ||
    /^[a-z][a-z\d+\-.]*:/iu.test(normalizedHref) ||
    normalizedHref.startsWith("//")
  ) {
    return false;
  }

  const normalizedPath = normalizeWorkspacePath(normalizedHref);
  return normalizedPath !== null && normalizedPath.toLowerCase().endsWith(".md");
};

export const resolveWorkspaceRelativePath = (
  fromRelativePath: string,
  href: string
) => {
  if (!isInternalMarkdownLink(href)) {
    return null;
  }

  const cleanHref = stripHashAndQuery(href).replace(/\\/gu, "/");
  const fromPath = normalizeWorkspacePath(fromRelativePath);

  if (!fromPath) {
    return null;
  }

  const currentDirectory =
    fromPath.lastIndexOf("/") >= 0
      ? fromPath.slice(0, fromPath.lastIndexOf("/"))
      : "";
  const targetCandidate = cleanHref.startsWith("/")
    ? cleanHref.slice(1)
    : currentDirectory
      ? `${currentDirectory}/${cleanHref}`
      : cleanHref;

  const normalizedPath = normalizeWorkspacePath(targetCandidate);

  if (!normalizedPath || !normalizedPath.toLowerCase().endsWith(".md")) {
    return null;
  }

  return normalizedPath;
};

export const buildRelativeWorkspaceLink = (
  fromRelativePath: string,
  toRelativePath: string
) => {
  const fromPath = normalizeWorkspacePath(fromRelativePath);
  const toPath = normalizeWorkspacePath(toRelativePath);

  if (!fromPath || !toPath) {
    return null;
  }

  const fromDirectorySegments = fromPath.split("/").slice(0, -1);
  const toSegments = toPath.split("/");
  let sharedIndex = 0;

  while (
    sharedIndex < fromDirectorySegments.length &&
    sharedIndex < toSegments.length &&
    fromDirectorySegments[sharedIndex] === toSegments[sharedIndex]
  ) {
    sharedIndex += 1;
  }

  const upwardSegments = Array.from(
    { length: fromDirectorySegments.length - sharedIndex },
    () => ".."
  );
  const downwardSegments = toSegments.slice(sharedIndex);
  const relativePath = upwardSegments.concat(downwardSegments).join("/");

  if (!relativePath || relativePath === basename(toPath)) {
    return `./${basename(toPath)}`;
  }

  if (relativePath.startsWith("..")) {
    return relativePath;
  }

  return `./${relativePath}`;
};
