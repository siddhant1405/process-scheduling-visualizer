import { API_BASE } from '../utils/constants';
import { buildProcessStr } from '../utils/metrics';

/**
 * Run a single scheduling algorithm via the backend API.
 */
export async function runSchedulerAPI(algorithm, quantum, processes) {
  const params = new URLSearchParams({
    algorithm,
    quantum: String(quantum),
    processes: buildProcessStr(processes),
  });

  const res = await fetch(`${API_BASE}/run?${params}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail?.error || body.detail || `Server ${res.status}`);
  }

  const data = await res.json();
  if (!data.timeline?.length) throw new Error('Empty timeline.');
  return data;
}

/**
 * Run all 4 algorithms for comparison.
 */
export async function compareAlgorithmsAPI(quantum, processes) {
  const params = new URLSearchParams({
    quantum: String(quantum),
    processes: buildProcessStr(processes),
  });

  const res = await fetch(`${API_BASE}/compare?${params}`);
  if (!res.ok) throw new Error('Compare failed');
  return res.json();
}
