import { useState, useEffect } from "react";
import "./App.css";
import Button from "@mui/material/Button";
import { createTheme } from "@mui/material/styles";
import { ThemeProvider } from "@mui/material/styles";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import Container from "@mui/material/Container";
import CartPendulum from "./components/CartPendulum";
import Charts from "./components/Charts";
import ControllerSliders from "./components/Slider";
import config from "./config.json";

let intervalId: number;
const serverUrl = config.serverUrl;

interface LogEntry {
  time: number;
  x: number;
  theta: number;
  force: number;
  theta_dot_dot: number;
}

function App() {
  const [simData, setSimData] = useState({
    time: 0,
    cartPosition: 100,
    pendulumAngle: 0.75,
  });
  const [logData, setLogData] = useState<LogEntry[]>([]);
  const [paused, setPaused] = useState(true);
  const [start, setStart] = useState(false);
  const [fetchDuration, setFetchDuration] = useState(300);

  const fetchData = () => {
    fetch(`${serverUrl}/sim`)
      .then((res) => res.json())
      .then((data) => {
        setSimData({
          time: data.time,
          cartPosition: data.x,
          pendulumAngle: data.theta,
        });
        setLogData((prevLogData) => [
          ...prevLogData,
          {
            time: data.time,
            x: data.x,
            theta: data.theta,
            force: data.force,
            theta_dot_dot: data.theta_dot_dot,
          },
        ]);
        setPaused(data.pause);
      })
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    console.log("Intervalid :", intervalId);
    fetch(`${serverUrl}/status`)
      .then((res) => res.json())
      .then((data) => {
        setStart(() => {
          setPaused(data.pause);
          if (data.start && !data.pause) {
            intervalId = setInterval(fetchData, fetchDuration);
            console.log("Interval Started with ID:", intervalId);
          }
          return data.start;
        });
      })
      .catch((err) => console.error(err));
    return () => {
      clearInterval(intervalId);
    };
  }, []);

  const restartSimulation = () => {
    clearInterval(intervalId);
    setLogData([]);
    fetch(`${serverUrl}/reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reset: true }),
    })
      .then(() => {
        setLogData([]);
        intervalId = setInterval(fetchData, fetchDuration);
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  };
  const startStopSimulation = () => {
    fetch(`${serverUrl}/startstop`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ start: paused }),
    })
      .then(() => {
        setPaused((pause) => {
          if (!pause) {
            clearInterval(intervalId);
            console.log("Cleared Intervalid :", intervalId);
          } else {
            intervalId = setInterval(fetchData, fetchDuration);
            console.log("Interval Started with ID:", intervalId);
          }
          console.log("Paused status :" + !pause);
          return !pause;
        });
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  };
  const startSimulation = () => {
    fetch(`${serverUrl}/startstop`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ start: true }),
    })
      .then(() => {
        setStart(() => {
          setPaused((pause) => !pause);
          intervalId = setInterval(fetchData, fetchDuration);
          console.log("Interval Started with ID:", intervalId);
          return true;
        });
      })
      .catch((error) => {
        console.error("Error:", error);
        alert("Error " + error);
      });
  };
  const handlefetchDuration = () => {
    const duration = prompt(
      "Enter the fetch duration in milliseconds:",
      `${fetchDuration}`,
    );
    clearInterval(intervalId);
    if (start && !paused) {
      intervalId = setInterval(fetchData, Number(duration));
    }
    setFetchDuration(Number(duration));
  };

  return (
    <ThemeProvider theme={simTheme}>
      <div className="container">
        <div className="cartpendulum">
          <CartPendulum
            cartPosition={simData.cartPosition}
            pendulumAngle={simData.pendulumAngle}
          />
        </div>
        <div className="charts">
          {logData.length > 0 ? (
            <Charts logData={logData} />
          ) : (
            <div>Loading chart data...</div>
          )}
          <ControllerSliders />
          <div className="controls">
            {start ? (
              <>
                <Button
                  variant="contained"
                  size="large"
                  sx={{ margin: "10px", minWidth: 180 }}
                  onClick={restartSimulation}
                >
                  Restart Simulation
                </Button>
                <Button
                  variant="contained"
                  size="large"
                  sx={{ margin: "10px", minWidth: 180 }}
                  onClick={startStopSimulation}
                >
                  {paused ? "Continue" : "Pause"}
                </Button>{" "}
              </>
            ) : (
              <Button
                variant="contained"
                size="large"
                sx={{ margin: "10px" }}
                onClick={startSimulation}
              >
                Start
              </Button>
            )}
            <Button
              variant="contained"
              size="large"
              sx={{ margin: "10px", minWidth: 180 }}
              onClick={handlefetchDuration}
            >
              Fetch Interval
            </Button>
          </div>
          <footer
            style={{
              backgroundColor: "#f0f0f0",
              padding: "20px 0",
              marginTop: "auto",
            }}
          >
            <Container maxWidth="sm">
              <Typography variant="body1" align="center">
                <Link
                  href="https://github.com/linem-davton/inverted_pendulum_frontend"
                  underline="hover"
                  sx={{ padding: "20px" }}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GitHub Frontend
                </Link>
                <Link
                  href="https://github.com/linem-davton/es-lab-task1"
                  underline="hover"
                  sx={{ padding: "20px" }}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GitHub Backend
                </Link>
                <Link
                  href="https://eslab1docs.pages.dev/"
                  underline="hover"
                  sx={{ padding: "20px" }}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Task Documentation{" "}
                </Link>
              </Typography>
            </Container>
          </footer>
        </div>
      </div>
    </ThemeProvider>
  );
}
const simTheme = createTheme({
  palette: {
    primary: {
      main: "#2c3e50",
    },
    secondary: {
      main: "#9b59b6",
    },
  },
});

export default App;
