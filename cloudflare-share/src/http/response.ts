const CORS_HEADERS = {
  "access-control-allow-headers":
    "authorization, content-type, x-markdown-share-password",
  "access-control-allow-methods": "GET, OPTIONS, POST",
  "access-control-allow-origin": "*",
} as const;

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

export const createOptionsResponse = () =>
  new Response(null, {
    headers: CORS_HEADERS,
  });

export const createMarkdownResponse = (
  content: string,
  fileName: string,
  contentHash: string
) =>
  new Response(content, {
    headers: {
      "access-control-allow-origin": "*",
      "cache-control": "no-store",
      "content-type": "text/markdown; charset=utf-8",
      "content-disposition": [
        `inline; filename="${fileName}"`,
        `filename*=UTF-8''${encodeURIComponent(fileName)}`,
      ].join("; "),
      etag: `"${contentHash}"`,
    },
  });
