import type { MarkdownShare, MarkdownShareOptions, MarkdownShareResult } from "@/types/markdown";

const normalizeMarkdownContent = (content: string) =>
  content.replace(/\r\n/gu, "\n");

export const normalizeRemoteUrl = (value: string | null | undefined) => {
  const trimmedValue = (value ?? "").trim();

  if (trimmedValue === "") {
    return null;
  }

  try {
    return new URL(trimmedValue).toString();
  } catch {
    return trimmedValue;
  }
};

export const getShareTargetUrl = (value: string | null | undefined) => {
  const normalizedValue = normalizeRemoteUrl(value);

  if (!normalizedValue) {
    return null;
  }

  try {
    const shareUrl = new URL(normalizedValue);
    return normalizeRemoteUrl(shareUrl.searchParams.get("open"));
  } catch {
    return null;
  }
};

export const requestMarkdownFromUrl = async (
  url: string,
  fileName?: string,
  password?: string
): Promise<
  | {
      status: "opened";
      content: string;
      name: string;
      selectedFileName: string | null;
      url: string;
    }
  | {
      status: "password-required";
    }
  | {
      status: "selection-required";
      files: string[];
    }
> => {
  const response = await fetch("/api/open-from-url", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url, fileName, password }),
  });

  const payload = (await response.json()) as {
    content?: string;
    error?: string;
    files?: string[];
    name?: string;
    requiresPassword?: boolean;
    selectedFileName?: string | null;
    url?: string;
  };

  if (
    response.status === 409 &&
    Array.isArray(payload.files) &&
    payload.files.every((item) => typeof item === "string")
  ) {
    return {
      status: "selection-required",
      files: payload.files,
    };
  }

  if (response.status === 401 && payload.requiresPassword) {
    return {
      status: "password-required",
    };
  }

  if (!response.ok) {
    throw new Error(payload.error ?? "Unable to open the remote URL.");
  }

  if (
    typeof payload.content !== "string" ||
    typeof payload.name !== "string" ||
    typeof payload.url !== "string"
  ) {
    throw new Error("The remote URL returned an invalid response.");
  }

  return {
    status: "opened",
    content: normalizeMarkdownContent(payload.content),
    name: payload.name,
    selectedFileName:
      typeof payload.selectedFileName === "string"
        ? payload.selectedFileName
        : null,
    url: payload.url,
  };
};

export const requestMarkdownShare = async (
  fileName: string,
  content: string,
  existingShareId?: string | null,
  options: MarkdownShareOptions = {}
): Promise<MarkdownShareResult> => {
  const response = await fetch("/api/share", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content,
      existingShareId,
      name: fileName,
      password: options.password,
      removePassword: options.removePassword,
    }),
  });
  const payload = (await response.json()) as {
    error?: string;
    share?: MarkdownShare;
  };

  if (!response.ok || !payload.share) {
    throw new Error(payload.error ?? "Unable to share the document.");
  }

  return {
    share: payload.share,
  };
};
