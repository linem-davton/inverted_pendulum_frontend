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

const SUBSCRIPTION_RECONNECT_MS = 1000;

type SnapshotListener = (snapshot: SimulationSnapshot) => void;

type ClientCommand =
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

function toSnapshot(message: ServerMessage) {
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
  private reconnectTimeoutId: number | null = null;
  private socket: WebSocket | null = null;

  constructor(private readonly server: ServerTarget) {}

  subscribe(listener: SnapshotListener) {
    this.listeners.add(listener);
    this.openForSubscriptions();

    return () => {
      this.listeners.delete(listener);

      if (this.listeners.size === 0) {
        this.clearReconnectTimer();
      }
    };
  }

  async setPid(pid: PidConfig, signal?: AbortSignal) {
    await this.sendCommand({ type: "setPid", pid }, signal);
  }

  async setParams(params: DisturbanceConfig, signal?: AbortSignal) {
    await this.sendCommand({ type: "setParams", params }, signal);
  }

  async reset(signal?: AbortSignal) {
    await this.sendCommand({ type: "reset" }, signal);
  }

  async toggleStartStop(signal?: AbortSignal) {
    await this.sendCommand({ type: "toggleStartStop" }, signal);
  }

  private async sendCommand(command: ClientCommand, signal?: AbortSignal) {
    if (signal?.aborted) {
      throw createAbortError();
    }

    const socket = await this.ensureSocket();

    if (signal?.aborted) {
      throw createAbortError();
    }

    socket.send(JSON.stringify(command));
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
        this.clearReconnectTimer();
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
      this.scheduleReconnect();
    });

    return this.connectionPromise;
  }

  private openForSubscriptions() {
    void this.ensureSocket().catch((error) => {
      console.error("Failed to connect to simulator WebSocket:", error);
      this.scheduleReconnect();
    });
  }

  private scheduleReconnect() {
    if (this.listeners.size === 0 || this.reconnectTimeoutId !== null) {
      return;
    }

    this.reconnectTimeoutId = window.setTimeout(() => {
      this.reconnectTimeoutId = null;
      this.openForSubscriptions();
    }, SUBSCRIPTION_RECONNECT_MS);
  }

  private clearReconnectTimer() {
    if (this.reconnectTimeoutId === null) {
      return;
    }

    window.clearTimeout(this.reconnectTimeoutId);
    this.reconnectTimeoutId = null;
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
      this.emitSnapshot(toSnapshot(message));
      return;
    }

    if (message.type === "error") {
      console.error(message.message ?? "Simulator WebSocket error");
    }
  }

  private emitSnapshot(snapshot: SimulationSnapshot) {
    this.listeners.forEach((listener) => {
      listener(snapshot);
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
