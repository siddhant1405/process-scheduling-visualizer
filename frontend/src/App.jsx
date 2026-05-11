import { useState, useCallback } from 'react';
import ProcessTable from './components/ProcessTable';
import GanttChart from './components/GanttChart';
import StatsGrid from './components/StatsGrid';
import QueueVisualization from './components/QueueVisualization';
import ComparisonDashboard from './components/ComparisonDashboard';
import { runSchedulerAPI, compareAlgorithmsAPI } from './hooks/api';
import { DEFAULT_PROCESSES } from './utils/constants';
import './App.css';

export default function App() {
  const [processes, setProcesses] = useState(() => DEFAULT_PROCESSES.map(p => ({ ...p })));
  const [algorithm, setAlgorithm] = useState('RR');
  const [quantum, setQuantum] = useState(2);

  const [timeline, setTimeline] = useState(null);
  const [runAlgo, setRunAlgo] = useState(null);
  const [compareData, setCompareData] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const showError = useCallback((msg) => {
    setError(msg);
    setTimeout(() => setError(null), 4000);
  }, []);

  const validateProcesses = useCallback(() => {
    if (processes.length === 0) { showError('Add at least one process.'); return false; }
    for (const p of processes) {
      if (p.burstTime <= 0) { showError(`P${p.pid} burst must be > 0.`); return false; }
    }
    return true;
  }, [processes, showError]);

  const handleUpdateProcess = (index, field, value) => {
    setProcesses(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  };

  const handleRemoveProcess = (index) => {
    if (processes.length <= 1) { showError('Need at least one process.'); return; }
    setProcesses(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddProcess = () => {
    const maxPid = processes.reduce((m, p) => Math.max(m, p.pid), 0);
    setProcesses(prev => [...prev, { pid: maxPid + 1, arrivalTime: 0, burstTime: 1, priority: 1 }]);
  };

  const handleRun = async () => {
    if (!validateProcesses()) return;
    setLoading(true);
    setCompareData(null);
    try {
      const data = await runSchedulerAPI(algorithm, quantum, processes);
      setTimeline(data.timeline);
      setRunAlgo(algorithm);
    } catch (e) {
      showError(e.message || 'Failed. Is backend running?');
    } finally {
      setLoading(false);
    }
  };

  const handleCompare = async () => {
    if (!validateProcesses()) return;
    setLoading(true);
    try {
      const data = await compareAlgorithmsAPI(quantum, processes);
      setCompareData(data);
    } catch (e) {
      showError(e.message || 'Comparison failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setProcesses(DEFAULT_PROCESSES.map(p => ({ ...p })));
    setAlgorithm('RR');
    setQuantum(2);
    setTimeline(null);
    setRunAlgo(null);
    setCompareData(null);
  };

  const isRR = algorithm === 'RR';

  return (
    <>
      <div className="bg-grid" />
      <div className="bg-glow bg-glow-1" />
      <div className="bg-glow bg-glow-2" />

      <div className="container">
        <header className="header">
          <div className="header-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="4" width="16" height="16" rx="2" />
              <rect x="9" y="9" width="6" height="6" />
              <line x1="9" y1="1" x2="9" y2="4" /><line x1="15" y1="1" x2="15" y2="4" />
              <line x1="9" y1="20" x2="9" y2="23" /><line x1="15" y1="20" x2="15" y2="23" />
              <line x1="20" y1="9" x2="23" y2="9" /><line x1="20" y1="14" x2="23" y2="14" />
              <line x1="1" y1="9" x2="4" y2="9" /><line x1="1" y1="14" x2="4" y2="14" />
            </svg>
          </div>
          <div>
            <h1>CPU Scheduling Visualizer</h1>
            <p className="subtitle">Simulate and visualize scheduling algorithms in real-time</p>
          </div>
        </header>

        {/* Controls Panel */}
        <section className="panel controls-panel">
          <div className="panel-header"><h2>⚙ Configuration</h2></div>
          <div className="controls-grid">
            <div className="control-group">
              <label htmlFor="algorithm-select">Algorithm</label>
              <div className="select-wrapper">
                <select id="algorithm-select" value={algorithm} onChange={e => setAlgorithm(e.target.value)}>
                  <option value="RR">Round Robin (RR)</option>
                  <option value="FCFS">First Come First Served</option>
                  <option value="SJF">Shortest Job First</option>
                  <option value="PRIORITY">Priority Scheduling</option>
                </select>
              </div>
            </div>
            <div className="control-group" style={{ opacity: isRR ? 1 : 0.35 }}>
              <label htmlFor="quantum-input">Time Quantum</label>
              <input type="number" id="quantum-input" value={quantum} min={1} max={20}
                disabled={!isRR} onChange={e => setQuantum(parseInt(e.target.value) || 2)} />
            </div>
          </div>

          <ProcessTable
            processes={processes} algorithm={algorithm}
            onUpdate={handleUpdateProcess} onRemove={handleRemoveProcess} onAdd={handleAddProcess}
          />

          <div className="action-bar">
            <button className="btn btn-primary btn-run" onClick={handleRun}>▶ Run Scheduler</button>
            <button className="btn btn-accent btn-run" onClick={handleCompare}>⚖ Compare All</button>
            <button className="btn btn-ghost" onClick={handleReset}>↻ Reset</button>
          </div>
        </section>

        {/* Results */}
        {timeline && (
          <section className="panel results-panel">
            <div className="panel-header">
              <h2>📊 Execution Timeline</h2>
              <span className="badge">{runAlgo}</span>
            </div>
            <GanttChart timeline={timeline} />
            <StatsGrid timeline={timeline} processes={processes} />
          </section>
        )}

        {/* Queue Visualization */}
        {timeline && (
          <QueueVisualization timeline={timeline} processes={processes} algorithm={runAlgo} />
        )}

        {/* Comparison Dashboard */}
        {compareData && (
          <ComparisonDashboard data={compareData} processes={processes} onClose={() => setCompareData(null)} />
        )}

        {/* Loading Overlay */}
        {loading && (
          <div className="loading-overlay">
            <div className="loader">
              <div className="loader-ring" />
              <p>Executing scheduler...</p>
            </div>
          </div>
        )}

        {/* Error Toast */}
        {error && (
          <div className="toast show">
            <span>{error}</span>
          </div>
        )}
      </div>

      <footer className="footer">
        <p>Built with <span className="heart">♥</span> using C++ · FastAPI · React</p>
      </footer>
    </>
  );
}
