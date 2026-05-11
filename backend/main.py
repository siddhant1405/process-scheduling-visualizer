"""
FastAPI Backend Server

Serves as the API for the CPU Scheduling Visualizer.
All scheduling logic is handled by the Python scheduler module —
no external binaries or subprocess calls needed.
"""

from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from scheduler import Process, run_algorithm, ALGORITHMS

app = FastAPI(
    title="CPU Scheduling Visualizer API",
    description="API for executing CPU scheduling algorithms",
    version="2.0.0",
)

# CORS — allow frontend dev server and production origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def parse_processes(process_str: str) -> list[Process]:
    """
    Parse process string: "pid,at,bt[,priority];pid,at,bt[,priority];..."
    """
    processes = []
    if not process_str:
        return processes

    for entry in process_str.split(";"):
        entry = entry.strip()
        if not entry:
            continue
        values = [int(v) for v in entry.split(",")]
        if len(values) >= 3:
            processes.append(Process(
                pid=values[0],
                arrival_time=values[1],
                burst_time=values[2],
                priority=values[3] if len(values) >= 4 else 0,
            ))

    return processes


@app.get("/health")
async def health():
    """Simple health check endpoint."""
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


@app.get("/run")
async def run_scheduler(
    algorithm: str = Query("RR", description="Scheduling algorithm: RR | FCFS | SJF | PRIORITY"),
    quantum: int = Query(2, ge=1, le=20, description="Time quantum for Round Robin"),
    processes: str = Query("", description='Semicolon-separated process list "pid,at,bt[,priority];..."'),
):
    """
    Execute a scheduling algorithm and return the timeline.
    """
    proc_list = parse_processes(processes)
    if not proc_list:
        raise HTTPException(status_code=400, detail="No valid processes provided")

    try:
        timeline = run_algorithm(algorithm, quantum, proc_list)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scheduler error: {e}")

    if not timeline:
        raise HTTPException(status_code=500, detail="Empty timeline")

    return {
        "algorithm": algorithm,
        "quantum": quantum,
        "timeline": timeline,
    }


@app.get("/compare")
async def compare_algorithms(
    quantum: int = Query(2, ge=1, le=20, description="Time quantum for Round Robin"),
    processes: str = Query("", description='Semicolon-separated process list "pid,at,bt[,priority];..."'),
):
    """
    Run all 4 algorithms on the same process set and return results for each.
    """
    proc_list = parse_processes(processes)
    if not proc_list:
        raise HTTPException(status_code=400, detail="No valid processes provided")

    results = {}
    for algo in ALGORITHMS:
        try:
            # Create fresh process instances for each algorithm
            fresh_procs = [
                Process(p.pid, p.arrival_time, p.burst_time, p.priority)
                for p in proc_list
            ]
            timeline = run_algorithm(algo, quantum, fresh_procs)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"{algo}: {e}")

        results[algo] = {
            "algorithm": algo,
            "quantum": quantum,
            "timeline": timeline,
        }

    return results
