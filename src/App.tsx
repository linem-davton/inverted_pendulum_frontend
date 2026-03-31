import { useEffect, useState } from "react";
import "./App.css";
import Button from "@mui/material/Button";
import CssBaseline from "@mui/material/CssBaseline";
import Link from "@mui/material/Link";
import { ThemeProvider } from "@mui/material/styles";
import CartPendulum from "./components/CartPendulum";
import Charts, {
  MIN_TELEMETRY_BADGE_SAMPLES,
  TelemetryStatus,
} from "./components/Charts";
import ControllerSliders from "./components/Slider";
import { useSimulationRuntime } from "./hooks/useSimulationRuntime";
import appTheme from "./theme";
import type { ServerTarget } from "./types/simulator";

const MIN_FETCH_DURATION = 50;
const MAX_FETCH_DURATION = 1000;

const PROJECT_LINKS = [
  {
    label: "Frontend",
    href: "https://github.com/linem-davton/inverted_pendulum_frontend",
  },
  {
    label: "Backend",
    href: "https://github.com/linem-davton/es-lab-task1",
  },
  {
    label: "Docs",
    href: "https://eslab.es.eti.uni-siegen.de/eslab1/docs/index.html",
  },
] as const;

function formatMetric(value: number, digits = 2) {
  return Number.isFinite(value) ? value.toFixed(digits) : "—";
}

function App() {
  const [fetchDuration, setFetchDuration] = useState(300);
  const [fetchDurationInput, setFetchDurationInput] = useState("300");
  const [server, setServer] = useState<ServerTarget>(() => {
    return localStorage.getItem("serverUrl") === "local" ? "local" : "remote";
  });
  const {
    logData,
    paused,
    restartSimulation,
    simData,
    startSimulation,
    started,
    toggleSimulation,
  } = useSimulationRuntime({
    fetchDuration,
    server,
  });

  const latestLog = logData.length > 0 ? logData[logData.length - 1] : null;
  const hasTelemetryStatus = logData.length >= MIN_TELEMETRY_BADGE_SAMPLES;
  const statusTone = !started ? "idle" : paused ? "paused" : "live";
  const statusLabel = !started
    ? "Idle"
    : paused
      ? "Paused"
      : "Live";
  const connectionLabel = server === "remote" ? "Remote" : "Local";
  const docsLink = PROJECT_LINKS.find((link) => link.label === "Docs");
  const referenceLinks = PROJECT_LINKS.filter((link) => link.label !== "Docs");

  const metrics = [
    {
      label: "Simulation time",
      value: formatMetric(simData.time, 2),
      unit: "s",
      tone: "secondary",
    },
    {
      label: "Cart position",
      value: formatMetric(simData.cartPosition, 3),
      unit: "",
      tone: "secondary",
    },
    {
      label: "Pendulum angle",
      value: formatMetric(simData.pendulumAngle, 3),
      unit: "rad",
      tone: "primary",
    },
    {
      label: "Control force",
      value: formatMetric(latestLog?.force ?? 0, 3),
      unit: "",
      tone: "primary",
    },
  ];

  const parsedFetchDuration = Number(fetchDurationInput.trim());

  const applyFetchDuration = () => {
    if (
      fetchDurationInput.trim() === "" ||
      !Number.isFinite(parsedFetchDuration)
    ) {
      setFetchDurationInput(String(fetchDuration));
      return;
    }

    const nextDuration = Math.min(
      MAX_FETCH_DURATION,
      Math.max(MIN_FETCH_DURATION, Math.round(parsedFetchDuration)),
    );

    setFetchDuration(nextDuration);
    setFetchDurationInput(String(nextDuration));
  };

  useEffect(() => {
    localStorage.setItem("serverUrl", server);
  }, [server]);

  useEffect(() => {
    setFetchDurationInput(String(fetchDuration));
  }, [fetchDuration]);

  return (
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <div className="appShell">
        <header className="topBar topBar--utilityOnly">
          <section className="topBarUtilities topBarUtilities--compact">
            <div className="consoleToolbar">
              <div className="consoleToolbarMain">
                <span className={`statusPill statusPill--${statusTone}`}>
                  {statusLabel}
                </span>
                <button
                  type="button"
                  className={`toolbarAction toolbarAction--toggle ${
                    server === "local" ? "toolbarAction--active" : ""
                  }`}
                  onClick={() => {
                    setServer((previousServer) => {
                      return previousServer === "remote" ? "local" : "remote";
                    });
                  }}
                  aria-pressed={server === "local"}
                >
                  {connectionLabel}
                </button>
                <label className="toolbarField">
                  <input
                    className="toolbarInput"
                    type="number"
                    min={MIN_FETCH_DURATION}
                    max={MAX_FETCH_DURATION}
                    step={10}
                    value={fetchDurationInput}
                    onChange={(event) => {
                      setFetchDurationInput(event.target.value);
                    }}
                    onBlur={applyFetchDuration}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        applyFetchDuration();
                      }
                    }}
                    aria-label="Polling interval in milliseconds"
                  />
                  <span className="toolbarInputUnit">ms</span>
                </label>
              </div>
              <nav className="consoleToolbarLinks" aria-label="Project links">
                <div className="consoleToolbarReferences">
                  {referenceLinks.map((link) => (
                    <Link
                      key={link.label}
                      className="toolbarLink toolbarLink--reference"
                      href={link.href}
                      underline="none"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
                {docsLink ? (
                  <Link
                    className="toolbarLink toolbarLink--docs"
                    href={docsLink.href}
                    underline="hover"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {docsLink.label}
                  </Link>
                ) : null}
              </nav>
            </div>
          </section>
        </header>

        <main className="dashboardLayout">
          <section className="stageDeck">
            <section className="stageCard stageCard--tight">
              <div className="sectionHeading sectionHeading--tight">
                <div>
                  <h2 className="sectionTitle">Simulation</h2>
                </div>
              </div>

              <div className="stageViewport">
                <div className="cartpendulum">
                  <CartPendulum
                    cartPosition={simData.cartPosition}
                    pendulumAngle={simData.pendulumAngle}
                  />
                </div>
              </div>

              <div className="metricStrip">
                {metrics.map((metric) => (
                  <article
                    key={metric.label}
                    className={`metricCard metricCard--${metric.tone}`}
                  >
                    <span className="metricLabel">{metric.label}</span>
                    <div className="metricValueRow">
                      <strong className="metricValue">{metric.value}</strong>
                      {metric.unit ? (
                        <span className="metricUnit">{metric.unit}</span>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="telemetryDeck telemetryDeck--inline">
              <Charts logData={logData} />
            </section>
          </section>

          <aside className="operatorRail">
            <section className="operatorCard operatorCard--session">
              <div className="operatorHeader">
                <span className="eyebrow">Session control</span>
              </div>

              <div
                className={`actionStack ${started ? "actionStack--dual" : ""}`}
              >
                {started ? (
                  <>
                    <Button
                      fullWidth
                      variant="contained"
                      color={paused ? "primary" : "secondary"}
                      size="large"
                      onClick={() => {
                        void toggleSimulation();
                      }}
                    >
                      {paused ? "Continue Simulation" : "Pause Simulation"}
                    </Button>
                    <Button
                      fullWidth
                      variant="outlined"
                      size="large"
                      onClick={() => {
                        void restartSimulation();
                      }}
                    >
                      Restart Run
                    </Button>
                  </>
                ) : (
                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    onClick={() => {
                      void startSimulation();
                    }}
                  >
                    Start Simulation
                  </Button>
                )}
              </div>
            </section>

            <section className="operatorCard operatorCard--tall">
              <ControllerSliders server={server} />
            </section>
          </aside>
        </main>

        {hasTelemetryStatus ? (
          <section className="telemetryFooter">
            <TelemetryStatus logData={logData} />
          </section>
        ) : null}
      </div>
    </ThemeProvider>
  );
}

export default App;
