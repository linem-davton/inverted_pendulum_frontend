import { Typography } from "@mui/material";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend } from "recharts";

const thetaColor = "hsla(30, 70%, 60%, 1)";
const forceColor = "hsla(180, 70%, 40%, 1)";
const forceAxisColor = "hsla(180, 70%, 40%, 1)";
const thetaAxisColor = "hsla(30, 70%, 60%, 1)";
const axisColor = "#f0f0f0";
function Charts(logData: any) {
  const minTime = logData.logData[0].time;
  const maxTime = logData.logData[logData.logData.length - 1].time;

  return (
    <>
      <Typography variant="h5" gutterBottom>
        <h5>Time Series Charts</h5>
      </Typography>
      <LineChart width={900} height={300} data={logData.logData}>
        <XAxis
          dataKey="time"
          type="number"
          domain={[minTime, maxTime]}
          label={{ value: "Time", position: "insideBottom", fill: axisColor }}
          stroke={axisColor}
        ></XAxis>
        <YAxis
          yAxisId="left"
          type="number"
          label={{
            value: "Position",
            position: "insideLeft",
            angle: -90,
            fill: forceAxisColor,
          }}
          stroke={forceAxisColor}
        >
          {" "}
          {/* Default Y-axis */}
        </YAxis>
        <YAxis
          yAxisId="right"
          type="number"
          orientation="right"
          label={{
            value: "theta",
            position: "insideRight",
            angle: -90,
            fill: thetaAxisColor,
          }}
          stroke={thetaAxisColor}
        />{" "}
        {/* Y-axis on the right side */}
        <Tooltip />
        <Legend />
        <Line yAxisId="left" type="monotone" dataKey="x" stroke={forceColor} />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="theta"
          stroke={thetaColor}
        />
      </LineChart>
      <LineChart width={900} height={300} data={logData.logData}>
        <XAxis
          dataKey="time"
          type="number"
          domain={[minTime, maxTime]}
          label={{ value: "Time", position: "insideBottom", fill: axisColor }}
          stroke={axisColor}
        ></XAxis>
        <YAxis
          yAxisId="left"
          type="number"
          label={{
            value: "Force",
            position: "insideLeft",
            angle: -90,
            fill: forceAxisColor,
          }}
          stroke={forceAxisColor}
        >
          {" "}
          {/* Default Y-axis */}
        </YAxis>
        <YAxis
          yAxisId="right"
          type="number"
          orientation="right"
          label={{
            value: "theta",
            position: "insideRight",
            angle: -90,
            fill: thetaAxisColor,
          }}
          stroke={thetaAxisColor}
        />{" "}
        {/* Y-axis on the right side */}
        <Tooltip />
        <Legend />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="force"
          stroke={forceColor}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="theta"
          stroke={thetaColor}
        />
      </LineChart>
    </>
  );
}

export default Charts;
