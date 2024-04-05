import { useState, useEffect } from 'react';
import Slider from '@mui/material/Slider';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack'; ``

function ControllerSliders() {
  const [kp, setKp] = useState(0.5); // Initial Kp value
  const [ki, setKi] = useState(0.0);
  const [kd, setKd] = useState(0.05);

  const [kpRange, setKpRange] = useState([0.01, 10]);
  const [kiRange, setKiRange] = useState([0.01, 10]);
  const [kdRange, setKdRange] = useState([0.01, 10]);

  const handleSliderChange = (name, value) => {
    let min, max;
    switch (name) {
      case 'kp':
        setKp(oldvalue => {
          if (value > 0.95 * kpRange[1] || value < 2 * kpRange[0]) {
            min = Math.round((value / 5 + Number.EPSILON) * 100) / 100
            max = Math.round((value * 5 + Number.EPSILON) * 100) / 100
            setKpRange([min, max])
          }
          return Math.round((value + Number.EPSILON) * 100) / 100;

        });
        break;
      case 'ki':
        setKi(oldvalue => {
          if (value > 0.95 * kiRange[1] || value < 2 * kiRange[0]) {
            min = Math.round((value / 5 + Number.EPSILON) * 100) / 100
            max = Math.round((value * 5 + Number.EPSILON) * 100) / 100
            setKiRange([min, max])
          }
          return Math.round((value + Number.EPSILON) * 100) / 100;
        });
        break;
      case 'kd':
        setKd(oldvalue => {
          if (value > 0.95 * kdRange[1] || value < 2 * kdRange[0]) {
            min = Math.round((value / 5 + Number.EPSILON) * 100) / 100
            max = Math.round((value * 5 + Number.EPSILON) * 100) / 100
            setKdRange([min, max])
          }
          return Math.round((value + Number.EPSILON) * 100) / 100;

        });
        break;
      default: break;
    }
  };
  useEffect(() => {
    fetch('http://127.0.0.1:8080/pid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ "kp": kp, "ki": ki, "kd": kd })
    })
      .then(response => {
        console.log(response);
      })
      .catch(error => {
        console.error('Error:', error);
      });
  }, [kp, ki, kd]);

  return (
    <div className='sliders'>
      <Box sx={{
        width: 600
      }}>

        <Stack spacing={2} direction="row" sx={{ mb: 1 }} alignItems="center">
          <span>Kp: {kp}</span>
          <Slider value={kp} min={kpRange[0]} max={kpRange[1]} step={(kpRange[1] - kpRange[0]) / 100} color="secondary"
            onChange={(event, newValue) => handleSliderChange('kp', newValue)} />
          <span>{kpRange[1]}</span>
        </Stack>
        <Stack spacing={2} direction="row" sx={{ mb: 1 }} alignItems="center">
          <span>Ki: {ki}</span>
          <Slider value={ki} min={kiRange[0]} max={kiRange[1]} step={0.01} color="secondary"

            onChange={(event, newValue) => handleSliderChange('ki', newValue)} />
          <span>{kiRange[1]}</span>
        </Stack>
        <Stack spacing={2} direction="row" sx={{ mb: 1 }} alignItems="center">
          <span>Kd: {kd}</span>
          <Slider value={kd} min={kdRange[0]} max={kdRange[1]} step={0.01} color="secondary"
            onChange={(event, newValue) => handleSliderChange('kd', newValue)} />     {/* ...Similar sliders for Ki and Kd ... */}
          <span>{kdRange[1]}</span>
        </Stack>
      </Box>
    </div >

  );
}

export default ControllerSliders;
