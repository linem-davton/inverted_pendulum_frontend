# Inverted Pendulum Frontend

This project is a React-based frontend for controlling an inverted pendulum simulation. It communicates with a backend server whose configuration is defined in `config.json`.

## Features

- **Start Simulation**: Allows starting the simulation in the backend server.
- **Restart Simulation:** Allows restarting the simulation.
- **Pause/Continue:** Enables pausing or continuing the simulation as needed.
- **Reset Parameters:** Resets the parameters of the simulation.

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
