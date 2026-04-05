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
import {
  analyzeResponse,
  createFallbackLogEntry,
  getTimeDomain,
} from "../lib/chartAnalysis";
import type { LogEntry, SimData } from "../types/simulator";

interface ChartsProps {
  fallbackState: SimData;
  logData: LogEntry[];
}

const thetaColor = "#ff9a4d";
const forceColor = "#59d3ff";
const errorColor = "#ff6b57";
const axisColor = "#93a7b5";
const axisTextStyle = {
  fill: axisColor,
  fontFamily: '"IBM Plex Mono", monospace',
  fontSize: 12,
} as const;

const MIN_ERROR_AXIS_EXTENT = 0.1;
const ERROR_AXIS_PADDING_RATIO = 0.15;
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
  const [minTime, maxTime] = getTimeDomain(logData, (entry) => entry.time);
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
            margin={{ top: 18, right: 8, left: 8, bottom: 6 }}
          >
            <CartesianGrid
              stroke="rgba(147, 167, 181, 0.12)"
              strokeDasharray="4 8"
              vertical={false}
            />
            <XAxis
              dataKey="time"
              type="number"
              height={44}
              domain={[minTime, maxTime]}
              label={{
                value: "Time (s)",
                position: "insideBottom",
                offset: -4,
                ...axisTextStyle,
              }}
              stroke={axisColor}
              axisLine={false}
              tickLine={false}
              tickMargin={10}
              tickFormatter={formatAxisTick}
              tick={axisTextStyle}
            />
            <YAxis
              yAxisId="left"
              type="number"
              label={{
                value: "Force",
                angle: -90,
                position: "insideLeft",
                ...axisTextStyle,
              }}
              stroke={forceColor}
              axisLine={false}
              tickLine={false}
              width={68}
              tickFormatter={formatAxisTick}
              tick={axisTextStyle}
            />
            <YAxis
              yAxisId="right"
              type="number"
              orientation="right"
              label={{
                value: "Angle",
                angle: 90,
                position: "insideRight",
                ...axisTextStyle,
              }}
              stroke={thetaColor}
              axisLine={false}
              tickLine={false}
              width={68}
              tickFormatter={formatAxisTick}
              tick={axisTextStyle}
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

  const [minTime, maxTime] = getTimeDomain(
    analysis.data,
    (point) => point.displayTime,
  );
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
            margin={{ top: 18, right: 12, left: 8, bottom: 6 }}
          >
            <CartesianGrid
              stroke="rgba(147, 167, 181, 0.12)"
              strokeDasharray="4 8"
              vertical={false}
            />
            <XAxis
              dataKey="displayTime"
              type="number"
              height={44}
              domain={[minTime, maxTime]}
              label={{
                value: "Time (s)",
                position: "insideBottom",
                offset: -4,
                ...axisTextStyle,
              }}
              stroke={axisColor}
              axisLine={false}
              tickLine={false}
              tickMargin={10}
              tickFormatter={formatAxisTick}
              tick={axisTextStyle}
            />
            <YAxis
              type="number"
              domain={[-axisExtent, axisExtent]}
              label={{
                value: "Error",
                angle: -90,
                position: "insideLeft",
                ...axisTextStyle,
              }}
              stroke={errorColor}
              axisLine={false}
              tickLine={false}
              width={68}
              tickFormatter={formatAxisTick}
              tick={axisTextStyle}
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
                x={analysis.riseTime.chartTime}
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
                x={analysis.settlingTime.chartTime}
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
                x={analysis.overshoot.chartTime}
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
