import { handleShareError } from "./http/errors";
import { createOptionsResponse, json } from "./http/response";
import { routeRequest } from "./http/router";
import {
  handleCollaborationWebSocket,
  handleCreateCollaborationRoom,
  handleCreateShare,
  handleJoinCollaborationRoom,
  handleReadShare,
  type ShareWorkerEnv,
} from "./share-http";

export { CollaborationRoom } from "./collaboration-room";

const shareWorker = {
  async fetch(request: Request, env: ShareWorkerEnv) {
    if (request.method === "OPTIONS") {
      return createOptionsResponse();
    }

    try {
      const routed = routeRequest(request, {
        onCreateCollabRoom: (nextRequest) =>
          handleCreateCollaborationRoom(nextRequest, env),
        onCreateShare: (nextRequest) => handleCreateShare(nextRequest, env),
        onJoinCollabRoom: (nextRequest) =>
          handleJoinCollaborationRoom(nextRequest, env),
        onCollabConnect: (nextRequest, roomId) =>
          handleCollaborationWebSocket(nextRequest, env, roomId),
        onReadShare: (nextRequest, token) => handleReadShare(nextRequest, env, token),
      });

      if (routed && "kind" in routed && routed.kind === "health") {
        return json({ ok: true });
      }

      if (routed) {
        return routed;
      }

      return json({ error: "Not found." }, 404);
    } catch (error) {
      return handleShareError(error);
    }
  },
};

export default shareWorker;
