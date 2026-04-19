import { json } from "./response";

export class ShareServiceError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status = 400, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const handleShareError = (error: unknown) => {
  if (error instanceof ShareServiceError) {
    return json(
      {
        error: error.message,
        ...(error.code === "password_required"
          ? {
              requiresPassword: true,
            }
          : {}),
      },
      error.status
    );
  }

  return json(
    {
      error:
        error instanceof Error
          ? error.message
          : "Unexpected share service error.",
    },
    500
  );
};
