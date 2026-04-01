# Inverted Pendulum Frontend

This project is a React-based frontend for controlling an inverted pendulum simulation. It communicates with a backend server whose configuration is defined in `config.json`.

## Features

- **Start Simulation**: Allows starting the simulation in the backend server.
- **Restart Simulation:** Allows restarting the simulation.
- **Pause/Continue:** Enables pausing or continuing the simulation as needed.
- **Reset Parameters:** Resets the parameters of the simulation.

## Telemetry Charts

The operator view exposes two live charts:

- **Force Response vs Angle**: plots commanded force and pendulum angle against time.
- **Error vs Time**: plots tracking error against time, where `error = reference angle - measured pendulum angle`.

The response annotations on the `Error vs Time` chart use the latest detected reference step and are defined as follows:

- **Overshoot**: the largest error excursion after the response crosses past the target. The displayed overshoot percentage is computed as `abs(overshoot error) / initial step error * 100`, so it is normalized by the initial error magnitude rather than by the reference value.
- **Rise time**: the time for the absolute error to fall from `90%` to `10%` of the initial step error.
- **Settling time**: the first time the absolute error enters and then stays within a `+-2%` band of the initial step error magnitude.

These metrics are computed from the frontend telemetry buffer, so their time resolution depends on the current polling interval.

## Getting Started

## Prerequisites

- Node.js installed on your machine

## Release Version

Release 1.0 can be downloaded from the [releases page](https://github.com/linem-davton/inverted_pendulum_frontend/releases/tag/v1.0.0).
The release includes a pre-built version of the frontend.
To use the frontend, simply extract the contents of the release archive and run a web server, e.g 

```BASH
npm install serve
serve
# or npm run dev
```

Make sure the backend server is running as well.

### Development

1. Clone this repository.
2. Navigate to the project directory.
3. Install dependencies using npm:

```bash
npm install

```

4. Ensure the backend server defined in `config.json` is running.
5. Start the development server:

```BASH
npm run dev
```

## License

This project is licensed under the [MIT License](LICENSE).
