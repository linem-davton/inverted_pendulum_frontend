import { memo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { LogEntry, SimData } from "../types/simulator";

interface ChartsProps {
  fallbackState: SimData;
  logData: LogEntry[];
}

interface ResponsePoint extends LogEntry {
  error: number;
  absError: number;
}

interface ResponseMetric {
  absoluteTime: number;
  elapsedTime: number;
}

interface OvershootMetric extends ResponseMetric {
  error: number;
  percent: number;
}

interface ResponseAnalysis {
  data: ResponsePoint[];
  riseTime?: ResponseMetric;
  settlingTime?: ResponseMetric;
  overshoot?: OvershootMetric;
  settlingBand?: number;
}

const thetaColor = "#ff9a4d";
const forceColor = "#59d3ff";
const errorColor = "#ff6b57";
const axisColor = "#93a7b5";

const REF_CHANGE_THRESHOLD = 1e-6;
// Settling time uses a standard +-2% error band around the commanded step.
const SETTLING_THRESHOLD_RATIO = 0.02;
const MIN_SETTLING_BAND = 0.01;
const MIN_ERROR_AXIS_EXTENT = 0.1;
const ERROR_AXIS_PADDING_RATIO = 0.15;
const SINGLE_POINT_TIME_PADDING = 1;
const highlightedDotProps = {
  r: 4,
  stroke: "#071017",
  strokeWidth: 2,
};

function formatMetric(value: number, digits = 3) {
  return Number.isFinite(value) ? value.toFixed(digits) : "--";
}

function formatSignedMetric(value: number, digits = 3) {
  if (!Number.isFinite(value)) {
    return "--";
  }

  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}`;
}

function formatAxisTick(value: number) {
  const absoluteValue = Math.abs(value);

  if (absoluteValue >= 100) {
    return value.toFixed(0);
  }

  if (absoluteValue >= 10) {
    return value.toFixed(1);
  }

  return value.toFixed(2);
}

function formatCompactSeconds(value: number) {
  return `${formatMetric(value, value < 10 ? 2 : 1)} s`;
}

function createFallbackLogEntry(fallbackState: SimData): LogEntry {
  return {
    time: fallbackState.time,
    x: fallbackState.cartPosition,
    theta: fallbackState.pendulumAngle,
    force: 0,
    theta_dot_dot: 0,
    ref: 0,
  };
}

function getTimeDomain(logData: LogEntry[]): [number, number] {
  const minTime = logData[0]?.time ?? 0;
  const maxTime = logData[logData.length - 1]?.time ?? minTime;

  if (minTime === maxTime) {
    return [
      minTime - SINGLE_POINT_TIME_PADDING,
      maxTime + SINGLE_POINT_TIME_PADDING,
    ];
  }

  return [minTime, maxTime];
}

/**
 * Analyze the latest commanded reference step using the error signal.
 *
 * Definitions used by the UI:
 * - Rise time: time for |error| to fall from 90% to 10% of the initial step error.
 * - Settling time: first time after the step where |error| enters and stays within
 *   a +-2% band of the initial step error magnitude.
 */
function analyzeResponse(logData: LogEntry[]): ResponseAnalysis | null {
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
    const candidatePoints = data.filter((point) => initialDirection * point.error < 0);

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
          absoluteTime: riseEndPoint.time,
          elapsedTime: Math.max(riseEndPoint.time - riseStartPoint.time, 0),
        }
      : undefined,
    settlingBand,
    settlingTime: settlingPoint
      ? {
          absoluteTime: settlingPoint.time,
          elapsedTime: settlingPoint.time - analysisStartTime,
        }
      : undefined,
    overshoot:
      overshootPoint && initialErrorMagnitude > 0
        ? {
            absoluteTime: overshootPoint.time,
            elapsedTime: overshootPoint.time - analysisStartTime,
            error: overshootPoint.error,
            percent: (Math.abs(overshootPoint.error) / initialErrorMagnitude) * 100,
          }
        : undefined,
  };
}

function TelemetryTooltip({
  active,
  label,
  payload,
}: {
  active?: boolean;
  label?: number | string;
  payload?: Array<{
    color?: string;
    name?: string;
    value?: number | string;
  }>;
}) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const timeLabel = Number(label);

  return (
    <div className="chartTooltip">
      <div className="chartTooltipHeader">
        <span className="eyebrow">Sample</span>
        <strong className="chartTooltipTime">
          t + {formatMetric(timeLabel, 2)} s
        </strong>
      </div>

      <div className="chartTooltipRows">
        {payload.map((entry) => {
          const numericValue = Number(entry.value);

          return (
            <div
              className="chartTooltipRow"
              key={`${entry.name ?? "value"}-${entry.color ?? "tone"}`}
            >
              <span
                className="chartTooltipSwatch"
                style={{ backgroundColor: entry.color ?? axisColor }}
              />
              <span className="chartTooltipName">{entry.name ?? "Value"}</span>
              <strong className="chartTooltipValue">
                {formatSignedMetric(numericValue)}
              </strong>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ForceChart({ logData }: { logData: LogEntry[] }) {
  const [minTime, maxTime] = getTimeDomain(logData);
  const shouldRenderDots = logData.length === 1;

  return (
    <article className="chartCard">
      <div className="chartCardTop">
        <h3 className="chartCardTitle">Force Response vs Angle</h3>
      </div>

      <div className="chartCanvas">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={logData}
            margin={{ top: 18, right: 14, left: -12, bottom: 10 }}
          >
            <CartesianGrid
              stroke="rgba(147, 167, 181, 0.12)"
              strokeDasharray="4 8"
              vertical={false}
            />
            <XAxis
              dataKey="time"
              type="number"
              domain={[minTime, maxTime]}
              stroke={axisColor}
              axisLine={false}
              tickLine={false}
              tickMargin={10}
              tickFormatter={formatAxisTick}
              tick={{
                fill: axisColor,
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 12,
              }}
            />
            <YAxis
              yAxisId="left"
              type="number"
              stroke={forceColor}
              axisLine={false}
              tickLine={false}
              width={56}
              tickFormatter={formatAxisTick}
              tick={{
                fill: axisColor,
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 12,
              }}
            />
            <YAxis
              yAxisId="right"
              type="number"
              orientation="right"
              stroke={thetaColor}
              axisLine={false}
              tickLine={false}
              width={56}
              tickFormatter={formatAxisTick}
              tick={{
                fill: axisColor,
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 12,
              }}
            />
            <Tooltip
              cursor={{
                stroke: "rgba(89, 211, 255, 0.18)",
                strokeWidth: 1,
                strokeDasharray: "3 6",
              }}
              content={<TelemetryTooltip />}
            />
            <Legend
              iconType="circle"
              wrapperStyle={{
                paddingTop: 16,
                color: axisColor,
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 12,
              }}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="force"
              name="Force"
              stroke={forceColor}
              strokeWidth={2.8}
              strokeLinecap="round"
              isAnimationActive={false}
              dot={
                shouldRenderDots
                  ? { ...highlightedDotProps, fill: forceColor }
                  : false
              }
              activeDot={{
                ...highlightedDotProps,
                fill: forceColor,
              }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="theta"
              name="Pendulum angle"
              stroke={thetaColor}
              strokeWidth={2.8}
              strokeLinecap="round"
              isAnimationActive={false}
              dot={
                shouldRenderDots
                  ? { ...highlightedDotProps, fill: thetaColor }
                  : false
              }
              activeDot={{
                ...highlightedDotProps,
                fill: thetaColor,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}

function ErrorResponseChart({ logData }: { logData: LogEntry[] }) {
  const analysis = analyzeResponse(logData);

  if (!analysis) {
    return null;
  }

  const [minTime, maxTime] = getTimeDomain(analysis.data);
  const maxAbsError = analysis.data.reduce((largestError, point) => {
    return Math.max(largestError, Math.abs(point.error));
  }, 0);
  const axisExtent = Math.max(
    maxAbsError * (1 + ERROR_AXIS_PADDING_RATIO),
    analysis.settlingBand ?? 0,
    MIN_ERROR_AXIS_EXTENT,
  );
  const shouldRenderDots = analysis.data.length === 1;

  return (
    <article className="chartCard">
      <div className="chartCardTop">
        <h3 className="chartCardTitle">Error vs Time</h3>
      </div>

      <div className="chartCanvas">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={analysis.data}
            margin={{ top: 18, right: 22, left: -12, bottom: 10 }}
          >
            <CartesianGrid
              stroke="rgba(147, 167, 181, 0.12)"
              strokeDasharray="4 8"
              vertical={false}
            />
            <XAxis
              dataKey="time"
              type="number"
              domain={[minTime, maxTime]}
              stroke={axisColor}
              axisLine={false}
              tickLine={false}
              tickMargin={10}
              tickFormatter={formatAxisTick}
              tick={{
                fill: axisColor,
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 12,
              }}
            />
            <YAxis
              type="number"
              domain={[-axisExtent, axisExtent]}
              stroke={errorColor}
              axisLine={false}
              tickLine={false}
              width={56}
              tickFormatter={formatAxisTick}
              tick={{
                fill: axisColor,
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 12,
              }}
            />
            <Tooltip
              cursor={{
                stroke: "rgba(255, 107, 87, 0.18)",
                strokeWidth: 1,
                strokeDasharray: "3 6",
              }}
              content={<TelemetryTooltip />}
            />
            <ReferenceLine
              y={0}
              stroke="rgba(223, 248, 255, 0.28)"
              strokeDasharray="6 6"
            />
            {analysis.settlingBand ? (
              <ReferenceArea
                y1={-analysis.settlingBand}
                y2={analysis.settlingBand}
                fill="rgba(157, 248, 113, 0.08)"
                strokeOpacity={0}
              />
            ) : null}
            {analysis.riseTime ? (
              <ReferenceLine
                x={analysis.riseTime.absoluteTime}
                stroke="rgba(89, 211, 255, 0.36)"
                strokeDasharray="6 6"
                label={{
                  value: `Rise ${formatCompactSeconds(analysis.riseTime.elapsedTime)}`,
                  position: "insideTopRight",
                  fill: "#9bdcff",
                  fontSize: 11,
                  fontFamily: '"IBM Plex Mono", monospace',
                }}
              />
            ) : null}
            {analysis.settlingTime ? (
              <ReferenceLine
                x={analysis.settlingTime.absoluteTime}
                stroke="rgba(157, 248, 113, 0.38)"
                strokeDasharray="6 6"
                label={{
                  value: `Settle ${formatCompactSeconds(analysis.settlingTime.elapsedTime)}`,
                  position: "insideTopLeft",
                  fill: "#bdf6a0",
                  fontSize: 11,
                  fontFamily: '"IBM Plex Mono", monospace',
                }}
              />
            ) : null}
            {analysis.overshoot ? (
              <ReferenceDot
                x={analysis.overshoot.absoluteTime}
                y={analysis.overshoot.error}
                r={5}
                fill={errorColor}
                stroke="#071017"
                strokeWidth={2}
                label={{
                  value: `Overshoot ${formatMetric(analysis.overshoot.percent, 1)}%`,
                  position: "top",
                  fill: "#ffb3a7",
                  fontSize: 11,
                  fontFamily: '"IBM Plex Mono", monospace',
                }}
              />
            ) : null}
            <Line
              type="monotone"
              dataKey="error"
              name="Error"
              stroke={errorColor}
              strokeWidth={2.8}
              strokeLinecap="round"
              isAnimationActive={false}
              dot={
                shouldRenderDots
                  ? { ...highlightedDotProps, fill: errorColor }
                  : false
              }
              activeDot={{
                ...highlightedDotProps,
                fill: errorColor,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}

const Charts = memo(function Charts({ fallbackState, logData }: ChartsProps) {
  const chartData =
    logData.length > 0 ? logData : [createFallbackLogEntry(fallbackState)];

  return (
    <div className="telemetryInsights">
      <div className="chartStack">
        <ForceChart logData={chartData} />
        <ErrorResponseChart logData={chartData} />
      </div>
    </div>
  );
});

export default Charts;
