import { useState, useEffect } from "react";
import Slider from "@mui/material/Slider";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import config from "../config.json";
import Button from "@mui/material/Button";

let serverUrl: string = config.localServer;

function ControllerSliders({ server }: { server: string }) {
  const [kp, setKp] = useState(0.5); // Initial Kp value
  const [ki, setKi] = useState(0.0);
  const [kd, setKd] = useState(2);
  const [ref, setRef] = useState(0.0);
  const [delay, setDelay] = useState(0.0);
  const [jitter, setJitter] = useState(0.0);

  const [kpRange, setKpRange] = useState([0.01, 10]);
  const [kiRange, setKiRange] = useState([0.01, 10]);
  const [kdRange, setKdRange] = useState([0.01, 10]);
  if (server === "remote") {
    serverUrl = config.remoteServer;
  }
  if (server === "local") {
    serverUrl = config.localServer;
  }

  const handleSliderChange = (name: string, value: any) => {
    let min, max;
    switch (name) {
      case "kp":
        setKp(() => {
          if (value > 0.95 * kpRange[1] || value < 2 * kpRange[0]) {
            min = Math.round((value / 5 + Number.EPSILON) * 100) / 100;
            max = Math.round((value * 5 + Number.EPSILON) * 100) / 100;
            setKpRange([min, max]);
          }
          return Math.round((value + Number.EPSILON) * 100) / 100;
        });
        break;
      case "ki":
        setKi(() => {
          if (value > 0.95 * kiRange[1] || value < 2 * kiRange[0]) {
            min = Math.round((value / 5 + Number.EPSILON) * 100) / 100;
            max = Math.round((value * 5 + Number.EPSILON) * 100) / 100;
            setKiRange([min, max]);
          }
          return Math.round((value + Number.EPSILON) * 100) / 100;
        });
        break;
      case "kd":
        setKd(() => {
          if (value > 0.95 * kdRange[1] || value < 2 * kdRange[0]) {
            min = Math.round((value / 5 + Number.EPSILON) * 100) / 100;
            max = Math.round((value * 5 + Number.EPSILON) * 100) / 100;
            setKdRange([min, max]);
          }
          return Math.round((value + Number.EPSILON) * 100) / 100;
        });
        break;
      case "ref":
        setRef(() => {
          return Math.round((value + Number.EPSILON) * 100) / 100;
        });
        break;
      case "delay":
        setDelay(() => {
          return Math.round((value + Number.EPSILON) * 100) / 100;
        });
        break;
      case "jitter":
        setJitter(() => {
          return Math.round((value + Number.EPSILON) * 100) / 100;
        });
        break;
      default:
        break;
    }
  };
  useEffect(() => {
    fetch(`${serverUrl}/pid`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kp: kp, ki: ki, kd: kd }),
    })
      .then((response) => {
        console.log(response);
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  }, [kp, ki, kd]);

  useEffect(() => {
    fetch(`${serverUrl}/params`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ref: ref, delay: delay, jitter: jitter }),
    })
      .then((response) => {
        console.log(response);
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  }, [ref, delay, jitter]);

  const resetSlider = () => {
    setKp(0.5);
    setKi(0.0);
    setKd(2);
    setRef(0.0);
    setDelay(0.0);
    setJitter(0.0);
  };
  return (
    <div className="sliders">
      <Box
        sx={{
          width: 700,
        }}
      >
        <Stack spacing={2} direction="row" sx={{ mb: 1 }} alignItems="center">
          <span>Kp: {kp}</span>
          <Slider
            value={kp}
            min={kpRange[0]}
            max={kpRange[1]}
            step={(kpRange[1] - kpRange[0]) / 100}
            color="secondary"
            onChange={(_event, newValue) => handleSliderChange("kp", newValue)}
          />
          <span>{kpRange[1]}</span>
        </Stack>
        <Stack spacing={2} direction="row" sx={{ mb: 1 }} alignItems="center">
          <span>Ki: {ki}</span>
          <Slider
            value={ki}
            min={kiRange[0]}
            max={kiRange[1]}
            step={0.01}
            color="secondary"
            onChange={(_event, newValue) => handleSliderChange("ki", newValue)}
          />
          <span>{kiRange[1]}</span>
        </Stack>
        <Stack spacing={2} direction="row" sx={{ mb: 1 }} alignItems="center">
          <span>Kd: {kd}</span>
          <Slider
            value={kd}
            min={kdRange[0]}
            max={kdRange[1]}
            step={0.01}
            color="secondary"
            onChange={(_event, newValue) => handleSliderChange("kd", newValue)}
          />
          <span>{kdRange[1]}</span>
        </Stack>
        <Stack spacing={2} direction="row" sx={{ mb: 1 }} alignItems="center">
          <span>Reference: {ref}</span>
          <Slider
            value={ref}
            min={-3.14}
            max={3.14}
            step={0.01}
            color="secondary"
            onChange={(_event, newValue) => handleSliderChange("ref", newValue)}
          />
          <span>3.14</span>
        </Stack>
        <Stack spacing={2} direction="row" sx={{ mb: 1 }} alignItems="center">
          <span>Delay(μs): {delay}</span>
          <Slider
            value={delay}
            min={0}
            max={10000}
            step={10}
            color="secondary"
            onChange={(_event, newValue) =>
              handleSliderChange("delay", newValue)
            }
          />
          <span>100,000</span>
        </Stack>
        <Stack spacing={2} direction="row" sx={{ mb: 1 }} alignItems="center">
          <span>Jitter(μs): {jitter}</span>
          <Slider
            value={jitter}
            min={0}
            max={5000}
            step={10}
            color="secondary"
            onChange={(_event, newValue) =>
              handleSliderChange("jitter", newValue)
            }
          />
          <span>5000</span>
        </Stack>
      </Box>
      <Button variant="contained" sx={{ margin: "30px" }} onClick={resetSlider}>
        Reset
      </Button>
    </div>
  );
}

export default ControllerSliders;
