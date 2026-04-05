import { useEffect, useRef, useState } from "react";
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
} from "../types/simulator";

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
    abortRequest(pidRequestRef);
    abortRequest(disturbanceRequestRef);
    abortRequest(hydrateRequestRef);

    const controllerAbort = new AbortController();
    hydrateRequestRef.current = controllerAbort;

    const hydrateControls = async () => {
      try {
        const [pidResult, disturbanceResult] = await Promise.allSettled([
          clientRef.current.getPid(controllerAbort.signal),
          clientRef.current.getParams(controllerAbort.signal),
        ]);

        if (controllerAbort.signal.aborted) {
          return;
        }

        if (pidResult.status === "rejected" && isAbortError(pidResult.reason)) {
          return;
        }

        if (
          disturbanceResult.status === "rejected" &&
          isAbortError(disturbanceResult.reason)
        ) {
          return;
        }

        const nextPid =
          pidResult.status === "fulfilled"
            ? pidResult.value
            : {
                kp: controllerDefaults.kp,
                ki: controllerDefaults.ki,
                kd: controllerDefaults.kd,
              };
        const nextDisturbance =
          disturbanceResult.status === "fulfilled"
            ? disturbanceResult.value
            : {
                ref: controllerDefaults.ref,
                delay: controllerDefaults.delay,
                jitter: controllerDefaults.jitter,
              };
        const nextController = {
          ...controllerDefaults,
          ...nextPid,
          ...nextDisturbance,
        };

        if (pidResult.status === "rejected") {
          console.warn("Falling back to default PID values:", pidResult.reason);
        }

        if (disturbanceResult.status === "rejected") {
          console.warn(
            "Falling back to default disturbance values:",
            disturbanceResult.reason,
          );
        }

        setController(nextController);
        setPidRanges(getPidRanges(nextController));
        lastSubmittedPidRef.current = nextPid;
        lastSubmittedDisturbanceRef.current = nextDisturbance;
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

    return () => {
      isCurrent = false;
      clearTimer(pidTimerRef);
      clearTimer(disturbanceTimerRef);
      abortRequest(pidRequestRef);
      abortRequest(disturbanceRequestRef);
      abortRequest(hydrateRequestRef);
    };
  }, [server]);

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
