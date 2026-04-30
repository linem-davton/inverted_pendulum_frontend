import { useCallback, useEffect, useRef, useState } from "react";
import { createSimulatorClient } from "../lib/simulatorApi";
import type {
  LogEntry,
  ServerTarget,
  SimData,
  SimulationSample,
  SimulationSnapshot,
  SimulationStatus,
} from "../types/simulator";

const MAX_LOG_POINTS = 1200;

const INITIAL_SIM_DATA: SimData = {
  time: 0,
  cartPosition: 0,
  pendulumAngle: 0,
};

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

function toLogEntry(sample: SimulationSample, normalizedTime: number): LogEntry {
  return {
    time: normalizedTime,
    x: sample.x,
    theta: sample.theta,
    force: sample.force,
    theta_dot_dot: sample.theta_dot_dot,
    ref: sample.ref ?? 0,
  };
}

function toSimData(sample: SimulationSample, normalizedTime: number): SimData {
  return {
    time: normalizedTime,
    cartPosition: sample.x,
    pendulumAngle: sample.theta,
  };
}

export function useSimulationRuntime({
  server,
  onActionError,
}: {
  server: ServerTarget;
  onActionError?: (error: unknown) => void;
}) {
  const [simData, setSimData] = useState<SimData>(INITIAL_SIM_DATA);
  const [logData, setLogData] = useState<LogEntry[]>([]);
  const [paused, setPaused] = useState(true);
  const [started, setStarted] = useState(false);

  const mountedRef = useRef(true);
  const clientRef = useRef(createSimulatorClient(server));
  const startedRef = useRef(started);
  const pausedRef = useRef(paused);
  const timeOriginRef = useRef<number | null>(null);

  const applyStatus = useCallback((status: SimulationStatus) => {
    startedRef.current = status.start;
    pausedRef.current = status.pause;

    setStarted((previousStarted) => {
      return previousStarted === status.start ? previousStarted : status.start;
    });
    setPaused((previousPaused) => {
      return previousPaused === status.pause ? previousPaused : status.pause;
    });
  }, []);

  const applySample = useCallback(
    (sample: SimulationSample, resetLog = false) => {
      if (resetLog || timeOriginRef.current === null) {
        timeOriginRef.current = sample.time;
      }

      const normalizedTime = Math.max(sample.time - timeOriginRef.current, 0);
      const nextSimData = toSimData(sample, normalizedTime);
      const nextLogEntry = toLogEntry(sample, normalizedTime);

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
    },
    [],
  );

  const applySnapshot = useCallback(
    (snapshot: SimulationSnapshot, resetLog = false) => {
      applyStatus(snapshot.status);
      applySample(snapshot.sample, resetLog || snapshot.event === "reset");
    },
    [applySample, applyStatus],
  );

  useEffect(() => {
    const client = createSimulatorClient(server);
    clientRef.current = client;
    timeOriginRef.current = null;
    setSimData(INITIAL_SIM_DATA);
    setLogData([]);
    applyStatus({ start: false, pause: true });

    const unsubscribe = client.subscribe((snapshot) => {
      if (!mountedRef.current) {
        return;
      }

      applySnapshot(snapshot);
    });

    return () => {
      unsubscribe();
    };
  }, [applySnapshot, applyStatus, server]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const startSimulation = async () => {
    try {
      await clientRef.current.toggleStartStop();
    } catch (error) {
      console.error("Failed to start simulation:", error);
      onActionError?.(error);
    }
  };

  const toggleSimulation = async () => {
    try {
      await clientRef.current.toggleStartStop();
    } catch (error) {
      console.error("Failed to toggle simulation:", error);
      onActionError?.(error);
    }
  };

  const restartSimulation = async () => {
    try {
      await clientRef.current.reset();
    } catch (error) {
      console.error("Failed to restart simulation:", error);
      onActionError?.(error);
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
