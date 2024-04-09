import { useState, useEffect } from 'react'
import './App.css'
import Button from '@mui/material/Button';
import { createTheme } from '@mui/material/styles';
import { ThemeProvider } from '@mui/material/styles';
import CartPendulum from './components/CartPendulum'
import Charts from './components/Charts'
import ControllerSliders from './components/Slider'
//import Charts from './components/Charts'

let intervalId;

function App() {
  const [simData, setSimData] = useState({ time: 0, cartPosition: 100, pendulumAngle: 0 });
  const [logData, setLogData] = useState([]);
  const [paused, setPaused] = useState(true);
  const [start, setStart] = useState(false);
  const fetchDuration = 100;

  const fetchData = () => {
    fetch('http://127.0.0.1:8080/sim')
      .then(res => res.json())
      .then(data => {
        setSimData({ time: data.time, cartPosition: data.x, pendulumAngle: data.theta });
        setLogData(prevLogData => [...prevLogData, { time: data.time, x: data.x, theta: data.theta, force: data.force, theta_dot_dot: data.theta_dot_dot }])
        setPaused(data.pause)
      })
      .catch(err => console.error(err));
  };

  useEffect(() => {
    console.log("Intervalid :", intervalId);
    fetch('http://127.0.0.1:8080/status')
      .then(res => res.json())
      .then(data => {
        setStart(value => {
          setPaused(data.pause)
          if (data.start && !data.pause) {
            intervalId = setInterval(fetchData, fetchDuration);
            console.log('Interval Started with ID:', intervalId);
          }
          return data.start
        })
      })
      .catch(err => console.error(err));
    return () => { clearInterval(intervalId) };

  }, []);

  const restartSimulation = () => {
    clearInterval(intervalId);
    setLogData([]);
    fetch('http://127.0.0.1:8080/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ "reset": true })
    })
      .then(response => {
        setLogData([]);
        intervalId = setInterval(fetchData, fetchDuration)
      })
      .catch(error => {
        console.error('Error:', error);
      });
  }
  const startStopSimulation = () => {
    fetch('http://127.0.0.1:8080/startstop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ "start": paused })
    })
      .then(response => {
        setPaused(pause => {
          if (!pause) {
            clearInterval(intervalId);
            console.log("Cleared Intervalid :", intervalId);
          } else {
            intervalId = setInterval(fetchData, fetchDuration);
            console.log('Interval Started with ID:', intervalId);
          }
          console.log("Paused status :" + !pause);
          return !pause
        });
      })
      .catch(error => {
        console.error('Error:', error);
      });
  }
  const startSimulation = () => {
    fetch('http://127.0.0.1:8080/startstop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ "start": true })
    })
      .then(response => {
        setStart(value => {
          setPaused(pause => !pause);
          intervalId = setInterval(fetchData, fetchDuration)
          console.log('Interval Started with ID:', intervalId)
          return true
        })
      })
      .catch(error => {
        console.error('Error:', error);
        alert('Error ' + error);
      });

  }

  return (
    <ThemeProvider theme={simTheme}>
      <div className="container">
        <div className="cartpendulum">
          <CartPendulum cartPosition={simData.cartPosition} pendulumAngle={simData.pendulumAngle} />
        </div>
        <div className="charts">
          {logData.length > 0 ?
            <Charts logData={logData} /> : <div>Loading chart data...</div>
          }
          <ControllerSliders />
          <div className="controls">
            {start ? <>
              <Button variant="contained" sx={{ margin: '10px' }} onClick={restartSimulation}>Restart Simulation</Button>
              <Button variant="contained" sx={{ margin: '10px' }} onClick={startStopSimulation}>{paused ? "Continue" : "Pause"}</Button> </>
              : <Button variant="contained" sx={{ margin: '10px' }} onClick={startSimulation}>Start</Button>}
          </div>
        </div>
      </div>
    </ThemeProvider>
  )
}
const simTheme = createTheme({
  palette: {
    primary: {
      main: '#2c3e50',
    },
    secondary: {
      main: '#9b59b6',
    },
    highlight: {
      main: '#ff9800', // Orange highlight
    },
    neutral: {
      main: '#f0f0f0', // Light gray
    },
    breakpoints: {
      values: {
        xs: 0,
        sm: 600,
        md: 900,
        lg: 1200,
        xl: 1536,
      }
    }
  }
});


export default App
