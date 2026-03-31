import config from "../config.json";
import type {
  DisturbanceConfig,
  PidConfig,
  ServerTarget,
  SimulationSample,
  SimulationStatus,
} from "../types/simulator";

const JSON_HEADERS = {
  "Content-Type": "application/json",
} as const;

function buildErrorMessage(response: Response) {
  return `Request failed with ${response.status} ${response.statusText}`;
}

async function requestJson<T>(input: string, init?: RequestInit) {
  const response = await fetch(input, init);

  if (!response.ok) {
    throw new Error(buildErrorMessage(response));
  }

  return (await response.json()) as T;
}

async function requestOk(input: string, init?: RequestInit) {
  const response = await fetch(input, init);

  if (!response.ok) {
    throw new Error(buildErrorMessage(response));
  }
}

export function getServerUrl(server: ServerTarget) {
  return server === "remote" ? config.remoteServer : config.localServer;
}

export function createSimulatorClient(server: ServerTarget) {
  const baseUrl = getServerUrl(server);

  return {
    getStatus(signal?: AbortSignal) {
      return requestJson<SimulationStatus>(`${baseUrl}/status`, { signal });
    },
    getSample(signal?: AbortSignal) {
      return requestJson<SimulationSample>(`${baseUrl}/sim`, { signal });
    },
    getPid(signal?: AbortSignal) {
      return requestJson<PidConfig>(`${baseUrl}/pid`, { signal });
    },
    setPid(pid: PidConfig, signal?: AbortSignal) {
      return requestOk(`${baseUrl}/pid`, {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify(pid),
        signal,
      });
    },
    getParams(signal?: AbortSignal) {
      return requestJson<DisturbanceConfig>(`${baseUrl}/params`, { signal });
    },
    setParams(params: DisturbanceConfig, signal?: AbortSignal) {
      return requestOk(`${baseUrl}/params`, {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify(params),
        signal,
      });
    },
    reset(signal?: AbortSignal) {
      return requestOk(`${baseUrl}/reset`, {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ reset: true }),
        signal,
      });
    },
    toggleStartStop(signal?: AbortSignal) {
      return requestOk(`${baseUrl}/startstop`, {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({}),
        signal,
      });
    },
  };
}
