import { useCallback, useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import { createSimulatorClient } from "../lib/simulatorApi";
import {
  PUSH_DELAY_MS,
  clamp,
  controllerDefaults,
  disturbanceMeta,
  getPidRanges,
  isSameDisturbance,
  isSamePid,
  pidMeta,
  roundValue,
  type ParamKey,
  type PidKey,
} from "../lib/controllerConfig";
import type {
  ControllerState,
  DisturbanceConfig,
  PidConfig,
  ServerTarget,
  SimulationSnapshot,
} from "../types/simulator";

const CONTROL_SYNC_INTERVAL_MS = 750;

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

function clearTimer(timerRef: MutableRefObject<number | null>) {
  if (timerRef.current !== null) {
    window.clearTimeout(timerRef.current);
    timerRef.current = null;
  }
}

function abortRequest(
  requestRef: MutableRefObject<AbortController | null>,
) {
  requestRef.current?.abort();
  requestRef.current = null;
}

export function useControllerConfig({ server }: { server: ServerTarget }) {
  const [controller, setController] = useState<ControllerState>(
    controllerDefaults,
  );
  const [pidRanges, setPidRanges] = useState<Record<PidKey, number>>(
    getPidRanges(controllerDefaults),
  );

  const clientRef = useRef(createSimulatorClient(server));
  const hydratedRef = useRef(false);
  const pidTimerRef = useRef<number | null>(null);
  const disturbanceTimerRef = useRef<number | null>(null);
  const pidRequestRef = useRef<AbortController | null>(null);
  const disturbanceRequestRef = useRef<AbortController | null>(null);
  const hydrateRequestRef = useRef<AbortController | null>(null);
  const syncRequestRef = useRef<AbortController | null>(null);
  const syncTimerRef = useRef<number | null>(null);
  const lastSubmittedPidRef = useRef<PidConfig>({
    kp: controllerDefaults.kp,
    ki: controllerDefaults.ki,
    kd: controllerDefaults.kd,
  });
  const lastSubmittedDisturbanceRef = useRef<DisturbanceConfig>({
    ref: controllerDefaults.ref,
    delay: controllerDefaults.delay,
    jitter: controllerDefaults.jitter,
  });

  const hasPendingLocalUpdate = useCallback(() => {
    return Boolean(
      pidTimerRef.current !== null ||
        disturbanceTimerRef.current !== null ||
        pidRequestRef.current !== null ||
        disturbanceRequestRef.current !== null,
    );
  }, []);

  const applyRemoteSnapshot = useCallback(
    (
      snapshot: SimulationSnapshot,
      { force = false }: { force?: boolean } = {},
    ) => {
      if (!force && hasPendingLocalUpdate()) {
        return;
      }

      const nextPid = snapshot.pid;
      const nextDisturbance = snapshot.params;
      const nextController: ControllerState = {
        ...controllerDefaults,
        ...nextPid,
        ...nextDisturbance,
      };

      setController((previousController) => {
        const previousPid: PidConfig = {
          kp: previousController.kp,
          ki: previousController.ki,
          kd: previousController.kd,
        };
        const previousDisturbance: DisturbanceConfig = {
          ref: previousController.ref,
          delay: previousController.delay,
          jitter: previousController.jitter,
        };

        if (
          isSamePid(previousPid, nextPid) &&
          isSameDisturbance(previousDisturbance, nextDisturbance)
        ) {
          return previousController;
        }

        return nextController;
      });

      setPidRanges((previousRanges) => {
        const nextRanges = getPidRanges(nextController);

        if (
          previousRanges.kp === nextRanges.kp &&
          previousRanges.ki === nextRanges.ki &&
          previousRanges.kd === nextRanges.kd
        ) {
          return previousRanges;
        }

        return nextRanges;
      });

      lastSubmittedPidRef.current = nextPid;
      lastSubmittedDisturbanceRef.current = nextDisturbance;
      hydratedRef.current = true;
    },
    [hasPendingLocalUpdate],
  );

  const increasePidRange = (key: PidKey, nextRange: number) => {
    setPidRanges((previousRanges) => {
      if (previousRanges[key] === nextRange) {
        return previousRanges;
      }

      return {
        ...previousRanges,
        [key]: nextRange,
      };
    });
  };

  const updateParameter = (key: ParamKey, rawValue: number) => {
    if (Number.isNaN(rawValue)) {
      return;
    }

    if (key in pidMeta) {
      const pidKey = key as PidKey;
      const nextValue = roundValue(
        clamp(rawValue, 0, pidRanges[pidKey]),
        pidMeta[pidKey].precision,
      );

      setController((previousController) => ({
        ...previousController,
        [pidKey]: nextValue,
      }));
      return;
    }

    const meta = disturbanceMeta[key as keyof DisturbanceConfig];
    const nextValue = roundValue(
      clamp(rawValue, meta.min, meta.max),
      meta.precision,
    );

    setController((previousController) => ({
      ...previousController,
      [key]: nextValue,
    }));
  };

  useEffect(() => {
    clientRef.current = createSimulatorClient(server);
    hydratedRef.current = false;
    let isCurrent = true;

    clearTimer(pidTimerRef);
    clearTimer(disturbanceTimerRef);
    clearTimer(syncTimerRef);
    abortRequest(pidRequestRef);
    abortRequest(disturbanceRequestRef);
    abortRequest(hydrateRequestRef);
    abortRequest(syncRequestRef);

    const unsubscribe = clientRef.current.subscribe((snapshot) => {
      if (!isCurrent) {
        return;
      }

      applyRemoteSnapshot(snapshot);
    });

    const controllerAbort = new AbortController();
    hydrateRequestRef.current = controllerAbort;

    const hydrateControls = async () => {
      try {
        const snapshot = await clientRef.current.getSnapshot(
          controllerAbort.signal,
        );

        if (controllerAbort.signal.aborted) {
          return;
        }

        applyRemoteSnapshot(snapshot, { force: true });
      } catch (error) {
        if (!isAbortError(error)) {
          console.warn("Falling back to default controller values:", error);
        }
      } finally {
        if (hydrateRequestRef.current === controllerAbort) {
          hydrateRequestRef.current = null;
        }
        if (isCurrent) {
          hydratedRef.current = true;
        }
      }
    };

    void hydrateControls();

    syncTimerRef.current = window.setInterval(() => {
      if (
        !hydratedRef.current ||
        hasPendingLocalUpdate() ||
        syncRequestRef.current !== null
      ) {
        return;
      }

      const syncAbort = new AbortController();
      syncRequestRef.current = syncAbort;

      void clientRef.current
        .getSnapshot(syncAbort.signal)
        .catch((error) => {
          if (!isAbortError(error)) {
            console.warn("Failed to refresh controller values:", error);
          }
        })
        .finally(() => {
          if (syncRequestRef.current === syncAbort) {
            syncRequestRef.current = null;
          }
        });
    }, CONTROL_SYNC_INTERVAL_MS);

    return () => {
      isCurrent = false;
      unsubscribe();
      clearTimer(pidTimerRef);
      clearTimer(disturbanceTimerRef);
      clearTimer(syncTimerRef);
      abortRequest(pidRequestRef);
      abortRequest(disturbanceRequestRef);
      abortRequest(hydrateRequestRef);
      abortRequest(syncRequestRef);
    };
  }, [applyRemoteSnapshot, hasPendingLocalUpdate, server]);

  useEffect(() => {
    if (!hydratedRef.current) {
      return;
    }

    const nextPid: PidConfig = {
      kp: controller.kp,
      ki: controller.ki,
      kd: controller.kd,
    };

    if (isSamePid(lastSubmittedPidRef.current, nextPid)) {
      return;
    }

    clearTimer(pidTimerRef);

    pidTimerRef.current = window.setTimeout(() => {
      const controllerAbort = new AbortController();
      abortRequest(pidRequestRef);
      pidRequestRef.current = controllerAbort;

      void clientRef.current
        .setPid(nextPid, controllerAbort.signal)
        .then(() => {
          lastSubmittedPidRef.current = nextPid;
        })
        .catch((error) => {
          if (!isAbortError(error)) {
            console.error("Failed to update PID values:", error);
          }
        })
        .finally(() => {
          if (pidRequestRef.current === controllerAbort) {
            pidRequestRef.current = null;
          }
        });
    }, PUSH_DELAY_MS);

    return () => {
      clearTimer(pidTimerRef);
    };
  }, [controller.kd, controller.ki, controller.kp]);

  useEffect(() => {
    if (!hydratedRef.current) {
      return;
    }

    const nextDisturbance: DisturbanceConfig = {
      ref: controller.ref,
      delay: controller.delay,
      jitter: controller.jitter,
    };

    if (
      isSameDisturbance(lastSubmittedDisturbanceRef.current, nextDisturbance)
    ) {
      return;
    }

    clearTimer(disturbanceTimerRef);

    disturbanceTimerRef.current = window.setTimeout(() => {
      const controllerAbort = new AbortController();
      abortRequest(disturbanceRequestRef);
      disturbanceRequestRef.current = controllerAbort;

      void clientRef.current
        .setParams(nextDisturbance, controllerAbort.signal)
        .then(() => {
          lastSubmittedDisturbanceRef.current = nextDisturbance;
        })
        .catch((error) => {
          if (!isAbortError(error)) {
            console.error("Failed to update disturbance parameters:", error);
          }
        })
        .finally(() => {
          if (disturbanceRequestRef.current === controllerAbort) {
            disturbanceRequestRef.current = null;
          }
        });
    }, PUSH_DELAY_MS);

    return () => {
      clearTimer(disturbanceTimerRef);
    };
  }, [controller.delay, controller.jitter, controller.ref]);

  const resetPid = () => {
    setController((previousController) => ({
      ...previousController,
      kp: controllerDefaults.kp,
      ki: controllerDefaults.ki,
      kd: controllerDefaults.kd,
    }));
    setPidRanges(getPidRanges(controllerDefaults));
  };

  const resetDisturbance = () => {
    setController((previousController) => ({
      ...previousController,
      ref: controllerDefaults.ref,
      delay: controllerDefaults.delay,
      jitter: controllerDefaults.jitter,
    }));
  };

  return {
    controller,
    increasePidRange,
    pidRanges,
    resetDisturbance,
    resetPid,
    updateParameter,
  };
}
