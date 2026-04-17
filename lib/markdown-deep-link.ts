type MarkdownDeepLinkSource = "query" | "open-path" | "absolute-path";

export type ParsedMarkdownDeepLink = {
  source: MarkdownDeepLinkSource;
  targetUrl: string;
};

type SearchParamsReader = {
  get: (name: string) => string | null;
};

const safeDecode = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const normalizeTarget = (value: string | null | undefined) => {
  const decodedValue = safeDecode(value ?? "").trim();
  return decodedValue === "" ? null : decodedValue;
};

const hasHttpProtocol = (value: string) =>
  value.startsWith("https://") || value.startsWith("http://");

export const extractMarkdownDeepLink = (
  pathname: string,
  searchParams: SearchParamsReader
): ParsedMarkdownDeepLink | null => {
  const queryTarget = normalizeTarget(searchParams.get("open"));

  if (queryTarget) {
    return {
      source: "query",
      targetUrl: queryTarget,
    };
  }

  const openPathPrefix = "/open/";

  if (pathname.startsWith(openPathPrefix)) {
    const openPathTarget = normalizeTarget(pathname.slice(openPathPrefix.length));

    if (openPathTarget && hasHttpProtocol(openPathTarget)) {
      return {
        source: "open-path",
        targetUrl: openPathTarget,
      };
    }
  }

  const absolutePathTarget = normalizeTarget(pathname.slice(1));

  if (absolutePathTarget && hasHttpProtocol(absolutePathTarget)) {
    return {
      source: "absolute-path",
      targetUrl: absolutePathTarget,
    };
  }

  return null;
};
