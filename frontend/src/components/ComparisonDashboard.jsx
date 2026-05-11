import { getColor, ALGO_NAMES, MINI_SCALE } from '../utils/constants';
import { computeMetrics } from '../utils/metrics';

function generateInsights(metrics, bestWT, bestTAT, bestUtil, winner) {
  const lines = [];
  const wm = metrics[winner];

  lines.push(`**${ALGO_NAMES[winner]}** achieves the **lowest average waiting time** (${wm.avgWT} units), making it the most responsive algorithm for this workload.`);

  if (bestTAT !== bestWT) {
    lines.push(`**${ALGO_NAMES[bestTAT]}** delivers the best **turnaround time** (${metrics[bestTAT].avgTAT} units), meaning processes complete faster overall with this algorithm.`);
  }

  if (metrics.RR && metrics.FCFS) {
    const rrWT = parseFloat(metrics.RR.avgWT), fcfsWT = parseFloat(metrics.FCFS.avgWT);
    if (rrWT < fcfsWT) {
      lines.push(`**Round Robin** reduces waiting time by **${(fcfsWT - rrWT).toFixed(2)} units** compared to FCFS due to time-sharing, which prevents long processes from blocking short ones.`);
    } else if (fcfsWT < rrWT) {
      lines.push(`**FCFS** outperforms Round Robin here because process burst times are relatively uniform, so the overhead of context switching in RR provides no benefit.`);
    }
  }

  if (metrics.SJF) {
    lines.push(`**SJF** is theoretically optimal for minimizing average waiting time in non-preemptive scheduling. ${bestWT === 'SJF' ? 'This is confirmed by the results.' : 'However, in preemptive scenarios or with specific arrival patterns, other algorithms may match or beat it.'}`);
  }

  if (metrics.PRIORITY) {
    const pWT = parseFloat(metrics.PRIORITY.avgWT);
    const sjfWT = metrics.SJF ? parseFloat(metrics.SJF.avgWT) : null;
    if (sjfWT !== null && pWT > sjfWT) {
      lines.push(`**Priority Scheduling** has higher waiting time (${metrics.PRIORITY.avgWT}) than SJF (${metrics.SJF.avgWT}) because priority values don't always correlate with burst time.`);
    }
  }

  const utils = Object.entries(metrics).map(([, m]) => parseFloat(m.cpuUtil));
  if (utils.every(u => u === utils[0])) {
    lines.push(`All algorithms achieve **${metrics[winner].cpuUtil}% CPU utilization** — this is expected since all processes are CPU-bound with no I/O waits in this simulation.`);
  }

  return lines;
}

export default function ComparisonDashboard({ data, processes, onClose }) {
  if (!data) return null;

  const algos = ['RR', 'FCFS', 'SJF', 'PRIORITY'];
  const metrics = {};
  algos.forEach(a => { if (data[a]) metrics[a] = computeMetrics(data[a].timeline, processes); });

  const bestWT = algos.reduce((best, a) => metrics[a] && parseFloat(metrics[a].avgWT) < parseFloat(metrics[best]?.avgWT ?? 999) ? a : best, algos[0]);
  const bestTAT = algos.reduce((best, a) => metrics[a] && parseFloat(metrics[a].avgTAT) < parseFloat(metrics[best]?.avgTAT ?? 999) ? a : best, algos[0]);
  const bestUtil = algos.reduce((best, a) => metrics[a] && parseFloat(metrics[a].cpuUtil) > parseFloat(metrics[best]?.cpuUtil ?? 0) ? a : best, algos[0]);
  const overallWinner = bestWT;

  const insights = generateInsights(metrics, bestWT, bestTAT, bestUtil, overallWinner);

  return (
    <section className="panel compare-panel">
      <div className="panel-header">
        <h2>⚖ Algorithm Comparison</h2>
        <button className="btn btn-sm btn-ghost" onClick={onClose}>✕ Close</button>
      </div>

      {/* Mini Gantt charts */}
      <div className="compare-timelines">
        {algos.map(algo => {
          if (!data[algo]) return null;
          const tl = data[algo].timeline;
          const isWinner = algo === overallWinner;
          return (
            <div key={algo} className={`compare-timeline-card${isWinner ? ' winner-card' : ''}`}>
              <div className="compare-card-header">
                <span className="compare-algo-name">{ALGO_NAMES[algo]}</span>
                {isWinner && <span className="winner-badge">★ Best WT</span>}
              </div>
              <div className="compare-mini-gantt">
                {tl.map((b, i) => {
                  const c = getColor(b.pid);
                  const w = (b.end - b.start) * MINI_SCALE;
                  return (
                    <div key={i} className="mini-gantt-block" style={{
                      width: `${w}px`, minWidth: `${w}px`,
                      background: `linear-gradient(135deg,${c.bg},${c.border})`,
                      color: c.main,
                    }}>P{b.pid}</div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Metrics Table */}
      <div className="compare-table-section">
        <h3 className="section-title">📈 Metrics Comparison</h3>
        <div className="table-wrapper">
          <table className="compare-table">
            <thead>
              <tr>
                <th>Algorithm</th>
                <th>Avg Waiting Time</th>
                <th>Avg Turnaround</th>
                <th>CPU Utilization</th>
                <th>Total Time</th>
              </tr>
            </thead>
            <tbody>
              {algos.map(algo => {
                if (!metrics[algo]) return null;
                const m = metrics[algo];
                const isWinner = algo === overallWinner;
                return (
                  <tr key={algo} className={isWinner ? 'winner-row' : ''}>
                    <td><strong>{ALGO_NAMES[algo]}</strong></td>
                    <td className={algo === bestWT ? 'best-value' : ''}>{m.avgWT}</td>
                    <td className={algo === bestTAT ? 'best-value' : ''}>{m.avgTAT}</td>
                    <td className={algo === bestUtil ? 'best-value' : ''}>{m.cpuUtil}%</td>
                    <td>{m.totalTime}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Insights */}
      <div className="insight-box">
        <div className="insight-header">
          <span className="insight-icon">💡</span>
          <h3>Analysis & Insights</h3>
        </div>
        <div className="insight-content">
          {insights.map((line, i) => (
            <p key={i} dangerouslySetInnerHTML={{
              __html: line.replace(/\*\*(.+?)\*\*/g, '<strong class="insight-highlight">$1</strong>')
            }} />
          ))}
        </div>
      </div>
    </section>
  );
}
