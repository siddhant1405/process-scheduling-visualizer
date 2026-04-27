/**
 * CPU Scheduling Visualizer — Frontend Logic
 * Features: Gantt chart, Queue visualization, Algorithm comparison
 */

const API_BASE = 'http://localhost:3000';
const SCALE_FACTOR = 48;
const MINI_SCALE = 20;
const PROCESS_COLORS = [
    { main: '#6366f1', bg: 'rgba(99,102,241,0.18)', border: 'rgba(99,102,241,0.4)' },
    { main: '#06b6d4', bg: 'rgba(6,182,212,0.18)',  border: 'rgba(6,182,212,0.4)' },
    { main: '#f59e0b', bg: 'rgba(245,158,11,0.18)', border: 'rgba(245,158,11,0.4)' },
    { main: '#f43f5e', bg: 'rgba(244,63,94,0.18)',  border: 'rgba(244,63,94,0.4)' },
    { main: '#10b981', bg: 'rgba(16,185,129,0.18)', border: 'rgba(16,185,129,0.4)' },
    { main: '#8b5cf6', bg: 'rgba(139,92,246,0.18)', border: 'rgba(139,92,246,0.4)' },
    { main: '#ec4899', bg: 'rgba(236,72,153,0.18)', border: 'rgba(236,72,153,0.4)' },
    { main: '#14b8a6', bg: 'rgba(20,184,166,0.18)', border: 'rgba(20,184,166,0.4)' },
];
const ALGO_NAMES = { RR: 'Round Robin', FCFS: 'FCFS', SJF: 'SJF', PRIORITY: 'Priority' };

// ─── DOM ──────────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const algorithmSelect = $('algorithm-select'), quantumInput = $('quantum-input');
const quantumGroup = $('quantum-group'), processTbody = $('process-tbody');
const runBtn = $('run-btn'), resetBtn = $('reset-btn'), compareBtn = $('compare-btn');
const resultsPanel = $('results-panel'), ganttChart = $('gantt-chart');
const ganttTimeline = $('gantt-timeline'), statsGrid = $('stats-grid');
const algorithmBadge = $('algorithm-badge'), loadingOverlay = $('loading-overlay');
const errorToast = $('error-toast'), errorMessage = $('error-message');
// Queue DOM
const queuePanel = $('queue-panel'), cpuTrack = $('cpu-track');
const readyTrack = $('ready-track'), completedTrack = $('completed-track');
const queueStepLabel = $('queue-step-label'), queueEventLog = $('queue-event-log');
const queuePrevBtn = $('queue-prev-btn'), queueNextBtn = $('queue-next-btn');
const queuePlayBtn = $('queue-play-btn'), queueTypeLabel = $('queue-type-label');
// Compare DOM
const comparePanel = $('compare-panel'), compareTimelines = $('compare-timelines');
const compareTbody = $('compare-tbody'), insightContent = $('insight-content');
const closeCompareBtn = $('close-compare-btn');

// ─── State ────────────────────────────────────────────────────────────────────
let processes = [
    { pid: 1, arrivalTime: 0, burstTime: 5, priority: 3 },
    { pid: 2, arrivalTime: 1, burstTime: 3, priority: 1 },
    { pid: 3, arrivalTime: 2, burstTime: 8, priority: 4 },
    { pid: 4, arrivalTime: 3, burstTime: 6, priority: 2 },
];
let queueSnapshots = [];
let currentStep = 0;
let playInterval = null;

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    renderProcessTable();
    algorithmSelect.addEventListener('change', () => { updateQuantumVis(); updatePriorityVis(); });
    $('add-process-btn').addEventListener('click', addProcess);
    runBtn.addEventListener('click', runScheduler);
    resetBtn.addEventListener('click', resetAll);
    compareBtn.addEventListener('click', runComparison);
    queuePrevBtn.addEventListener('click', () => stepQueue(-1));
    queueNextBtn.addEventListener('click', () => stepQueue(1));
    queuePlayBtn.addEventListener('click', togglePlay);
    closeCompareBtn.addEventListener('click', () => comparePanel.classList.add('hidden'));
    updateQuantumVis();
    updatePriorityVis();
});

function getColor(pid) { return PROCESS_COLORS[(pid - 1) % PROCESS_COLORS.length]; }
function updateQuantumVis() {
    const isRR = algorithmSelect.value === 'RR';
    quantumGroup.style.opacity = isRR ? '1' : '0.35';
    quantumInput.disabled = !isRR;
}
function updatePriorityVis() {
    const show = algorithmSelect.value === 'PRIORITY';
    document.querySelectorAll('.priority-col').forEach(el => el.classList.toggle('hidden-col', !show));
}

// ─── Process Table ────────────────────────────────────────────────────────────
function renderProcessTable() {
    processTbody.innerHTML = '';
    processes.forEach((proc, i) => {
        const c = getColor(proc.pid);
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><span class="pid-label"><span class="pid-dot" style="background:${c.main}"></span>P${proc.pid}</span></td>
            <td><input type="number" min="0" max="100" value="${proc.arrivalTime}" data-index="${i}" data-field="arrivalTime"></td>
            <td><input type="number" min="1" max="100" value="${proc.burstTime}" data-index="${i}" data-field="burstTime"></td>
            <td class="priority-col"><input type="number" min="1" max="100" value="${proc.priority}" data-index="${i}" data-field="priority"></td>
            <td><button class="btn btn-danger btn-sm" data-index="${i}">✕</button></td>`;
        processTbody.appendChild(row);
    });
    processTbody.querySelectorAll('input[type="number"]').forEach(inp => {
        inp.addEventListener('change', e => {
            processes[parseInt(e.target.dataset.index)][e.target.dataset.field] = parseInt(e.target.value) || 0;
        });
    });
    processTbody.querySelectorAll('.btn-danger').forEach(btn => {
        btn.addEventListener('click', e => removeProcess(parseInt(e.currentTarget.dataset.index)));
    });
    updatePriorityVis();
}
function addProcess() {
    const maxPid = processes.reduce((m, p) => Math.max(m, p.pid), 0);
    processes.push({ pid: maxPid + 1, arrivalTime: 0, burstTime: 1, priority: 1 });
    renderProcessTable();
}
function removeProcess(i) {
    if (processes.length <= 1) { showError('Need at least one process.'); return; }
    processes.splice(i, 1);
    renderProcessTable();
}

// ─── Build process string ─────────────────────────────────────────────────────
function buildProcessStr() {
    return processes.map(p => `${p.pid},${p.arrivalTime},${p.burstTime},${p.priority}`).join(';');
}
function validateProcesses() {
    if (processes.length === 0) { showError('Add at least one process.'); return false; }
    for (const p of processes) { if (p.burstTime <= 0) { showError(`P${p.pid} burst must be > 0.`); return false; } }
    return true;
}

// ─── Compute metrics from timeline ────────────────────────────────────────────
function computeMetrics(timeline, procList) {
    const totalTime = Math.max(...timeline.map(b => b.end));
    const busyTime = timeline.reduce((s, b) => s + (b.end - b.start), 0);
    const cpuUtil = ((busyTime / totalTime) * 100);
    const pm = {};
    procList.forEach(p => { pm[p.pid] = { at: p.arrivalTime, bt: p.burstTime, ct: 0 }; });
    timeline.forEach(b => { if (pm[b.pid]) pm[b.pid].ct = Math.max(pm[b.pid].ct, b.end); });
    let tTAT = 0, tWT = 0, cnt = 0;
    Object.values(pm).forEach(p => {
        if (p.ct > 0) { const tat = p.ct - p.at; tTAT += tat; tWT += tat - p.bt; cnt++; }
    });
    return {
        totalTime, cpuUtil: cpuUtil.toFixed(1),
        avgTAT: cnt ? (tTAT / cnt).toFixed(2) : '0',
        avgWT: cnt ? (tWT / cnt).toFixed(2) : '0'
    };
}

// ─── Run Scheduler ────────────────────────────────────────────────────────────
async function runScheduler() {
    if (!validateProcesses()) return;
    const algo = algorithmSelect.value, q = parseInt(quantumInput.value) || 2;
    const url = `${API_BASE}/run?algorithm=${algo}&quantum=${q}&processes=${encodeURIComponent(buildProcessStr())}`;
    showLoading(true); hideResults();
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Server ${res.status}`);
        const data = await res.json();
        if (!data.timeline?.length) throw new Error('Empty timeline.');
        renderGanttChart(data.timeline, algo);
        renderStats(data.timeline, algo, q);
        buildQueueSnapshots(data.timeline, algo, q);
        showResults(algo);
    } catch (e) { showError(e.message || 'Failed. Is backend running?'); }
    finally { showLoading(false); }
}

// ─── Gantt Chart ──────────────────────────────────────────────────────────────
function renderGanttChart(timeline, algo) {
    ganttChart.innerHTML = ''; ganttTimeline.innerHTML = '';
    if (!timeline?.length) return;
    const totalTime = Math.max(...timeline.map(b => b.end));
    timeline.forEach((block, i) => {
        const c = getColor(block.pid), dur = block.end - block.start, w = dur * SCALE_FACTOR;
        const el = document.createElement('div');
        el.className = 'gantt-block';
        el.style.cssText = `width:${w}px;min-width:${w}px;background:linear-gradient(135deg,${c.bg},${c.border});border-color:${c.border};color:${c.main};animation-delay:${i*100}ms`;
        el.title = `P${block.pid} | ${block.start}→${block.end} (${dur})`;
        el.innerHTML = `<span class="block-label">P${block.pid}</span>`;
        requestAnimationFrame(() => el.classList.add('animate-in'));
        ganttChart.appendChild(el);
    });
    const pts = new Set(); timeline.forEach(b => { pts.add(b.start); pts.add(b.end); });
    const sorted = [...pts].sort((a,b) => a - b);
    const tw = totalTime * SCALE_FACTOR + (timeline.length - 1) * 2;
    ganttTimeline.style.width = `${tw}px`; ganttTimeline.style.position = 'relative';
    sorted.forEach(t => {
        let px = 0;
        for (let i = 0; i < timeline.length; i++) {
            if (t <= timeline[i].end) { px = blockStartPx(timeline, i) + (t - timeline[i].start) * SCALE_FACTOR; break; }
        }
        if (t === timeline[timeline.length-1].end) { const li = timeline.length-1; px = blockStartPx(timeline,li)+(timeline[li].end-timeline[li].start)*SCALE_FACTOR; }
        const m = document.createElement('span');
        m.className = 'gantt-marker'; m.textContent = t; m.style.left = `${px}px`;
        ganttTimeline.appendChild(m);
    });
}
function blockStartPx(tl, idx) {
    let px = 0; for (let i = 0; i < idx; i++) px += (tl[i].end - tl[i].start) * SCALE_FACTOR + 2; return px;
}

// ─── Stats ────────────────────────────────────────────────────────────────────
function renderStats(timeline, algo, q) {
    statsGrid.innerHTML = '';
    const m = computeMetrics(timeline, processes);
    [{ l:'Total Time', v: m.totalTime, u:'units' }, { l:'CPU Utilization', v: m.cpuUtil, u:'%' },
     { l:'Avg Turnaround', v: m.avgTAT, u:'units' }, { l:'Avg Waiting', v: m.avgWT, u:'units' }
    ].forEach((s, i) => {
        const card = document.createElement('div');
        card.className = 'stat-card';
        card.style.cssText = `animation:fadeSlideUp 0.4s ease-out ${i*80}ms forwards;opacity:0`;
        card.innerHTML = `<div class="stat-label">${s.l}</div><div class="stat-value">${s.v}<span style="font-size:0.7rem;opacity:0.6;margin-left:2px">${s.u}</span></div>`;
        statsGrid.appendChild(card);
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUEUE VISUALIZATION
// ═══════════════════════════════════════════════════════════════════════════════
function buildQueueSnapshots(timeline, algo, quantum) {
    queueSnapshots = []; currentStep = 0; stopPlay();
    if (!timeline?.length) return;
    const totalTime = Math.max(...timeline.map(b => b.end));
    // Build per-time-unit state
    const remaining = {}; processes.forEach(p => { remaining[p.pid] = p.burstTime; });
    const completed = new Set();
    for (let t = 0; t <= totalTime; t++) {
        const running = timeline.find(b => b.start <= t && b.end > t);
        const runPid = running ? running.pid : null;
        // Determine ready queue: arrived, not completed, not currently running, has remaining time
        const arrived = processes.filter(p => p.arrivalTime <= t && !completed.has(p.pid) && p.pid !== runPid && remaining[p.pid] > 0);
        // Order queue by algorithm type
        let queue;
        if (algo === 'PRIORITY') {
            queue = [...arrived].sort((a, b) => a.priority - b.priority);
        } else if (algo === 'SJF') {
            queue = [...arrived].sort((a, b) => remaining[a.pid] - remaining[b.pid]);
        } else {
            queue = [...arrived]; // FIFO for RR/FCFS
        }
        // Build event description
        let event = `t=${t}: `;
        if (runPid) {
            event += `P${runPid} executing (${remaining[runPid]} remaining)`;
        } else {
            event += 'CPU idle';
        }
        if (queue.length > 0) event += ` | Queue: [${queue.map(p => 'P' + p.pid).join(', ')}]`;
        const snap = {
            time: t, runPid, queue: queue.map(p => p.pid),
            completed: [...completed], remaining: { ...remaining }, event
        };
        queueSnapshots.push(snap);
        // Update remaining after this time unit
        if (runPid && remaining[runPid] > 0) {
            remaining[runPid]--;
            if (remaining[runPid] === 0) completed.add(runPid);
        }
    }
    queuePanel.classList.remove('hidden');
    queueTypeLabel.textContent = algo === 'PRIORITY' ? 'Priority Queue' : 'Ready Queue';
    renderQueueStep(0);
}

function renderQueueStep(step) {
    if (step < 0 || step >= queueSnapshots.length) return;
    currentStep = step;
    const snap = queueSnapshots[step];
    queueStepLabel.textContent = `t = ${snap.time} / ${queueSnapshots.length - 1}`;
    queuePrevBtn.disabled = step === 0;
    queueNextBtn.disabled = step >= queueSnapshots.length - 1;
    // CPU track
    if (snap.runPid) {
        const c = getColor(snap.runPid);
        const rem = snap.remaining[snap.runPid];
        cpuTrack.innerHTML = `<span class="queue-chip cpu-chip" style="background:${c.bg};border-color:${c.border};color:${c.main}">P${snap.runPid}<span class="chip-remaining">(${rem})</span></span>`;
    } else {
        cpuTrack.innerHTML = '<span class="queue-empty">Idle</span>';
    }
    // Ready queue
    if (snap.queue.length > 0) {
        readyTrack.innerHTML = snap.queue.map(pid => {
            const c = getColor(pid);
            return `<span class="queue-chip" style="background:${c.bg};border-color:${c.border};color:${c.main}">P${pid}<span class="chip-remaining">(${snap.remaining[pid]})</span></span>`;
        }).join('');
    } else {
        readyTrack.innerHTML = '<span class="queue-empty">Empty</span>';
    }
    // Completed
    if (snap.completed.length > 0) {
        completedTrack.innerHTML = snap.completed.map(pid => {
            const c = getColor(pid);
            return `<span class="queue-chip" style="background:${c.bg};border-color:${c.border};color:${c.main}">P${pid} ✓</span>`;
        }).join('');
    } else {
        completedTrack.innerHTML = '<span class="queue-empty">None</span>';
    }
    // Event log — show recent events
    const start = Math.max(0, step - 5);
    const events = queueSnapshots.slice(start, step + 1);
    queueEventLog.innerHTML = events.map(s =>
        `<p class="queue-event"><span class="event-time">t=${s.time}</span><span class="event-action">${s.event.split(': ').slice(1).join(': ')}</span></p>`
    ).join('');
    queueEventLog.scrollTop = queueEventLog.scrollHeight;
}

function stepQueue(dir) { renderQueueStep(currentStep + dir); }
function togglePlay() {
    if (playInterval) { stopPlay(); return; }
    queuePlayBtn.textContent = '⏸ Pause';
    playInterval = setInterval(() => {
        if (currentStep >= queueSnapshots.length - 1) { stopPlay(); return; }
        stepQueue(1);
    }, 600);
}
function stopPlay() {
    if (playInterval) clearInterval(playInterval);
    playInterval = null;
    queuePlayBtn.textContent = '⏵ Play';
}

// ═══════════════════════════════════════════════════════════════════════════════
// ALGORITHM COMPARISON DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
async function runComparison() {
    if (!validateProcesses()) return;
    const q = parseInt(quantumInput.value) || 2;
    const url = `${API_BASE}/compare?quantum=${q}&processes=${encodeURIComponent(buildProcessStr())}`;
    showLoading(true);
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('Compare failed');
        const data = await res.json();
        renderComparison(data, q);
    } catch (e) { showError(e.message); }
    finally { showLoading(false); }
}

function renderComparison(data, quantum) {
    const algos = ['RR', 'FCFS', 'SJF', 'PRIORITY'];
    const metrics = {};
    algos.forEach(a => { if (data[a]) metrics[a] = computeMetrics(data[a].timeline, processes); });

    // Find best for each metric
    const bestWT = algos.reduce((best, a) => metrics[a] && parseFloat(metrics[a].avgWT) < parseFloat(metrics[best]?.avgWT ?? 999) ? a : best, algos[0]);
    const bestTAT = algos.reduce((best, a) => metrics[a] && parseFloat(metrics[a].avgTAT) < parseFloat(metrics[best]?.avgTAT ?? 999) ? a : best, algos[0]);
    const bestUtil = algos.reduce((best, a) => metrics[a] && parseFloat(metrics[a].cpuUtil) > parseFloat(metrics[best]?.cpuUtil ?? 0) ? a : best, algos[0]);

    // Overall winner = best avg WT
    const overallWinner = bestWT;

    // Render mini Gantt charts
    compareTimelines.innerHTML = '';
    algos.forEach(algo => {
        if (!data[algo]) return;
        const tl = data[algo].timeline;
        const totalTime = Math.max(...tl.map(b => b.end));
        const card = document.createElement('div');
        card.className = `compare-timeline-card${algo === overallWinner ? ' winner-card' : ''}`;
        let header = `<div class="compare-card-header"><span class="compare-algo-name">${ALGO_NAMES[algo]}</span>`;
        if (algo === overallWinner) header += '<span class="winner-badge">★ Best WT</span>';
        header += '</div>';
        const blocks = tl.map(b => {
            const c = getColor(b.pid), w = (b.end - b.start) * MINI_SCALE;
            return `<div class="mini-gantt-block" style="width:${w}px;min-width:${w}px;background:linear-gradient(135deg,${c.bg},${c.border});color:${c.main}">P${b.pid}</div>`;
        }).join('');
        card.innerHTML = `${header}<div class="compare-mini-gantt">${blocks}</div>`;
        compareTimelines.appendChild(card);
    });

    // Render comparison table
    compareTbody.innerHTML = '';
    algos.forEach(algo => {
        if (!metrics[algo]) return;
        const m = metrics[algo];
        const isWinner = algo === overallWinner;
        const row = document.createElement('tr');
        if (isWinner) row.className = 'winner-row';
        row.innerHTML = `
            <td><strong>${ALGO_NAMES[algo]}</strong></td>
            <td class="${algo === bestWT ? 'best-value' : ''}">${m.avgWT}</td>
            <td class="${algo === bestTAT ? 'best-value' : ''}">${m.avgTAT}</td>
            <td class="${algo === bestUtil ? 'best-value' : ''}">${m.cpuUtil}%</td>
            <td>${m.totalTime}</td>`;
        compareTbody.appendChild(row);
    });

    // Generate insights
    generateInsights(metrics, bestWT, bestTAT, bestUtil, overallWinner);
    comparePanel.classList.remove('hidden');
    comparePanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function generateInsights(metrics, bestWT, bestTAT, bestUtil, winner) {
    const lines = [];
    const wm = metrics[winner];

    lines.push(`<p><strong class="insight-highlight">${ALGO_NAMES[winner]}</strong> achieves the <strong>lowest average waiting time</strong> (${wm.avgWT} units), making it the most responsive algorithm for this workload.</p>`);

    if (bestTAT !== bestWT) {
        lines.push(`<p><strong>${ALGO_NAMES[bestTAT]}</strong> delivers the best <strong>turnaround time</strong> (${metrics[bestTAT].avgTAT} units), meaning processes complete faster overall with this algorithm.</p>`);
    }

    // Compare RR vs others
    if (metrics.RR && metrics.FCFS) {
        const rrWT = parseFloat(metrics.RR.avgWT), fcfsWT = parseFloat(metrics.FCFS.avgWT);
        if (rrWT < fcfsWT) {
            lines.push(`<p><strong>Round Robin</strong> reduces waiting time by <strong>${(fcfsWT - rrWT).toFixed(2)} units</strong> compared to FCFS due to time-sharing, which prevents long processes from blocking short ones.</p>`);
        } else if (fcfsWT < rrWT) {
            lines.push(`<p><strong>FCFS</strong> outperforms Round Robin here because process burst times are relatively uniform, so the overhead of context switching in RR provides no benefit.</p>`);
        }
    }

    if (metrics.SJF) {
        lines.push(`<p><strong>SJF</strong> is theoretically optimal for minimizing average waiting time in non-preemptive scheduling. ${bestWT === 'SJF' ? 'This is confirmed by the results.' : 'However, in preemptive scenarios or with specific arrival patterns, other algorithms may match or beat it.'}</p>`);
    }

    if (metrics.PRIORITY) {
        const pWT = parseFloat(metrics.PRIORITY.avgWT);
        const sjfWT = metrics.SJF ? parseFloat(metrics.SJF.avgWT) : null;
        if (sjfWT !== null && pWT > sjfWT) {
            lines.push(`<p><strong>Priority Scheduling</strong> has higher waiting time (${metrics.PRIORITY.avgWT}) than SJF (${metrics.SJF.avgWT}) because priority values don't always correlate with burst time. Consider if the priority assignments match your actual requirements.</p>`);
        }
    }

    // CPU util insight
    const utils = Object.entries(metrics).map(([a, m]) => parseFloat(m.cpuUtil));
    const allSameUtil = utils.every(u => u === utils[0]);
    if (allSameUtil) {
        lines.push(`<p>All algorithms achieve <strong>${metrics[winner].cpuUtil}% CPU utilization</strong> — this is expected since all processes are CPU-bound with no I/O waits in this simulation.</p>`);
    }

    insightContent.innerHTML = lines.join('');
}

// ─── UI Helpers ───────────────────────────────────────────────────────────────
function showLoading(v) { loadingOverlay.classList.toggle('hidden', !v); }
function showResults(algo) {
    resultsPanel.classList.remove('hidden');
    algorithmBadge.textContent = algo;
    resultsPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function hideResults() { resultsPanel.classList.add('hidden'); queuePanel.classList.add('hidden'); }
function showError(msg) {
    errorMessage.textContent = msg; errorToast.classList.remove('hidden'); errorToast.classList.add('show');
    setTimeout(() => { errorToast.classList.remove('show'); setTimeout(() => errorToast.classList.add('hidden'), 300); }, 4000);
}
function resetAll() {
    processes = [
        { pid: 1, arrivalTime: 0, burstTime: 5, priority: 3 },
        { pid: 2, arrivalTime: 1, burstTime: 3, priority: 1 },
        { pid: 3, arrivalTime: 2, burstTime: 8, priority: 4 },
        { pid: 4, arrivalTime: 3, burstTime: 6, priority: 2 },
    ];
    algorithmSelect.value = 'RR'; quantumInput.value = 2;
    updateQuantumVis(); updatePriorityVis(); renderProcessTable();
    hideResults(); comparePanel.classList.add('hidden'); stopPlay();
}
