/**
 * Shared constants for the CPU Scheduling Visualizer
 */

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const SCALE_FACTOR = 48;
export const MINI_SCALE = 20;

export const PROCESS_COLORS = [
  { main: '#6366f1', bg: 'rgba(99,102,241,0.18)', border: 'rgba(99,102,241,0.4)' },
  { main: '#06b6d4', bg: 'rgba(6,182,212,0.18)',  border: 'rgba(6,182,212,0.4)' },
  { main: '#f59e0b', bg: 'rgba(245,158,11,0.18)', border: 'rgba(245,158,11,0.4)' },
  { main: '#f43f5e', bg: 'rgba(244,63,94,0.18)',  border: 'rgba(244,63,94,0.4)' },
  { main: '#10b981', bg: 'rgba(16,185,129,0.18)', border: 'rgba(16,185,129,0.4)' },
  { main: '#8b5cf6', bg: 'rgba(139,92,246,0.18)', border: 'rgba(139,92,246,0.4)' },
  { main: '#ec4899', bg: 'rgba(236,72,153,0.18)', border: 'rgba(236,72,153,0.4)' },
  { main: '#14b8a6', bg: 'rgba(20,184,166,0.18)', border: 'rgba(20,184,166,0.4)' },
];

export const ALGO_NAMES = {
  RR: 'Round Robin',
  FCFS: 'FCFS',
  SJF: 'SJF',
  PRIORITY: 'Priority',
};

export const DEFAULT_PROCESSES = [
  { pid: 1, arrivalTime: 0, burstTime: 5, priority: 3 },
  { pid: 2, arrivalTime: 1, burstTime: 3, priority: 1 },
  { pid: 3, arrivalTime: 2, burstTime: 8, priority: 4 },
  { pid: 4, arrivalTime: 3, burstTime: 6, priority: 2 },
];

export function getColor(pid) {
  return PROCESS_COLORS[(pid - 1) % PROCESS_COLORS.length];
}
