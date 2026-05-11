import { useState, useEffect, useCallback, useRef } from 'react';
import { getColor } from '../utils/constants';

function buildSnapshots(timeline, processes, algo) {
  if (!timeline?.length) return [];
  const totalTime = Math.max(...timeline.map(b => b.end));
  const remaining = {};
  processes.forEach(p => { remaining[p.pid] = p.burstTime; });
  const completed = new Set();
  const snaps = [];

  for (let t = 0; t <= totalTime; t++) {
    const running = timeline.find(b => b.start <= t && b.end > t);
    const runPid = running ? running.pid : null;
    const arrived = processes.filter(
      p => p.arrivalTime <= t && !completed.has(p.pid) && p.pid !== runPid && remaining[p.pid] > 0
    );

    let queue;
    if (algo === 'PRIORITY') queue = [...arrived].sort((a, b) => a.priority - b.priority);
    else if (algo === 'SJF') queue = [...arrived].sort((a, b) => remaining[a.pid] - remaining[b.pid]);
    else queue = [...arrived];

    let event = `t=${t}: `;
    event += runPid ? `P${runPid} executing (${remaining[runPid]} remaining)` : 'CPU idle';
    if (queue.length > 0) event += ` | Queue: [${queue.map(p => 'P' + p.pid).join(', ')}]`;

    snaps.push({
      time: t, runPid, queue: queue.map(p => p.pid),
      completed: [...completed], remaining: { ...remaining }, event,
    });

    if (runPid && remaining[runPid] > 0) {
      remaining[runPid]--;
      if (remaining[runPid] === 0) completed.add(runPid);
    }
  }
  return snaps;
}

export default function QueueVisualization({ timeline, processes, algorithm }) {
  const [snapshots, setSnapshots] = useState([]);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    const snaps = buildSnapshots(timeline, processes, algorithm);
    setSnapshots(snaps);
    setStep(0);
    setPlaying(false);
  }, [timeline, processes, algorithm]);

  const stopPlay = useCallback(() => {
    setPlaying(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
  }, []);

  const togglePlay = useCallback(() => {
    if (playing) { stopPlay(); return; }
    setPlaying(true);
    intervalRef.current = setInterval(() => {
      setStep(prev => {
        if (prev >= snapshots.length - 1) { stopPlay(); return prev; }
        return prev + 1;
      });
    }, 600);
  }, [playing, snapshots.length, stopPlay]);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  if (!snapshots.length) return null;
  const snap = snapshots[step] || snapshots[0];
  const queueLabel = algorithm === 'PRIORITY' ? 'Priority Queue' : 'Ready Queue';
  const recentEvents = snapshots.slice(Math.max(0, step - 5), step + 1);

  return (
    <section className="panel queue-panel">
      <div className="panel-header">
        <h2>🔄 Queue Visualization</h2>
        <div className="queue-controls">
          <button className="btn btn-sm btn-ghost" disabled={step === 0} onClick={() => setStep(s => s - 1)}>◀ Prev</button>
          <span className="queue-step-label">t = {snap.time} / {snapshots.length - 1}</span>
          <button className="btn btn-sm btn-ghost" disabled={step >= snapshots.length - 1} onClick={() => setStep(s => s + 1)}>Next ▶</button>
          <button className="btn btn-sm btn-ghost" onClick={togglePlay}>{playing ? '⏸ Pause' : '⏵ Play'}</button>
        </div>
      </div>
      <div className="queue-display">
        <div className="queue-row">
          <div className="queue-label">CPU</div>
          <div className="queue-track cpu-track">
            {snap.runPid ? (() => {
              const c = getColor(snap.runPid);
              return (
                <span className="queue-chip cpu-chip" style={{ background: c.bg, borderColor: c.border, color: c.main }}>
                  P{snap.runPid}<span className="chip-remaining">({snap.remaining[snap.runPid]})</span>
                </span>
              );
            })() : <span className="queue-empty">Idle</span>}
          </div>
        </div>
        <div className="queue-row">
          <div className="queue-label">{queueLabel}</div>
          <div className="queue-track ready-track">
            {snap.queue.length > 0 ? snap.queue.map(pid => {
              const c = getColor(pid);
              return (
                <span key={pid} className="queue-chip" style={{ background: c.bg, borderColor: c.border, color: c.main }}>
                  P{pid}<span className="chip-remaining">({snap.remaining[pid]})</span>
                </span>
              );
            }) : <span className="queue-empty">Empty</span>}
          </div>
        </div>
        <div className="queue-row">
          <div className="queue-label">Completed</div>
          <div className="queue-track completed-track">
            {snap.completed.length > 0 ? snap.completed.map(pid => {
              const c = getColor(pid);
              return (
                <span key={pid} className="queue-chip" style={{ background: c.bg, borderColor: c.border, color: c.main }}>
                  P{pid} ✓
                </span>
              );
            }) : <span className="queue-empty">None</span>}
          </div>
        </div>
      </div>
      <div className="queue-event-log">
        {recentEvents.map(s => (
          <p key={s.time} className="queue-event">
            <span className="event-time">t={s.time}</span>
            <span className="event-action">{s.event.split(': ').slice(1).join(': ')}</span>
          </p>
        ))}
      </div>
    </section>
  );
}
