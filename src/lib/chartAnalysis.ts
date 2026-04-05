import type { LogEntry, SimData } from "../types/simulator";

export interface ResponsePoint extends LogEntry {
  displayTime: number;
  error: number;
  absError: number;
}

export interface ResponseMetric {
  chartTime: number;
  elapsedTime: number;
}

export interface OvershootMetric extends ResponseMetric {
  error: number;
  percent: number;
}

export interface ResponseAnalysis {
  data: ResponsePoint[];
  riseTime?: ResponseMetric;
  settlingTime?: ResponseMetric;
  overshoot?: OvershootMetric;
  settlingBand?: number;
}

const REF_CHANGE_THRESHOLD = 1e-6;
const SETTLING_THRESHOLD_RATIO = 0.02;
const MIN_SETTLING_BAND = 0.01;
const SINGLE_POINT_TIME_PADDING = 1;

export function createFallbackLogEntry(fallbackState: SimData): LogEntry {
  return {
    time: fallbackState.time,
    x: fallbackState.cartPosition,
    theta: fallbackState.pendulumAngle,
    force: 0,
    theta_dot_dot: 0,
    ref: 0,
  };
}

export function getTimeDomain<T>(
  data: T[],
  getValue: (entry: T) => number,
): [number, number] {
  const firstValue = Math.max(data[0] ? getValue(data[0]) : 0, 0);
  const lastValue = Math.max(
    data[data.length - 1] ? getValue(data[data.length - 1]) : firstValue,
    firstValue,
  );

  if (firstValue === lastValue) {
    return [firstValue, lastValue + SINGLE_POINT_TIME_PADDING];
  }

  return [firstValue, lastValue];
}

/**
 * Analyze the latest commanded reference step using the error signal.
 *
 * Definitions used by the UI:
 * - Rise time: time for |error| to fall from 90% to 10% of the initial step error.
 * - Settling time: first time after the step where |error| enters and stays within
 *   a +-2% band of the initial step error magnitude.
 */
export function analyzeResponse(logData: LogEntry[]): ResponseAnalysis | null {
  if (logData.length === 0) {
    return null;
  }

  let stepStartIndex = 0;

  for (let index = 1; index < logData.length; index += 1) {
    if (Math.abs(logData[index].ref - logData[index - 1].ref) > REF_CHANGE_THRESHOLD) {
      stepStartIndex = index;
    }
  }

  const responseWindow = logData.slice(stepStartIndex);

  if (responseWindow.length === 0) {
    return null;
  }

  const targetRef = responseWindow[responseWindow.length - 1].ref;
  const analysisStartTime = responseWindow[0].time;
  const data = responseWindow.map((entry) => {
    const error = targetRef - entry.theta;

    return {
      ...entry,
      displayTime: Math.max(entry.time - analysisStartTime, 0),
      error,
      absError: Math.abs(error),
    };
  });
  const initialErrorMagnitude = data[0].absError;

  if (initialErrorMagnitude < REF_CHANGE_THRESHOLD) {
    return {
      data,
    };
  }

  const riseStartThreshold = initialErrorMagnitude * 0.9;
  const riseEndThreshold = initialErrorMagnitude * 0.1;
  const settlingBand = Math.max(
    initialErrorMagnitude * SETTLING_THRESHOLD_RATIO,
    MIN_SETTLING_BAND,
  );
  const initialDirection =
    Math.sign(data[0].error) ||
    Math.sign(data.find((point) => point.error !== 0)?.error ?? 0);

  const riseStartPoint =
    data.find((point) => point.absError <= riseStartThreshold) ?? data[0];
  const riseEndPoint = data.find((point) => point.absError <= riseEndThreshold);

  let settlingPoint: ResponsePoint | undefined;

  for (let index = 0; index < data.length; index += 1) {
    if (data.slice(index).every((point) => point.absError <= settlingBand)) {
      settlingPoint = data[index];
      break;
    }
  }

  let overshootPoint: ResponsePoint | undefined;

  if (initialDirection !== 0) {
    const candidatePoints = data.filter(
      (point) => initialDirection * point.error < 0,
    );

    overshootPoint = candidatePoints.reduce<ResponsePoint | undefined>(
      (largestPoint, point) => {
        if (!largestPoint) {
          return point;
        }

        return Math.abs(point.error) > Math.abs(largestPoint.error)
          ? point
          : largestPoint;
      },
      undefined,
    );
  }

  return {
    data,
    riseTime: riseEndPoint
      ? {
          chartTime: riseEndPoint.displayTime,
          elapsedTime: Math.max(riseEndPoint.time - riseStartPoint.time, 0),
        }
      : undefined,
    settlingBand,
    settlingTime: settlingPoint
      ? {
          chartTime: settlingPoint.displayTime,
          elapsedTime: settlingPoint.displayTime,
        }
      : undefined,
    overshoot:
      overshootPoint && initialErrorMagnitude > 0
        ? {
            chartTime: overshootPoint.displayTime,
            elapsedTime: overshootPoint.displayTime,
            error: overshootPoint.error,
            percent: (Math.abs(overshootPoint.error) / initialErrorMagnitude) * 100,
          }
        : undefined,
  };
}
