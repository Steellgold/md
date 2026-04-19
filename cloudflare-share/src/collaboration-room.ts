import * as decoding from "lib0/decoding";
import * as encoding from "lib0/encoding";
import * as awarenessProtocol from "y-protocols/awareness";
import * as syncProtocol from "y-protocols/sync";
import * as Y from "yjs";

type DurableObjectStateLike = {
  storage: {
    get: <T = unknown>(key: string) => Promise<T | undefined>;
    put: (key: string, value: unknown) => Promise<void>;
  };
  waitUntil: (promise: Promise<unknown>) => void;
  blockConcurrencyWhile: <T>(callback: () => Promise<T>) => Promise<T>;
};

declare const WebSocketPair: {
  new (): {
    0: WebSocket;
    1: WebSocket;
  };
};

const encoder = new TextEncoder();

const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;
const MESSAGE_QUERY_AWARENESS = 3;

type WebSocketMessagePayload =
  | string
  | ArrayBuffer
  | Uint8Array
  | ArrayBufferView
  | Blob;

const toUint8Array = async (data: WebSocketMessagePayload) => {
  if (data instanceof Uint8Array) {
    return data;
  }

  if (typeof Blob !== "undefined" && data instanceof Blob) {
    return new Uint8Array(await data.arrayBuffer());
  }

  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }

  if (typeof data === "string") {
    return encoder.encode(data);
  }

  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data);
  }

  return new Uint8Array(0);
};

export class CollaborationRoom {
  private readonly state: DurableObjectStateLike;
  private readonly doc: Y.Doc;
  private readonly awareness: awarenessProtocol.Awareness;
  private readonly sockets: Set<WebSocket>;
  private readonly socketClients: Map<WebSocket, Set<number>>;

  constructor(state: DurableObjectStateLike, _env: unknown) {
    void _env;
    this.state = state;
    this.doc = new Y.Doc();
    this.awareness = new awarenessProtocol.Awareness(this.doc);
    this.sockets = new Set();
    this.socketClients = new Map();

    this.state.blockConcurrencyWhile(async () => {
      const storedUpdate = await this.state.storage.get<ArrayBuffer>("ydoc-state");

      if (storedUpdate) {
        Y.applyUpdate(this.doc, new Uint8Array(storedUpdate));
      }
    });

    this.doc.on("update", (update, origin) => {
      const snapshot = Y.encodeStateAsUpdate(this.doc);
      const persisted = snapshot.buffer.slice(
        snapshot.byteOffset,
        snapshot.byteOffset + snapshot.byteLength
      );

      this.state.waitUntil(this.state.storage.put("ydoc-state", persisted));

      const messageEncoder = encoding.createEncoder();
      encoding.writeVarUint(messageEncoder, MESSAGE_SYNC);
      syncProtocol.writeUpdate(messageEncoder, update);
      const message = encoding.toUint8Array(messageEncoder);

      for (const socket of this.sockets) {
        if (socket !== origin && socket.readyState === WebSocket.OPEN) {
          socket.send(message);
        }
      }
    });

    this.awareness.on(
      "update",
      (
        {
          added,
          updated,
          removed,
        }: {
          added: number[];
          updated: number[];
          removed: number[];
        },
        origin: unknown
      ) => {
        const changedClients = added.concat(updated, removed);
        const update = awarenessProtocol.encodeAwarenessUpdate(
          this.awareness,
          changedClients
        );
        const messageEncoder = encoding.createEncoder();
        encoding.writeVarUint(messageEncoder, MESSAGE_AWARENESS);
        encoding.writeVarUint8Array(messageEncoder, update);
        const message = encoding.toUint8Array(messageEncoder);

        for (const socket of this.sockets) {
          if (socket !== origin && socket.readyState === WebSocket.OPEN) {
            socket.send(message);
          }
        }
      }
    );
  }

  private sendInitialAwareness(socket: WebSocket) {
    const awarenessStates = Array.from(this.awareness.getStates().keys());

    if (awarenessStates.length === 0) {
      return;
    }

    const awarenessEncoder = encoding.createEncoder();
    encoding.writeVarUint(awarenessEncoder, MESSAGE_AWARENESS);
    encoding.writeVarUint8Array(
      awarenessEncoder,
      awarenessProtocol.encodeAwarenessUpdate(this.awareness, awarenessStates)
    );
    socket.send(encoding.toUint8Array(awarenessEncoder));
  }

  private trackSocketAwareness(socket: WebSocket, update: Uint8Array) {
    const decoder = decoding.createDecoder(update);
    const size = decoding.readVarUint(decoder);
    const trackedClientIds = this.socketClients.get(socket) ?? new Set<number>();

    for (let index = 0; index < size; index += 1) {
      trackedClientIds.add(decoding.readVarUint(decoder));
      decoding.readVarUint(decoder);
      decoding.readVarString(decoder);
    }

    this.socketClients.set(socket, trackedClientIds);
  }

  private async handleSocketMessage(
    socket: WebSocket,
    payload: WebSocketMessagePayload
  ) {
    const message = await toUint8Array(payload);

    if (message.length === 0) {
      return;
    }

    const decoder = decoding.createDecoder(message);
    const messageType = decoding.readVarUint(decoder);

    switch (messageType) {
      case MESSAGE_SYNC: {
        const messageEncoder = encoding.createEncoder();
        encoding.writeVarUint(messageEncoder, MESSAGE_SYNC);
        const syncMessageType = syncProtocol.readSyncMessage(
          decoder,
          messageEncoder,
          this.doc,
          socket
        );
        const reply = encoding.toUint8Array(messageEncoder);

        if (reply.length > 1 && socket.readyState === WebSocket.OPEN) {
          socket.send(reply);
        }

        if (
          syncMessageType === syncProtocol.messageYjsSyncStep1 &&
          socket.readyState === WebSocket.OPEN
        ) {
          const syncStep1Encoder = encoding.createEncoder();
          encoding.writeVarUint(syncStep1Encoder, MESSAGE_SYNC);
          syncProtocol.writeSyncStep1(syncStep1Encoder, this.doc);
          socket.send(encoding.toUint8Array(syncStep1Encoder));
        }
        break;
      }
      case MESSAGE_AWARENESS: {
        const update = decoding.readVarUint8Array(decoder);
        this.trackSocketAwareness(socket, update);
        awarenessProtocol.applyAwarenessUpdate(this.awareness, update, socket);
        break;
      }
      case MESSAGE_QUERY_AWARENESS: {
        const awarenessStates = Array.from(this.awareness.getStates().keys());

        if (awarenessStates.length === 0) {
          break;
        }

        const messageEncoder = encoding.createEncoder();
        encoding.writeVarUint(messageEncoder, MESSAGE_AWARENESS);
        encoding.writeVarUint8Array(
          messageEncoder,
          awarenessProtocol.encodeAwarenessUpdate(this.awareness, awarenessStates)
        );
        socket.send(encoding.toUint8Array(messageEncoder));
        break;
      }
      default:
        break;
    }
  }

  async fetch(request: Request) {
    if (request.headers.get("upgrade")?.toLowerCase() !== "websocket") {
      return new Response("Expected websocket upgrade", { status: 426 });
    }

    const webSocketPair = new WebSocketPair();
    const client = webSocketPair[0];
    const server = webSocketPair[1] as WebSocket & { accept: () => void };
    server.accept();
    this.sockets.add(server);
    this.socketClients.set(server, new Set());
    this.sendInitialAwareness(server);

    server.addEventListener("message", (event) => {
      void (async () => {
        try {
          await this.handleSocketMessage(
            server,
            event.data as WebSocketMessagePayload
          );
        } catch {
          if (server.readyState === WebSocket.OPEN) {
            server.close(1011, "Invalid collaboration message.");
          }
        }
      })();
    });

    server.addEventListener("close", () => {
      this.sockets.delete(server);
      const awarenessClientIds = Array.from(this.socketClients.get(server) ?? []);
      this.socketClients.delete(server);

      if (awarenessClientIds.length > 0) {
        awarenessProtocol.removeAwarenessStates(
          this.awareness,
          awarenessClientIds,
          server
        );
      }
    });

    return new Response(null, {
      status: 101,
      webSocket: client,
    } as ResponseInit & { webSocket: WebSocket });
  }
}
