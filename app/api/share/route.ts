import { NextResponse } from "next/server";

import { buildMarkdownShareAppUrl } from "@/lib/markdown-share";
import { type MarkdownShare } from "@/types/markdown";

export const dynamic = "force-dynamic";

type ShareServiceResponse = {
  share?: {
    contentHash: string;
    directUrl: string;
    id: string;
    lastSharedAt: string;
    requiresPassword: boolean;
  };
  error?: string;
};

const getRequiredEnvironmentValue = (name: string) => {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}.`);
  }

  return value;
};

const getPublicAppBaseUrl = (request: Request) =>
  process.env.NEXT_PUBLIC_APP_URL?.trim() || new URL(request.url).origin;

const getShareApiHeaders = (): HeadersInit => {
  const token = process.env.SHARE_API_TOKEN?.trim();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

const toMarkdownShare = (
  request: Request,
  share: NonNullable<ShareServiceResponse["share"]>
): MarkdownShare => ({
  id: share.id,
  url: buildMarkdownShareAppUrl(getPublicAppBaseUrl(request), share.directUrl),
  contentHash: share.contentHash,
  lastSharedAt: share.lastSharedAt,
  requiresPassword: share.requiresPassword,
});

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      content?: string;
      existingShareId?: string | null;
      name?: string;
      password?: string | null;
      removePassword?: boolean;
    };
    const content = body.content?.toString() ?? "";

    if (content.trim() === "") {
      return NextResponse.json(
        { error: "You cannot share an empty document." },
        { status: 400 }
      );
    }

    const shareApiBaseUrl = getRequiredEnvironmentValue("SHARE_API_BASE_URL");
    const response = await fetch(`${shareApiBaseUrl}/v1/shares`, {
      method: "POST",
      headers: getShareApiHeaders(),
      body: JSON.stringify({
        content,
        existingShareId: body.existingShareId,
        name: body.name?.toString() ?? "document.md",
        password: body.password,
        removePassword: body.removePassword,
      }),
      cache: "no-store",
    });
    const payload = (await response.json()) as ShareServiceResponse;

    if (!response.ok || !payload.share) {
      return NextResponse.json(
        { error: payload.error ?? "Unable to share the document." },
        { status: response.status || 502 }
      );
    }

    return NextResponse.json({
      share: toMarkdownShare(request, payload.share),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to share the document.",
      },
      { status: 500 }
    );
  }
}
