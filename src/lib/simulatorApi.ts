import config from "../config.json";
import type {
  DisturbanceConfig,
  PidConfig,
  ServerTarget,
  SimulationSample,
  SimulationSnapshot,
  SimulationSnapshotEvent,
  SimulationStatus,
} from "../types/simulator";

const REQUEST_TIMEOUT_MS = 5000;

type SnapshotListener = (snapshot: SimulationSnapshot) => void;

type ClientCommand =
  | { type: "getSnapshot" }
  | { type: "setPid"; pid: PidConfig }
  | { type: "setParams"; params: DisturbanceConfig }
  | { type: "reset" }
  | { type: "toggleStartStop" };

interface ServerMessage {
  event?: SimulationSnapshotEvent;
  id?: string;
  message?: string;
  params?: DisturbanceConfig;
  pid?: PidConfig;
  sample?: SimulationSample;
  status?: SimulationStatus;
  type?: string;
}

type SnapshotMessage = ServerMessage & SimulationSnapshot;

interface PendingRequest {
  abortHandler?: () => void;
  reject: (error: unknown) => void;
  resolve: (value: unknown) => void;
  signal?: AbortSignal;
  timeoutId: number;
  transform: (message: ServerMessage) => unknown;
}

export function getServerUrl(server: ServerTarget) {
  return server === "remote" ? config.remoteServer : config.localServer;
}

function createAbortError() {
  return new DOMException("The operation was aborted.", "AbortError");
}

function getWebSocketUrl(server: ServerTarget) {
  const baseUrl = getServerUrl(server);
  const url = new URL(baseUrl, window.location.href);

  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = `${url.pathname.replace(/\/$/, "")}/ws`;

  return url.toString();
}

function isSnapshotMessage(message: ServerMessage): message is SnapshotMessage {
  return Boolean(message.sample && message.status && message.pid && message.params);
}

function expectSnapshot(message: ServerMessage) {
  if (!isSnapshotMessage(message)) {
    throw new Error("WebSocket response did not include a simulator snapshot");
  }

  return {
    event: message.event,
    sample: message.sample,
    status: message.status,
    pid: message.pid,
    params: message.params,
  };
}

class WebSocketSimulatorClient {
  private connectionPromise: Promise<WebSocket> | null = null;
  private listeners = new Set<SnapshotListener>();
  private pending = new Map<string, PendingRequest>();
  private requestCounter = 0;
  private socket: WebSocket | null = null;

  constructor(private readonly server: ServerTarget) {}

  subscribe(listener: SnapshotListener) {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  getSnapshot(signal?: AbortSignal) {
    return this.sendCommand({ type: "getSnapshot" }, expectSnapshot, signal);
  }

  async getStatus(signal?: AbortSignal) {
    const snapshot = await this.getSnapshot(signal);
    return snapshot.status;
  }

  async getSample(signal?: AbortSignal) {
    const snapshot = await this.getSnapshot(signal);
    return snapshot.sample;
  }

  async getPid(signal?: AbortSignal) {
    const snapshot = await this.getSnapshot(signal);
    return snapshot.pid;
  }

  async setPid(pid: PidConfig, signal?: AbortSignal) {
    await this.sendCommand({ type: "setPid", pid }, expectSnapshot, signal);
  }

  async getParams(signal?: AbortSignal) {
    const snapshot = await this.getSnapshot(signal);
    return snapshot.params;
  }

  async setParams(params: DisturbanceConfig, signal?: AbortSignal) {
    await this.sendCommand({ type: "setParams", params }, expectSnapshot, signal);
  }

  async reset(signal?: AbortSignal) {
    await this.sendCommand({ type: "reset" }, expectSnapshot, signal);
  }

  async toggleStartStop(signal?: AbortSignal) {
    await this.sendCommand({ type: "toggleStartStop" }, expectSnapshot, signal);
  }

  private async sendCommand<T>(
    command: ClientCommand,
    transform: (message: ServerMessage) => T,
    signal?: AbortSignal,
  ) {
    if (signal?.aborted) {
      throw createAbortError();
    }

    const socket = await this.ensureSocket();

    if (signal?.aborted) {
      throw createAbortError();
    }

    return new Promise<T>((resolve, reject) => {
      const id = `${Date.now()}-${this.requestCounter}`;
      this.requestCounter += 1;

      const timeoutId = window.setTimeout(() => {
        this.removePending(id);
        reject(new Error("WebSocket request timed out"));
      }, REQUEST_TIMEOUT_MS);

      const abortSignal = signal;
      const abortHandler = abortSignal
        ? () => {
            this.removePending(id);
            reject(createAbortError());
          }
        : undefined;

      if (abortHandler && abortSignal) {
        abortSignal.addEventListener("abort", abortHandler, { once: true });
      }

      this.pending.set(id, {
        abortHandler,
        reject,
        resolve: (value) => {
          resolve(value as T);
        },
        signal,
        timeoutId,
        transform,
      });

      try {
        socket.send(JSON.stringify({ ...command, id }));
      } catch (error) {
        this.removePending(id);
        reject(error);
      }
    });
  }

  private ensureSocket() {
    if (this.socket?.readyState === WebSocket.OPEN) {
      return Promise.resolve(this.socket);
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    const socket = new WebSocket(getWebSocketUrl(this.server));
    this.socket = socket;

    this.connectionPromise = new Promise<WebSocket>((resolve, reject) => {
      const cleanup = () => {
        socket.removeEventListener("open", handleOpen);
        socket.removeEventListener("error", handleError);
      };
      const handleOpen = () => {
        cleanup();
        this.connectionPromise = null;
        resolve(socket);
      };
      const handleError = () => {
        cleanup();
        this.connectionPromise = null;
        this.socket = null;
        reject(new Error(`Unable to connect to ${getWebSocketUrl(this.server)}`));
      };

      socket.addEventListener("open", handleOpen);
      socket.addEventListener("error", handleError);
    });

    socket.addEventListener("message", (event) => {
      this.handleMessage(event);
    });
    socket.addEventListener("close", () => {
      if (this.socket === socket) {
        this.socket = null;
      }
      this.connectionPromise = null;
      this.rejectPending(new Error("WebSocket connection closed"));
    });

    return this.connectionPromise;
  }

  private handleMessage(event: MessageEvent) {
    let message: ServerMessage;

    try {
      message = JSON.parse(String(event.data)) as ServerMessage;
    } catch (error) {
      console.error("Failed to parse simulator WebSocket message:", error);
      return;
    }

    if (isSnapshotMessage(message)) {
      this.emitSnapshot(expectSnapshot(message));
    }

    if (!message.id) {
      return;
    }

    const pending = this.pending.get(message.id);

    if (!pending) {
      return;
    }

    this.removePending(message.id);

    if (message.type === "error") {
      pending.reject(new Error(message.message ?? "Simulator WebSocket error"));
      return;
    }

    try {
      pending.resolve(pending.transform(message));
    } catch (error) {
      pending.reject(error);
    }
  }

  private emitSnapshot(snapshot: SimulationSnapshot) {
    this.listeners.forEach((listener) => {
      listener(snapshot);
    });
  }

  private removePending(id: string) {
    const pending = this.pending.get(id);

    if (!pending) {
      return;
    }

    window.clearTimeout(pending.timeoutId);

    if (pending.abortHandler && pending.signal) {
      pending.signal.removeEventListener("abort", pending.abortHandler);
    }

    this.pending.delete(id);
  }

  private rejectPending(error: Error) {
    this.pending.forEach((pending, id) => {
      this.removePending(id);
      pending.reject(error);
    });
  }
}

const clients = new Map<ServerTarget, WebSocketSimulatorClient>();

export function createSimulatorClient(server: ServerTarget) {
  const existingClient = clients.get(server);

  if (existingClient) {
    return existingClient;
  }

  const client = new WebSocketSimulatorClient(server);
  clients.set(server, client);
  return client;
}
