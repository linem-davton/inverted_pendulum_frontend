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

interface LogEntry {
  time: number;
  x: number;
  theta: number;
  force: number;
  theta_dot_dot: number;
}

type TelemetryTone = "good" | "warn" | "danger" | "neutral";

interface ChartsProps {
  logData: LogEntry[];
}

interface TelemetryBadge {
  label: string;
  detail: string;
  tone: TelemetryTone;
}

export const MIN_TELEMETRY_BADGE_SAMPLES = 6;

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

function getPeakAbs(logData: LogEntry[], key: "theta" | "force") {
  return logData.reduce((peak, entry) => {
    return Math.max(peak, Math.abs(entry[key]));
  }, 0);
}

function getSpan(logData: LogEntry[], key: "x") {
  let minValue = Number.POSITIVE_INFINITY;
  let maxValue = Number.NEGATIVE_INFINITY;

  for (const entry of logData) {
    const value = entry[key];
    minValue = Math.min(minValue, value);
    maxValue = Math.max(maxValue, value);
  }

  return maxValue - minValue;
}

function getStabilityBadge(logData: LogEntry[]): TelemetryBadge {
  if (logData.length < MIN_TELEMETRY_BADGE_SAMPLES) {
    return {
      label: "Warming",
      detail: "Need more data.",
      tone: "neutral",
    };
  }

  const recentWindow = logData.slice(-Math.min(18, logData.length));
  const peakAngle = getPeakAbs(logData, "theta");
  const recentPeak = getPeakAbs(recentWindow, "theta");
  const latestAngle = Math.abs(logData[logData.length - 1].theta);

  if (
    recentPeak <= Math.max(0.06, peakAngle * 0.35) &&
    latestAngle <= Math.max(0.03, peakAngle * 0.22)
  ) {
    return {
      label: "Stable",
      detail: "Angle settling.",
      tone: "good",
    };
  }

  if (
    recentPeak >= Math.max(0.22, peakAngle * 0.82) &&
    latestAngle >= Math.max(0.1, peakAngle * 0.45)
  ) {
    return {
      label: "Unstable",
      detail: "Angle still wide.",
      tone: "danger",
    };
  }

  return {
    label: "Correcting",
    detail: "Recovery in progress.",
    tone: "warn",
  };
}

function getDriftBadge(logData: LogEntry[]): TelemetryBadge {
  if (logData.length < 4) {
    return {
      label: "Drift",
      detail: "Need more travel data.",
      tone: "neutral",
    };
  }

  const latestOffset = Math.abs(logData[logData.length - 1].x);
  const travelSpan = getSpan(logData, "x");

  if (
    latestOffset <= Math.max(0.08, travelSpan * 0.12) &&
    travelSpan <= 0.6
  ) {
    return {
      label: "Centered",
      detail: "Cart near center.",
      tone: "good",
    };
  }

  if (latestOffset >= Math.max(0.32, travelSpan * 0.5)) {
    return {
      label: "Drifting",
      detail: "Offset is growing.",
      tone: "danger",
    };
  }

  return {
    label: "Offset",
    detail: "Not centered yet.",
    tone: "warn",
  };
}

function getForceBadge(logData: LogEntry[]): TelemetryBadge {
  if (logData.length < 4) {
    return {
      label: "Drive",
      detail: "Need more force data.",
      tone: "neutral",
    };
  }

  const peakForce = getPeakAbs(logData, "force");
  const latestForce = Math.abs(logData[logData.length - 1].force);

  if (peakForce <= 1.5 && latestForce <= 1.0) {
    return {
      label: "Drive light",
      detail: "Force demand is low.",
      tone: "good",
    };
  }

  if (peakForce >= 6 || latestForce >= 3.5) {
    return {
      label: "Drive high",
      detail: "Force demand is high.",
      tone: "danger",
    };
  }

  return {
    label: "Drive active",
    detail: "Force demand is up.",
    tone: "warn",
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

function TelemetryBadgeRow({ logData }: { logData: LogEntry[] }) {
  const stabilityBadge = getStabilityBadge(logData);
  const driftBadge = getDriftBadge(logData);
  const forceBadge = getForceBadge(logData);
  const summaryBadges = [stabilityBadge, driftBadge, forceBadge];

  return (
    <div className="telemetryBadgeRow" aria-label="Telemetry state badges">
      {summaryBadges.map((badge) => (
        <article
          className={`telemetryBadge telemetryBadge--${badge.tone}`}
          key={badge.label}
        >
          <strong className="telemetryBadgeLabel">{badge.label}</strong>
          <span className="telemetryBadgeDetail">{badge.detail}</span>
        </article>
      ))}
    </div>
  );
}

export function TelemetryStatus({ logData }: { logData: LogEntry[] }) {
  if (logData.length < MIN_TELEMETRY_BADGE_SAMPLES) {
    return null;
  }

  return <TelemetryBadgeRow logData={logData} />;
}

function Charts({ logData }: ChartsProps) {
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
}

export default Charts;
