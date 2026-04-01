export type ServerTarget = "local" | "remote";

export interface SimData {
  time: number;
  cartPosition: number;
  pendulumAngle: number;
}

export interface LogEntry {
  time: number;
  x: number;
  theta: number;
  force: number;
  theta_dot_dot: number;
  ref: number;
}

export interface SimulationSample extends LogEntry {
  x_dot: number;
  theta_dot: number;
  x_dot_dot: number;
  energy: number;
  pause: boolean;
}

export interface SimulationStatus {
  pause: boolean;
  start: boolean;
}

export interface PidConfig {
  kp: number;
  ki: number;
  kd: number;
}

export interface DisturbanceConfig {
  ref: number;
  delay: number;
  jitter: number;
}

export interface ControllerState extends PidConfig, DisturbanceConfig {}
