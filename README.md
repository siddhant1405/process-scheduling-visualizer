# CPU Scheduling Visualizer

A full-stack web application that visualizes CPU scheduling algorithms using an interactive Gantt chart timeline. The scheduling engine is written in **C++** for performance, served via a **Node.js/Express** backend, and rendered in a **Vanilla JS** frontend with a premium dark-themed UI.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (Frontend)                       │
│  ┌──────────┐  ┌──────────┐  ┌────────────────────────────┐   │
│  │ index.html│  │ style.css │  │        script.js           │   │
│  │ (UI)     │  │ (Theme)  │  │ (Logic, Chart, Stats)      │   │
│  └──────────┘  └──────────┘  └─────────┬──────────────────┘   │
│                                         │ fetch /run           │
└─────────────────────────────────────────┼───────────────────────┘
                                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Node.js / Express Backend                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  server.js                                               │   │
│  │  • GET /run → exec() C++ binary → parse JSON → respond   │   │
│  │  • Serves frontend static files                          │   │
│  └──────────────────────┬──────────────────────────────────┘   │
│                          │ child_process.exec                   │
└──────────────────────────┼──────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    C++ Scheduling Engine                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  scheduler.cpp → scheduler.exe                           │   │
│  │  Algorithms: RR, FCFS, SJF, Priority                    │   │
│  │  Output: JSON timeline to stdout                         │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Supported Algorithms

| Algorithm | Type | Key Parameter |
|-----------|------|---------------|
| **Round Robin (RR)** | Preemptive | Time Quantum |
| **First Come First Served (FCFS)** | Non-Preemptive | — |
| **Shortest Job First (SJF)** | Non-Preemptive | — |
| **Priority Scheduling** | Non-Preemptive | Priority value (lower = higher) |

## Setup & Run

### Prerequisites
- **g++** (MinGW or MSYS2 on Windows)
- **Node.js** (v16+)

### 1. Compile C++ Engine
```bash
g++ cpp/scheduler.cpp -o cpp/scheduler.exe
```

### 2. Install Backend Dependencies
```bash
cd backend
npm install
```

### 3. Start the Server
```bash
cd backend
node server.js
```

### 4. Open in Browser
Navigate to **http://localhost:3000** — the Express server serves the frontend automatically.

## API

### `GET /run`

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `algorithm` | string | `RR` | Algorithm: `RR`, `FCFS`, `SJF`, `PRIORITY` |
| `quantum` | int | `2` | Time quantum (only for RR) |
| `processes` | string | *(defaults)* | Semicolon-separated: `pid,at,bt[,priority];...` |

**Example:**
```
GET /run?algorithm=RR&quantum=2&processes=1,0,5,3;2,1,3,1;3,2,8,4;4,3,6,2
```

**Response:**
```json
{
  "algorithm": "RR",
  "quantum": 2,
  "timeline": [
    { "pid": 1, "start": 0, "end": 2 },
    { "pid": 2, "start": 2, "end": 4 },
    ...
  ]
}
```

## Features

- **Interactive process table** — add, edit, remove processes dynamically
- **Algorithm selector** with auto-hiding quantum/priority fields
- **Animated Gantt chart** — blocks expand progressively with staggered animations
- **Statistics dashboard** — total time, CPU utilization, avg turnaround & waiting time
- **Premium dark UI** — glassmorphism, gradient backgrounds, micro-animations
- **Responsive design** — works on desktop and mobile

## Future Improvements

- [ ] Shortest Remaining Time First (SRTF / preemptive SJF)
- [ ] Preemptive Priority Scheduling
- [ ] Multi-level Queue Scheduling
- [ ] Process I/O burst simulation
- [ ] Export Gantt chart as PNG
- [ ] Comparison mode (run multiple algorithms side-by-side)
- [ ] WebSocket for real-time step-through simulation
