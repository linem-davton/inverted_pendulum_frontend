import { useEffect, useRef, useState } from "react";
import { createSimulatorClient } from "../lib/simulatorApi";
import type {
  LogEntry,
  ServerTarget,
  SimData,
  SimulationSample,
  SimulationStatus,
} from "../types/simulator";

const MAX_LOG_POINTS = 1200;

const INITIAL_SIM_DATA: SimData = {
  time: 0,
  cartPosition: 100,
  pendulumAngle: 0.75,
};

interface SyncOptions {
  resetLog?: boolean;
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

function isSameLogEntry(
  previousEntry: LogEntry | undefined,
  nextEntry: LogEntry,
) {
  if (!previousEntry) {
    return false;
  }

  return (
    previousEntry.time === nextEntry.time &&
    previousEntry.x === nextEntry.x &&
    previousEntry.theta === nextEntry.theta &&
    previousEntry.force === nextEntry.force &&
    previousEntry.theta_dot_dot === nextEntry.theta_dot_dot &&
    previousEntry.ref === nextEntry.ref
  );
}

function isSameSimData(previousData: SimData, nextData: SimData) {
  return (
    previousData.time === nextData.time &&
    previousData.cartPosition === nextData.cartPosition &&
    previousData.pendulumAngle === nextData.pendulumAngle
  );
}

function toLogEntry(sample: SimulationSample): LogEntry {
  return {
    time: sample.time,
    x: sample.x,
    theta: sample.theta,
    force: sample.force,
    theta_dot_dot: sample.theta_dot_dot,
    ref: sample.ref ?? 0,
  };
}

function toSimData(sample: SimulationSample): SimData {
  return {
    time: sample.time,
    cartPosition: sample.x,
    pendulumAngle: sample.theta,
  };
}

export function useSimulationRuntime({
  server,
  fetchDuration,
}: {
  server: ServerTarget;
  fetchDuration: number;
}) {
  const [simData, setSimData] = useState<SimData>(INITIAL_SIM_DATA);
  const [logData, setLogData] = useState<LogEntry[]>([]);
  const [paused, setPaused] = useState(true);
  const [started, setStarted] = useState(false);

  const mountedRef = useRef(true);
  const fetchInFlightRef = useRef(false);
  const timeoutRef = useRef<number | null>(null);
  const requestAbortRef = useRef<AbortController | null>(null);
  const clientRef = useRef(createSimulatorClient(server));
  const startedRef = useRef(started);
  const pausedRef = useRef(paused);
  const fetchDurationRef = useRef(fetchDuration);
  const pollOnceRef = useRef<() => Promise<void>>(async () => {});
  const syncRuntimeRef = useRef<(options?: SyncOptions) => Promise<void>>(
    async () => {},
  );

  const clearScheduledPoll = () => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const abortActiveRequest = () => {
    requestAbortRef.current?.abort();
    requestAbortRef.current = null;
    fetchInFlightRef.current = false;
  };

  const scheduleNextPoll = (delay = fetchDurationRef.current) => {
    clearScheduledPoll();

    if (!startedRef.current || pausedRef.current) {
      return;
    }

    timeoutRef.current = window.setTimeout(() => {
      void pollOnceRef.current();
    }, delay);
  };

  const applyStatus = (status: SimulationStatus) => {
    startedRef.current = status.start;
    pausedRef.current = status.pause;

    setStarted((previousStarted) => {
      return previousStarted === status.start ? previousStarted : status.start;
    });
    setPaused((previousPaused) => {
      return previousPaused === status.pause ? previousPaused : status.pause;
    });
  };

  const applySample = (sample: SimulationSample, resetLog = false) => {
    const nextSimData = toSimData(sample);
    const nextLogEntry = toLogEntry(sample);

    setSimData((previousSimData) => {
      return isSameSimData(previousSimData, nextSimData)
        ? previousSimData
        : nextSimData;
    });

    setLogData((previousLogData) => {
      const baseLog = resetLog ? [] : previousLogData;

      if (isSameLogEntry(baseLog[baseLog.length - 1], nextLogEntry)) {
        return baseLog;
      }

      return [...baseLog, nextLogEntry].slice(-MAX_LOG_POINTS);
    });

    if (sample.pause !== pausedRef.current) {
      pausedRef.current = sample.pause;
      setPaused((previousPaused) => {
        return previousPaused === sample.pause ? previousPaused : sample.pause;
      });
    }
  };

  pollOnceRef.current = async () => {
    if (fetchInFlightRef.current) {
      return;
    }

    clearScheduledPoll();
    fetchInFlightRef.current = true;

    const controller = new AbortController();
    requestAbortRef.current = controller;

    try {
      const sample = await clientRef.current.getSample(controller.signal);

      if (!mountedRef.current || controller.signal.aborted) {
        return;
      }

      applySample(sample);

      if (sample.pause) {
        pausedRef.current = true;
        setPaused((previousPaused) => {
          return previousPaused ? previousPaused : true;
        });
        clearScheduledPoll();
        return;
      }

      scheduleNextPoll();
    } catch (error) {
      if (!isAbortError(error)) {
        clearScheduledPoll();
        console.error("Failed to poll simulator state:", error);
      }
    } finally {
      if (requestAbortRef.current === controller) {
        requestAbortRef.current = null;
      }
      fetchInFlightRef.current = false;
    }
  };

  syncRuntimeRef.current = async (options?: SyncOptions) => {
    const resetLog = options?.resetLog ?? false;

    clearScheduledPoll();
    abortActiveRequest();

    const controller = new AbortController();
    requestAbortRef.current = controller;

    try {
      const status = await clientRef.current.getStatus(controller.signal);

      if (!mountedRef.current || controller.signal.aborted) {
        return;
      }

      applyStatus(status);

      const sample = await clientRef.current.getSample(controller.signal);

      if (!mountedRef.current || controller.signal.aborted) {
        return;
      }

      applySample(sample, resetLog);

      if (status.start && !status.pause) {
        scheduleNextPoll(fetchDurationRef.current);
      } else {
        clearScheduledPoll();
      }
    } catch (error) {
      if (!isAbortError(error)) {
        clearScheduledPoll();
        console.error("Failed to synchronize simulator state:", error);
      }
    } finally {
      if (requestAbortRef.current === controller) {
        requestAbortRef.current = null;
      }
    }
  };

  useEffect(() => {
    fetchDurationRef.current = fetchDuration;
    scheduleNextPoll(fetchDuration);
  }, [fetchDuration]);

  useEffect(() => {
    clientRef.current = createSimulatorClient(server);
    clearScheduledPoll();
    abortActiveRequest();
    setSimData(INITIAL_SIM_DATA);
    setLogData([]);
    applyStatus({ start: false, pause: true });
    void syncRuntimeRef.current({ resetLog: true });
  }, [server]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      clearScheduledPoll();
      abortActiveRequest();
    };
  }, []);

  const startSimulation = async () => {
    try {
      await clientRef.current.toggleStartStop();
      await syncRuntimeRef.current();
    } catch (error) {
      console.error("Failed to start simulation:", error);
    }
  };

  const toggleSimulation = async () => {
    try {
      await clientRef.current.toggleStartStop();
      await syncRuntimeRef.current();
    } catch (error) {
      console.error("Failed to toggle simulation:", error);
    }
  };

  const restartSimulation = async () => {
    try {
      await clientRef.current.reset();
      await syncRuntimeRef.current({ resetLog: true });
    } catch (error) {
      console.error("Failed to restart simulation:", error);
    }
  };

  return {
    logData,
    paused,
    restartSimulation,
    simData,
    startSimulation,
    started,
    toggleSimulation,
  };
}
