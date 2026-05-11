import { computeMetrics } from '../utils/metrics';

export default function StatsGrid({ timeline, processes }) {
  if (!timeline?.length) return null;
  const m = computeMetrics(timeline, processes);

  const stats = [
    { label: 'Total Time', value: m.totalTime, unit: 'units' },
    { label: 'CPU Utilization', value: m.cpuUtil, unit: '%' },
    { label: 'Avg Turnaround', value: m.avgTAT, unit: 'units' },
    { label: 'Avg Waiting', value: m.avgWT, unit: 'units' },
  ];

  return (
    <div className="stats-grid">
      {stats.map((s, i) => (
        <div
          key={s.label}
          className="stat-card"
          style={{ animation: `fadeSlideUp 0.4s ease-out ${i * 80}ms forwards`, opacity: 0 }}
        >
          <div className="stat-label">{s.label}</div>
          <div className="stat-value">
            {s.value}
            <span style={{ fontSize: '0.7rem', opacity: 0.6, marginLeft: '2px' }}>{s.unit}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
