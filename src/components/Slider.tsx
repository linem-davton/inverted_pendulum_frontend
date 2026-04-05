import Button from "@mui/material/Button";
import Slider from "@mui/material/Slider";
import TextField from "@mui/material/TextField";
import {
  PID_RANGE_CAP,
  disturbanceMeta,
  getNextPidRange,
  pidKeys,
  pidMeta,
  type ParamKey,
  type ParameterMeta,
  type PidKey,
} from "../lib/controllerConfig";
import { useControllerConfig } from "../hooks/useControllerConfig";
import type { ServerTarget } from "../types/simulator";

function formatValue(value: number, precision: number) {
  return value.toFixed(precision);
}

function formatCompactValue(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function ControllerSliders({ server }: { server: ServerTarget }) {
  const {
    controller,
    increasePidRange,
    pidRanges,
    resetDisturbance,
    resetPid,
    updateParameter,
  } = useControllerConfig({ server });

  const renderParameterCard = (key: ParamKey, meta: ParameterMeta) => {
    const value = controller[key];
    const isPidParameter = key in pidMeta;
    const pidKey = isPidParameter ? (key as PidKey) : null;
    const canIncreasePidRange =
      pidKey !== null && pidRanges[pidKey] < PID_RANGE_CAP;
    const nextPidRange =
      pidKey !== null ? getNextPidRange(pidRanges[pidKey]) : null;

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
          {isPidParameter ? (
            <>
              <span>range 0 to {formatCompactValue(meta.max)}</span>
              <button
                type="button"
                className="parameterRangeButton"
                onClick={() => {
                  if (pidKey && nextPidRange !== null) {
                    increasePidRange(pidKey, nextPidRange);
                  }
                }}
                disabled={!canIncreasePidRange}
              >
                {canIncreasePidRange && nextPidRange !== null
                  ? `to ${formatCompactValue(nextPidRange)}`
                  : "cap"}
              </button>
            </>
          ) : (
            <>
              <span>min {formatValue(meta.min, meta.precision)}</span>
              <span>max {formatValue(meta.max, meta.precision)}</span>
            </>
          )}
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
