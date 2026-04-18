import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type CollaborationRoomServiceResponse = {
  room?: {
    id: string;
    accessMode: "open" | "invite" | "password";
    inviteToken: string | null;
    joinUrl: string;
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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      accessMode?: "open" | "invite" | "password";
      appBaseUrl?: string | null;
      inviteToken?: string | null;
      password?: string | null;
    };
    const accessMode = body.accessMode ?? "open";

    if (!["open", "invite", "password"].includes(accessMode)) {
      return NextResponse.json(
        { error: "Invalid collaboration access mode." },
        { status: 400 }
      );
    }

    const shareApiBaseUrl = getRequiredEnvironmentValue("SHARE_API_BASE_URL");
    const appBaseUrl =
      body.appBaseUrl?.trim() ||
      process.env.NEXT_PUBLIC_APP_URL?.trim() ||
      new URL(request.url).origin;

    const response = await fetch(`${shareApiBaseUrl}/v1/collab/rooms`, {
      method: "POST",
      headers: getShareApiHeaders(),
      body: JSON.stringify({
        accessMode,
        appBaseUrl,
        inviteToken: body.inviteToken,
        password: body.password,
      }),
      cache: "no-store",
    });
    const payload = (await response.json()) as CollaborationRoomServiceResponse;

    if (!response.ok || !payload.room) {
      return NextResponse.json(
        { error: payload.error ?? "Unable to create collaborative room." },
        { status: response.status || 502 }
      );
    }

    return NextResponse.json({
      room: payload.room,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to create collaborative room.",
      },
      { status: 500 }
    );
  }
}
