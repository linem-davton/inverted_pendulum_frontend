import { Typography } from '@mui/material';
import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend } from 'recharts';


function Charts(logData) {

  const minTime = logData.logData[0].time
  const maxTime = logData.logData[logData.logData.length - 1].time


  return (
    <>
      <Typography variant="h4" gutterBottom>
        <h4>Time Series Charts</h4>
      </Typography>
      <LineChart width={600} height={300} data={logData.logData}>
        <XAxis dataKey="time" type="number" domain={[minTime, maxTime]} label={{ value: 'Time', position: 'insideBottom' }} tick={{ angle: 0, textAnchor: 'end' }} >
        </XAxis>
        <YAxis yAxisId="left" type="number" label={{ value: 'Position', position: 'insideLeft', angle: -90 }}> {/* Default Y-axis */}
        </YAxis>
        <YAxis yAxisId="right" type="number" orientation="right" label={{ value: 'theta', position: 'insideRight', angle: -90 }} /> {/* Y-axis on the right side */}
        <Tooltip />
        <Legend />
        <Line yAxisId="left" type="monotone" dataKey="x" stroke="#2c3e50" />
        <Line yAxisId="right" type="monotone" dataKey="theta" stroke="#c0392b" />
      </LineChart >
      <LineChart width={600} height={300} data={logData.logData}>
        <XAxis dataKey="time" type="number" domain={[minTime, maxTime]} label={{ value: 'Time', position: 'insideBottom' }} tick={{ angle: 0, textAnchor: 'end' }} >
        </XAxis>
        <YAxis yAxisId="left" type="number" label={{ value: 'Force', position: 'insideLeft', angle: -90 }}> {/* Default Y-axis */}
        </YAxis>
        <YAxis yAxisId="right" type="number" orientation="right" label={{ value: 'theta-acc', position: 'insideRight', angle: -90 }} /> {/* Y-axis on the right side */}
        <Tooltip />
        <Legend />
        <Line yAxisId="left" type="monotone" dataKey="force" stroke="#2c3e50" />
        <Line yAxisId="right" type="monotone" dataKey="theta_dot_dot" stroke="#c0392b" />
      </LineChart >
    </>
  );
}

export default Charts;