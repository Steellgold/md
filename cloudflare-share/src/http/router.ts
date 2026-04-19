type RouteHandlers = {
  onReadShare: (request: Request, token: string) => Promise<Response>;
  onCreateShare: (request: Request) => Promise<Response>;
  onCreateCollabRoom: (request: Request) => Promise<Response>;
  onJoinCollabRoom: (request: Request) => Promise<Response>;
  onCollabConnect: (request: Request, roomId: string) => Promise<Response>;
};

export const routeRequest = (
  request: Request,
  handlers: RouteHandlers
) => {
  const url = new URL(request.url);

  if (request.method === "GET" && url.pathname === "/health") {
    return { kind: "health" as const };
  }

  if (request.method === "POST" && url.pathname === "/v1/shares") {
    return handlers.onCreateShare(request);
  }

  if (request.method === "POST" && url.pathname === "/v1/collab/rooms") {
    return handlers.onCreateCollabRoom(request);
  }

  if (request.method === "POST" && url.pathname === "/v1/collab/join") {
    return handlers.onJoinCollabRoom(request);
  }

  if (
    request.method === "GET" &&
    url.pathname.startsWith("/v1/collab/connect/")
  ) {
    return handlers.onCollabConnect(
      request,
      decodeURIComponent(url.pathname.slice("/v1/collab/connect/".length))
    );
  }

  if (request.method === "GET" && url.pathname.startsWith("/s/")) {
    return handlers.onReadShare(
      request,
      decodeURIComponent(url.pathname.slice("/s/".length))
    );
  }

  return null;
};
