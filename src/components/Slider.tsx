import { useEffect, useState } from "react";
import Button from "@mui/material/Button";
import Slider from "@mui/material/Slider";
import TextField from "@mui/material/TextField";
import config from "../config.json";

const defaults = {
  kp: 0.5,
  ki: 0,
  kd: 2,
  ref: 0,
  delay: 0,
  jitter: 0,
};

type ControllerState = typeof defaults;
type ParamKey = keyof ControllerState;
type PidKey = "kp" | "ki" | "kd";

const pidKeys: PidKey[] = ["kp", "ki", "kd"];

const pidMeta = {
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
} as const;

const disturbanceMeta = {
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
} as const;

function roundValue(value: number, precision: number) {
  return Number(value.toFixed(precision));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatValue(value: number, precision: number) {
  return value.toFixed(precision);
}

function ControllerSliders({ server }: { server: string }) {
  const [controller, setController] = useState<ControllerState>(defaults);
  const [pidRanges, setPidRanges] = useState<Record<PidKey, number>>({
    kp: 10,
    ki: 10,
    kd: 10,
  });

  const activeServerUrl =
    server === "remote" ? config.remoteServer : config.localServer;

  const updatePidRange = (key: PidKey, value: number) => {
    setPidRanges((prevRanges) => {
      const currentMax = prevRanges[key];
      let nextMax = currentMax;

      if (value >= currentMax * 0.95) {
        nextMax = Math.max(roundValue(value * 5, 2), 10);
      } else if (currentMax > 10 && value <= currentMax * 0.2) {
        nextMax = Math.max(roundValue(Math.max(value, 2) * 5, 2), 10);
      }

      if (nextMax === currentMax) {
        return prevRanges;
      }

      return {
        ...prevRanges,
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
      setController((prev) => ({
        ...prev,
        [pidKey]: nextValue,
      }));
      return;
    }

    const meta = disturbanceMeta[key as keyof typeof disturbanceMeta];
    const nextValue = roundValue(
      clamp(rawValue, meta.min, meta.max),
      meta.precision,
    );

    setController((prev) => ({
      ...prev,
      [key]: nextValue,
    }));
  };

  useEffect(() => {
    fetch(`${activeServerUrl}/pid`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kp: controller.kp,
        ki: controller.ki,
        kd: controller.kd,
      }),
    })
      .then((response) => {
        console.log(response);
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  }, [activeServerUrl, controller.kd, controller.ki, controller.kp]);

  useEffect(() => {
    fetch(`${activeServerUrl}/params`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ref: controller.ref,
        delay: controller.delay,
        jitter: controller.jitter,
      }),
    })
      .then((response) => {
        console.log(response);
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  }, [activeServerUrl, controller.delay, controller.jitter, controller.ref]);

  const resetPid = () => {
    setController((prev) => ({
      ...prev,
      kp: defaults.kp,
      ki: defaults.ki,
      kd: defaults.kd,
    }));
    setPidRanges({
      kp: 10,
      ki: 10,
      kd: 10,
    });
  };

  const resetDisturbance = () => {
    setController((prev) => ({
      ...prev,
      ref: defaults.ref,
      delay: defaults.delay,
      jitter: defaults.jitter,
    }));
  };

  const renderParameterCard = (
    key: ParamKey,
    meta: {
      label: string;
      unit: string;
      min: number;
      max: number;
      step: number;
      precision: number;
      tone: string;
    },
  ) => {
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
