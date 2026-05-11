/**
 * Compute scheduling metrics from a timeline and process list.
 */
export function computeMetrics(timeline, procList) {
  const totalTime = Math.max(...timeline.map(b => b.end));
  const busyTime = timeline.reduce((s, b) => s + (b.end - b.start), 0);
  const cpuUtil = (busyTime / totalTime) * 100;

  const pm = {};
  procList.forEach(p => {
    pm[p.pid] = { at: p.arrivalTime, bt: p.burstTime, ct: 0 };
  });
  timeline.forEach(b => {
    if (pm[b.pid]) pm[b.pid].ct = Math.max(pm[b.pid].ct, b.end);
  });

  let tTAT = 0, tWT = 0, cnt = 0;
  Object.values(pm).forEach(p => {
    if (p.ct > 0) {
      const tat = p.ct - p.at;
      tTAT += tat;
      tWT += tat - p.bt;
      cnt++;
    }
  });

  return {
    totalTime,
    cpuUtil: cpuUtil.toFixed(1),
    avgTAT: cnt ? (tTAT / cnt).toFixed(2) : '0',
    avgWT: cnt ? (tWT / cnt).toFixed(2) : '0',
  };
}

/**
 * Build process query string for the API.
 */
export function buildProcessStr(processes) {
  return processes
    .map(p => `${p.pid},${p.arrivalTime},${p.burstTime},${p.priority}`)
    .join(';');
}
