import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type CollaborationJoinServiceResponse = {
  connection?: {
    roomId: string;
    wsBaseUrl: string;
    token: string;
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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      roomId?: string;
      inviteToken?: string | null;
      password?: string | null;
    };
    const roomId = body.roomId?.trim();

    if (!roomId) {
      return NextResponse.json({ error: "Room id is required." }, { status: 400 });
    }

    const shareApiBaseUrl = getRequiredEnvironmentValue("SHARE_API_BASE_URL");
    const response = await fetch(`${shareApiBaseUrl}/v1/collab/join`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        roomId,
        inviteToken: body.inviteToken,
        password: body.password,
      }),
      cache: "no-store",
    });
    const payload = (await response.json()) as CollaborationJoinServiceResponse;

    if (!response.ok || !payload.connection) {
      return NextResponse.json(
        { error: payload.error ?? "Unable to join collaborative room." },
        { status: response.status || 502 }
      );
    }

    return NextResponse.json({
      connection: payload.connection,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to join collaborative room.",
      },
      { status: 500 }
    );
  }
}
