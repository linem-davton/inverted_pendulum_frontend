import { useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import Button from "@mui/material/Button";
import Slider from "@mui/material/Slider";
import TextField from "@mui/material/TextField";
import { createSimulatorClient } from "../lib/simulatorApi";
import type {
  ControllerState,
  DisturbanceConfig,
  PidConfig,
  ServerTarget,
} from "../types/simulator";

const PUSH_DELAY_MS = 150;
const BASE_PID_RANGE = 10;

const defaults: ControllerState = {
  kp: 0.5,
  ki: 0,
  kd: 2,
  ref: 0,
  delay: 0,
  jitter: 0,
};

type ParamKey = keyof ControllerState;
type PidKey = "kp" | "ki" | "kd";

interface ParameterMeta {
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  precision: number;
  tone: "primary" | "secondary";
}

const pidKeys: PidKey[] = ["kp", "ki", "kd"];

const pidMeta: Record<PidKey, Omit<ParameterMeta, "min" | "max">> = {
  kp: {
    label: "Kp",
    unit: "",
    step: 0.01,
    precision: 2,
    tone: "secondary",
  },
  ki: {
    label: "Ki",
    unit: "",
    step: 0.01,
    precision: 2,
    tone: "secondary",
  },
  kd: {
    label: "Kd",
    unit: "",
    step: 0.01,
    precision: 2,
    tone: "secondary",
  },
};

const disturbanceMeta: Record<
  keyof DisturbanceConfig,
  ParameterMeta
> = {
  ref: {
    label: "Reference",
    unit: "rad",
    min: -3.14,
    max: 3.14,
    step: 0.01,
    precision: 2,
    tone: "primary",
  },
  delay: {
    label: "Delay",
    unit: "us",
    min: 0,
    max: 10000,
    step: 10,
    precision: 0,
    tone: "secondary",
  },
  jitter: {
    label: "Jitter",
    unit: "us",
    min: 0,
    max: 5000,
    step: 10,
    precision: 0,
    tone: "secondary",
  },
};

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

function roundValue(value: number, precision: number) {
  return Number(value.toFixed(precision));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatValue(value: number, precision: number) {
  return value.toFixed(precision);
}

function pickPid(controller: ControllerState): PidConfig {
  return {
    kp: controller.kp,
    ki: controller.ki,
    kd: controller.kd,
  };
}

function pickDisturbance(controller: ControllerState): DisturbanceConfig {
  return {
    ref: controller.ref,
    delay: controller.delay,
    jitter: controller.jitter,
  };
}

function isSamePid(previous: PidConfig, next: PidConfig) {
  return (
    previous.kp === next.kp &&
    previous.ki === next.ki &&
    previous.kd === next.kd
  );
}

function isSameDisturbance(
  previous: DisturbanceConfig,
  next: DisturbanceConfig,
) {
  return (
    previous.ref === next.ref &&
    previous.delay === next.delay &&
    previous.jitter === next.jitter
  );
}

function getPidRange(value: number) {
  return Math.max(BASE_PID_RANGE, roundValue(Math.max(value, 2) * 5, 2));
}

function getPidRanges(controller: ControllerState): Record<PidKey, number> {
  return {
    kp: getPidRange(controller.kp),
    ki: getPidRange(controller.ki),
    kd: getPidRange(controller.kd),
  };
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

function ControllerSliders({ server }: { server: ServerTarget }) {
  const [controller, setController] = useState<ControllerState>(defaults);
  const [pidRanges, setPidRanges] = useState<Record<PidKey, number>>(
    getPidRanges(defaults),
  );

  const clientRef = useRef(createSimulatorClient(server));
  const hydratedRef = useRef(false);
  const pidTimerRef = useRef<number | null>(null);
  const disturbanceTimerRef = useRef<number | null>(null);
  const pidRequestRef = useRef<AbortController | null>(null);
  const disturbanceRequestRef = useRef<AbortController | null>(null);
  const hydrateRequestRef = useRef<AbortController | null>(null);
  const lastSubmittedPidRef = useRef<PidConfig>(pickPid(defaults));
  const lastSubmittedDisturbanceRef = useRef<DisturbanceConfig>(
    pickDisturbance(defaults),
  );

  const updatePidRange = (key: PidKey, value: number) => {
    setPidRanges((previousRanges) => {
      const currentMax = previousRanges[key];
      let nextMax = currentMax;

      if (value >= currentMax * 0.95) {
        nextMax = getPidRange(value);
      } else if (currentMax > BASE_PID_RANGE && value <= currentMax * 0.2) {
        nextMax = getPidRange(value);
      }

      if (nextMax === currentMax) {
        return previousRanges;
      }

      return {
        ...previousRanges,
        [key]: nextMax,
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
        Math.max(rawValue, 0),
        pidMeta[pidKey].precision,
      );

      updatePidRange(pidKey, nextValue);
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

        if (
          pidResult.status === "rejected" &&
          isAbortError(pidResult.reason)
        ) {
          return;
        }

        if (
          disturbanceResult.status === "rejected" &&
          isAbortError(disturbanceResult.reason)
        ) {
          return;
        }

        const nextPid =
          pidResult.status === "fulfilled" ? pidResult.value : pickPid(defaults);
        const nextDisturbance =
          disturbanceResult.status === "fulfilled"
            ? disturbanceResult.value
            : pickDisturbance(defaults);
        const nextController = {
          ...defaults,
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
        lastSubmittedPidRef.current = pickPid(nextController);
        lastSubmittedDisturbanceRef.current = pickDisturbance(nextController);
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

    const nextPid = pickPid(controller);

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

    const nextDisturbance = pickDisturbance(controller);

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
      kp: defaults.kp,
      ki: defaults.ki,
      kd: defaults.kd,
    }));
    setPidRanges(getPidRanges(defaults));
  };

  const resetDisturbance = () => {
    setController((previousController) => ({
      ...previousController,
      ref: defaults.ref,
      delay: defaults.delay,
      jitter: defaults.jitter,
    }));
  };

  const renderParameterCard = (key: ParamKey, meta: ParameterMeta) => {
    const value = controller[key];

    return (
      <article className={`parameterCard parameterCard--${meta.tone}`} key={key}>
        <div className="parameterHeader">
          <div className="parameterLabelRow">
            <span
              className={`parameterIcon parameterIcon--${String(key)}`}
              aria-hidden="true"
            />
            <span className="parameterLabel">{meta.label}</span>
          </div>
          <div className="parameterReadout">
            <strong className="parameterValue">
              {formatValue(value, meta.precision)}
            </strong>
            {meta.unit ? <span className="parameterUnit">{meta.unit}</span> : null}
          </div>
        </div>

        <div className="parameterBounds">
          <span>min {formatValue(meta.min, meta.precision)}</span>
          <span>max {formatValue(meta.max, meta.precision)}</span>
        </div>

        <div className="parameterControlRow">
          <Slider
            value={value}
            min={meta.min}
            max={meta.max}
            step={meta.step}
            color={meta.tone === "primary" ? "primary" : "secondary"}
            onChange={(_event, newValue) => {
              if (typeof newValue === "number") {
                updateParameter(key, newValue);
              }
            }}
          />
          <TextField
            size="small"
            type="number"
            value={value}
            onChange={(event) => {
              const input = event.target.value;

              if (input === "") {
                updateParameter(key, meta.min < 0 ? 0 : meta.min);
                return;
              }

              updateParameter(key, Number(input));
            }}
            inputProps={{
              step: meta.step,
              min: meta.min,
              max: meta.max,
              inputMode: "decimal",
            }}
          />
        </div>
      </article>
    );
  };

  return (
    <div className="controlGroups">
      <section className="controlGroup controlGroup--pid">
        <div className="controlGroupHeader">
          <div className="controlGroupHeading">
            <span className="controlIcon controlIcon--pid" aria-hidden="true" />
            <div>
              <span className="eyebrow">PID</span>
              <h3 className="controlGroupTitle">Gains</h3>
            </div>
          </div>

          <div className="groupMeta">
            <span className="stageBadge">/pid</span>
          </div>
        </div>

        <div className="parameterGrid">
          {pidKeys.map((key) =>
            renderParameterCard(key, {
              ...pidMeta[key],
              min: 0,
              max: pidRanges[key],
            }),
          )}
        </div>

        <div className="groupActionRow">
          <Button variant="outlined" size="large" onClick={resetPid}>
            Reset
          </Button>
        </div>
      </section>

      <section className="controlGroup controlGroup--disturbance">
        <div className="controlGroupHeader">
          <div className="controlGroupHeading">
            <span
              className="controlIcon controlIcon--disturbance"
              aria-hidden="true"
            />
            <div>
              <span className="eyebrow">Scenario</span>
              <h3 className="controlGroupTitle">Ref + Timing</h3>
            </div>
          </div>

          <div className="groupMeta">
            <span className="stageBadge">/params</span>
          </div>
        </div>

        <div className="parameterGrid">
          {(
            Object.keys(disturbanceMeta) as Array<keyof typeof disturbanceMeta>
          ).map((key) => renderParameterCard(key, disturbanceMeta[key]))}
        </div>

        <div className="groupActionRow">
          <Button variant="outlined" size="large" onClick={resetDisturbance}>
            Reset
          </Button>
        </div>
      </section>
    </div>
  );
}

export default ControllerSliders;
