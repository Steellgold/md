import { NextResponse } from "next/server";

const MAX_REMOTE_FILE_SIZE = 2 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 15_000;
const GITHUB_HOSTS = new Set(["github.com", "www.github.com"]);
const GIST_HOSTS = new Set(["gist.github.com", "www.gist.github.com"]);
const RAW_HOSTS = new Set([
  "raw.githubusercontent.com",
  "gist.githubusercontent.com",
]);

type GistFilePayload = {
  filename?: string | null;
  raw_url?: string | null;
  type?: string | null;
};

type GistPayload = {
  files?: Record<string, GistFilePayload>;
};

class RemoteFileSelectionRequiredError extends Error {
  files: string[];

  constructor(files: string[]) {
    super("This Gist contains multiple files. Choose which one to open.");
    this.files = files;
  }
}

class RemotePasswordRequiredError extends Error {
  constructor(message = "This remote document requires a password.") {
    super(message);
  }
}

const isHttpUrl = (url: URL) =>
  url.protocol === "http:" || url.protocol === "https:";

const isLocalAddress = (hostname: string) => {
  const normalizedHostname = hostname.toLowerCase();

  if (
    normalizedHostname === "localhost" ||
    normalizedHostname === "127.0.0.1" ||
    normalizedHostname === "::1" ||
    normalizedHostname === "[::1]" ||
    normalizedHostname === "0.0.0.0" ||
    normalizedHostname === "host.docker.internal" ||
    normalizedHostname.endsWith(".local")
  ) {
    return true;
  }

  const ipv4Match = normalizedHostname.match(
    /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/u
  );

  if (!ipv4Match) {
    return false;
  }

  const [first, second] = ipv4Match.slice(1).map(Number);

  return (
    first === 10 ||
    first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
};

const getFileNameFromUrl = (url: URL) => {
  const segments = url.pathname.split("/").filter(Boolean);
  const fallback = segments.at(-1) ?? url.hostname;

  try {
    return decodeURIComponent(fallback);
  } catch {
    return fallback;
  }
};

const decodeFileNameValue = (value: string) => {
  const normalizedValue = value.trim().replace(/^"(.*)"$/u, "$1");

  try {
    return decodeURIComponent(normalizedValue);
  } catch {
    return normalizedValue;
  }
};

const getFileNameFromContentDisposition = (value: string | null) => {
  if (!value) {
    return null;
  }

  const utf8FileNameMatch = value.match(/filename\*\s*=\s*UTF-8''([^;]+)/iu);

  if (utf8FileNameMatch?.[1]) {
    return decodeFileNameValue(utf8FileNameMatch[1]);
  }

  const fileNameMatch = value.match(/filename\s*=\s*(".*?"|[^;]+)/iu);

  if (fileNameMatch?.[1]) {
    return decodeFileNameValue(fileNameMatch[1]);
  }

  return null;
};

const createTimeoutSignal = () => AbortSignal.timeout(REQUEST_TIMEOUT_MS);

const resolveGitHubBlobUrl = (url: URL) => {
  const segments = url.pathname.split("/").filter(Boolean);

  if (
    segments.length < 5 ||
    (segments[2] !== "blob" && segments[2] !== "raw")
  ) {
    throw new Error(
      "GitHub URLs must point to a file path such as /blob/main/README.md."
    );
  }

  const [owner, repo, , ref, ...filePath] = segments;

  if (filePath.length === 0) {
    throw new Error("GitHub URLs must target a specific file.");
  }

  const rawUrl = new URL("https://raw.githubusercontent.com");
  rawUrl.pathname = `/${[owner, repo, ref, ...filePath].join("/")}`;

  return {
    downloadUrl: rawUrl,
    fileName: getFileNameFromUrl(rawUrl),
  };
};

const fetchJson = async <T>(url: URL) => {
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "md-open-from-url",
    },
    cache: "no-store",
    signal: createTimeoutSignal(),
  });

  if (!response.ok) {
    throw new Error(
      `Unable to resolve the remote document (${response.status}).`
    );
  }

  return (await response.json()) as T;
};

const pickGistFile = (gist: GistPayload, requestedFileName: string | null) => {
  const files = Object.values(gist.files ?? {}).filter(
    (file) => typeof file.raw_url === "string" && file.raw_url.length > 0
  );

  if (files.length === 0) {
    throw new Error("This Gist does not expose any downloadable files.");
  }

  if (requestedFileName) {
    const match = files.find(
      (file) => file.filename?.toLowerCase() === requestedFileName.toLowerCase()
    );

    if (!match) {
      throw new Error(
        `No file named "${requestedFileName}" was found in the Gist.`
      );
    }

    return match;
  }

  const markdownFiles = files.filter((file) =>
    file.filename?.toLowerCase().endsWith(".md")
  );

  if (markdownFiles.length === 1) {
    return markdownFiles[0];
  }

  const readmeFile = markdownFiles.find((file) =>
    /^readme(\.[^.]+)?\.md$/iu.test(file.filename ?? "")
  );

  if (readmeFile) {
    return readmeFile;
  }

  if (files.length === 1) {
    return files[0];
  }

  throw new RemoteFileSelectionRequiredError(
    files
      .map((file) => file.filename)
      .filter((fileName): fileName is string => typeof fileName === "string")
      .sort((left, right) => left.localeCompare(right))
  );
};

const resolveGistUrl = async (url: URL, requestedFileName?: string) => {
  const segments = url.pathname.split("/").filter(Boolean);
  const gistId = segments.at(-1);

  if (!gistId) {
    throw new Error("The Gist URL is missing its identifier.");
  }

  const apiUrl = new URL(`https://api.github.com/gists/${gistId}`);
  const gist = await fetchJson<GistPayload>(apiUrl);
  const file = pickGistFile(
    gist,
    requestedFileName ?? url.searchParams.get("file")
  );

  return {
    downloadUrl: new URL(file.raw_url!),
    fileName: file.filename ?? "gist.md",
  };
};

const resolveRemoteSource = async (url: URL, requestedFileName?: string) => {
  if (RAW_HOSTS.has(url.hostname)) {
    return {
      downloadUrl: url,
      fileName: getFileNameFromUrl(url),
    };
  }

  if (GITHUB_HOSTS.has(url.hostname)) {
    return resolveGitHubBlobUrl(url);
  }

  if (GIST_HOSTS.has(url.hostname)) {
    return resolveGistUrl(url, requestedFileName);
  }

  return {
    downloadUrl: url,
    fileName: getFileNameFromUrl(url),
  };
};

const fetchRemoteText = async (url: URL, password?: string) => {
  const response = await fetch(url, {
    headers: {
      Accept: "text/markdown, text/plain;q=0.9, */*;q=0.1",
      "User-Agent": "md-open-from-url",
      ...(password
        ? {
            "x-markdown-share-password": password,
          }
        : {}),
    },
    cache: "no-store",
    redirect: "follow",
    signal: createTimeoutSignal(),
  });

  if (response.status === 401) {
    const contentType =
      response.headers.get("content-type")?.toLowerCase() ?? "";

    if (contentType.includes("application/json")) {
      const payload = (await response.json()) as {
        error?: string;
        requiresPassword?: boolean;
      };

      if (payload.requiresPassword) {
        throw new RemotePasswordRequiredError(
          payload.error ?? "This remote document requires a password."
        );
      }
    }
  }

  if (!response.ok) {
    throw new Error(
      `Unable to download the remote document (${response.status}).`
    );
  }

  const contentLength = Number(response.headers.get("content-length") ?? "0");

  if (contentLength > MAX_REMOTE_FILE_SIZE) {
    throw new Error("The remote document is too large to open in the editor.");
  }

  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";

  if (contentType.includes("text/html")) {
    throw new Error(
      "The URL returned an HTML page. Use a direct file URL instead."
    );
  }

  const content = await response.text();

  if (content.length > MAX_REMOTE_FILE_SIZE) {
    throw new Error("The remote document is too large to open in the editor.");
  }

  return {
    content,
    fileName: getFileNameFromContentDisposition(
      response.headers.get("content-disposition")
    ),
  };
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      fileName?: string;
      password?: string;
      url?: string;
    };
    const rawUrl = body.url?.trim();

    if (!rawUrl) {
      return NextResponse.json(
        { error: "Enter a URL to open." },
        { status: 400 }
      );
    }

    const sourceUrl = new URL(rawUrl);

    if (!isHttpUrl(sourceUrl)) {
      return NextResponse.json(
        { error: "Only http:// and https:// URLs are supported." },
        { status: 400 }
      );
    }

    if (isLocalAddress(sourceUrl.hostname)) {
      return NextResponse.json(
        { error: "Local and private network URLs are not allowed here." },
        { status: 400 }
      );
    }

    const { downloadUrl, fileName } = await resolveRemoteSource(
      sourceUrl,
      body.fileName?.trim() || undefined
    );

    if (isLocalAddress(downloadUrl.hostname)) {
      return NextResponse.json(
        { error: "The resolved URL points to a blocked local address." },
        { status: 400 }
      );
    }

    const remoteFile = await fetchRemoteText(
      downloadUrl,
      body.password?.trim()
    );

    return NextResponse.json({
      content: remoteFile.content,
      name: remoteFile.fileName ?? fileName,
      selectedFileName: fileName,
      url: sourceUrl.toString(),
      resolvedUrl: downloadUrl.toString(),
    });
  } catch (error) {
    if (error instanceof RemoteFileSelectionRequiredError) {
      return NextResponse.json(
        {
          error: error.message,
          files: error.files,
        },
        { status: 409 }
      );
    }

    if (error instanceof RemotePasswordRequiredError) {
      return NextResponse.json(
        {
          error: error.message,
          requiresPassword: true,
        },
        { status: 401 }
      );
    }

    const message =
      error instanceof Error ? error.message : "Unable to open the remote URL.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
