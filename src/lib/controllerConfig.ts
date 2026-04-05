import type {
  ControllerState,
  DisturbanceConfig,
  PidConfig,
} from "../types/simulator";

export const PUSH_DELAY_MS = 150;
const PID_RANGE_STEPS = [1000, 100000, 10000000, 132000000] as const;
export const PID_RANGE_CAP = PID_RANGE_STEPS[PID_RANGE_STEPS.length - 1];

export const controllerDefaults: ControllerState = {
  kp: 0.5,
  ki: 0,
  kd: 2,
  ref: 0,
  delay: 0,
  jitter: 0,
};

export type ParamKey = keyof ControllerState;
export type PidKey = "kp" | "ki" | "kd";

export interface ParameterMeta {
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  precision: number;
  tone: "primary" | "secondary";
}

export const pidKeys: PidKey[] = ["kp", "ki", "kd"];

export const pidMeta: Record<PidKey, Omit<ParameterMeta, "min" | "max">> = {
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

export const disturbanceMeta: Record<keyof DisturbanceConfig, ParameterMeta> = {
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

export function roundValue(value: number, precision: number) {
  return Number(value.toFixed(precision));
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function isSamePid(previous: PidConfig, next: PidConfig) {
  return (
    previous.kp === next.kp &&
    previous.ki === next.ki &&
    previous.kd === next.kd
  );
}

export function isSameDisturbance(
  previous: DisturbanceConfig,
  next: DisturbanceConfig,
) {
  return (
    previous.ref === next.ref &&
    previous.delay === next.delay &&
    previous.jitter === next.jitter
  );
}

export function getPidRange(value: number) {
  return (
    PID_RANGE_STEPS.find((rangeStep) => value <= rangeStep) ?? PID_RANGE_CAP
  );
}

export function getNextPidRange(currentRange: number) {
  return (
    PID_RANGE_STEPS.find((rangeStep) => rangeStep > currentRange) ??
    PID_RANGE_CAP
  );
}

export function getPidRanges(controller: ControllerState): Record<PidKey, number> {
  return {
    kp: getPidRange(controller.kp),
    ki: getPidRange(controller.ki),
    kd: getPidRange(controller.kd),
  };
}
