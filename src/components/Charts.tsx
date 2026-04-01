import { memo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { LogEntry } from "../types/simulator";

interface ChartsProps {
  logData: LogEntry[];
}

type ChartKey = "x" | "theta" | "force" | "theta_dot_dot";

interface ChartDefinition {
  title: string;
  primaryKey: ChartKey;
  primaryLabel: string;
  primaryColor: string;
  primaryAxisColor: string;
  secondaryKey?: ChartKey;
  secondaryLabel?: string;
  secondaryColor?: string;
  secondaryAxisColor?: string;
}

const thetaColor = "#ff9a4d";
const forceColor = "#59d3ff";
const positionColor = "#9df871";
const forceAxisColor = "#59d3ff";
const positionAxisColor = "#9df871";
const thetaAxisColor = "#ff9a4d";
const axisColor = "#93a7b5";

const charts: ChartDefinition[] = [
  {
    title: "Force Response vs Angle",
    primaryKey: "force",
    primaryLabel: "Force",
    primaryColor: forceColor,
    primaryAxisColor: forceAxisColor,
    secondaryKey: "theta",
    secondaryLabel: "Pendulum angle",
    secondaryColor: thetaColor,
    secondaryAxisColor: thetaAxisColor,
  },
  {
    title: "Cart Position",
    primaryKey: "x",
    primaryLabel: "Cart position",
    primaryColor: positionColor,
    primaryAxisColor: positionAxisColor,
  },
];

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

const Charts = memo(function Charts({ logData }: ChartsProps) {
  if (logData.length === 0) {
    return (
      <article className="chartEmptyCard chartEmptyCard--minimal">
        <span className="chartEmptyLabel">No telemetry yet</span>
      </article>
    );
  }

  const latestLog = logData[logData.length - 1];
  const minTime = logData[0].time;
  const maxTime = latestLog.time;

  return (
    <div className="telemetryInsights">
      <div className="chartStack">
        {charts.map((chart) => (
          <article className="chartCard" key={chart.title}>
            <div className="chartCardTop">
              <h3 className="chartCardTitle">{chart.title}</h3>
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
                    stroke={chart.primaryAxisColor}
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
                  {chart.secondaryKey ? (
                    <YAxis
                      yAxisId="right"
                      type="number"
                      orientation="right"
                      stroke={chart.secondaryAxisColor}
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
                  ) : null}
                  <Tooltip
                    cursor={{
                      stroke: "rgba(89, 211, 255, 0.18)",
                      strokeWidth: 1,
                      strokeDasharray: "3 6",
                    }}
                    content={<TelemetryTooltip />}
                  />
                  {chart.secondaryKey ? (
                    <Legend
                      iconType="circle"
                      wrapperStyle={{
                        paddingTop: 16,
                        color: axisColor,
                        fontFamily: '"IBM Plex Mono", monospace',
                        fontSize: 12,
                      }}
                    />
                  ) : null}
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey={chart.primaryKey}
                    name={chart.primaryLabel}
                    stroke={chart.primaryColor}
                    strokeWidth={2.8}
                    strokeLinecap="round"
                    isAnimationActive={false}
                    dot={false}
                    activeDot={{
                      r: 4,
                      fill: chart.primaryColor,
                      stroke: "#071017",
                      strokeWidth: 2,
                    }}
                  />
                  {chart.secondaryKey && chart.secondaryLabel ? (
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey={chart.secondaryKey}
                      name={chart.secondaryLabel}
                      stroke={chart.secondaryColor}
                      strokeWidth={2.8}
                      strokeLinecap="round"
                      isAnimationActive={false}
                      dot={false}
                      activeDot={{
                        r: 4,
                        fill: chart.secondaryColor,
                        stroke: "#071017",
                        strokeWidth: 2,
                      }}
                    />
                  ) : null}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
});

export default Charts;
