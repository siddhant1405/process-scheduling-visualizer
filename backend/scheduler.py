"""
CPU Scheduling Engine (Python)

Implements CPU scheduling algorithms and returns execution timelines.
Supports: Round Robin, FCFS, SJF (Non-Preemptive), Priority (Non-Preemptive)

Each algorithm returns a list of {"pid": int, "start": int, "end": int} dicts.
"""

from collections import deque
from dataclasses import dataclass, field


@dataclass
class Process:
    pid: int
    arrival_time: int
    burst_time: int
    priority: int = 0
    remaining_time: int = field(init=False)

    def __post_init__(self):
        self.remaining_time = self.burst_time


def round_robin(processes: list[Process], quantum: int) -> list[dict]:
    """
    Round Robin Scheduling — preemptive with fixed time quantum.
    """
    procs = sorted(processes, key=lambda p: p.arrival_time)
    n = len(procs)
    remaining = [p.burst_time for p in procs]
    in_queue = [False] * n
    ready_queue: deque[int] = deque()
    timeline: list[dict] = []
    current_time = 0
    completed = 0

    # Enqueue processes that arrive at time 0
    for i in range(n):
        if procs[i].arrival_time <= 0:
            ready_queue.append(i)
            in_queue[i] = True

    while completed < n:
        if not ready_queue:
            # CPU idle — advance to next arriving process
            next_arrival = min(
                procs[i].arrival_time
                for i in range(n)
                if remaining[i] > 0
            )
            current_time = next_arrival
            for i in range(n):
                if (not in_queue[i]
                        and procs[i].arrival_time <= current_time
                        and remaining[i] > 0):
                    ready_queue.append(i)
                    in_queue[i] = True
            continue

        idx = ready_queue.popleft()
        exec_time = min(quantum, remaining[idx])
        start_time = current_time
        current_time += exec_time
        remaining[idx] -= exec_time

        timeline.append({
            "pid": procs[idx].pid,
            "start": start_time,
            "end": current_time,
        })

        # Enqueue newly arrived processes (arrived during this quantum)
        for i in range(n):
            if (not in_queue[i]
                    and procs[i].arrival_time <= current_time
                    and remaining[i] > 0):
                ready_queue.append(i)
                in_queue[i] = True

        # Re-enqueue current process if not finished
        if remaining[idx] > 0:
            ready_queue.append(idx)
        else:
            completed += 1

    return timeline


def fcfs(processes: list[Process]) -> list[dict]:
    """
    First Come First Served — non-preemptive, arrival order.
    """
    procs = sorted(processes, key=lambda p: p.arrival_time)
    timeline: list[dict] = []
    current_time = 0

    for p in procs:
        if current_time < p.arrival_time:
            current_time = p.arrival_time
        start_time = current_time
        current_time += p.burst_time
        timeline.append({"pid": p.pid, "start": start_time, "end": current_time})

    return timeline


def sjf(processes: list[Process]) -> list[dict]:
    """
    Shortest Job First — non-preemptive.
    Selects the process with shortest burst time among arrived processes.
    """
    procs = list(processes)
    n = len(procs)
    timeline: list[dict] = []
    done = [False] * n
    current_time = 0
    completed = 0

    while completed < n:
        # Find shortest burst among arrived, undone processes
        shortest = -1
        min_burst = float("inf")

        for i in range(n):
            if (not done[i]
                    and procs[i].arrival_time <= current_time
                    and procs[i].burst_time < min_burst):
                min_burst = procs[i].burst_time
                shortest = i

        if shortest == -1:
            # No process available — advance time
            next_arrival = min(
                procs[i].arrival_time for i in range(n) if not done[i]
            )
            current_time = next_arrival
            continue

        start_time = current_time
        current_time += procs[shortest].burst_time
        timeline.append({
            "pid": procs[shortest].pid,
            "start": start_time,
            "end": current_time,
        })
        done[shortest] = True
        completed += 1

    return timeline


def priority_scheduling(processes: list[Process]) -> list[dict]:
    """
    Priority Scheduling — non-preemptive.
    Lower priority value = higher priority.
    Ties broken by earlier arrival time.
    """
    procs = list(processes)
    n = len(procs)
    timeline: list[dict] = []
    done = [False] * n
    current_time = 0
    completed = 0

    while completed < n:
        best = -1
        best_priority = float("inf")

        for i in range(n):
            if not done[i] and procs[i].arrival_time <= current_time:
                if (procs[i].priority < best_priority
                        or (procs[i].priority == best_priority
                            and procs[i].arrival_time < (
                                procs[best].arrival_time if best >= 0 else float("inf")
                            ))):
                    best_priority = procs[i].priority
                    best = i

        if best == -1:
            next_arrival = min(
                procs[i].arrival_time for i in range(n) if not done[i]
            )
            current_time = next_arrival
            continue

        start_time = current_time
        current_time += procs[best].burst_time
        timeline.append({
            "pid": procs[best].pid,
            "start": start_time,
            "end": current_time,
        })
        done[best] = True
        completed += 1

    return timeline


# ─── Dispatcher ────────────────────────────────────────────────────────────────

ALGORITHMS = {
    "RR": lambda procs, q: round_robin(procs, q),
    "FCFS": lambda procs, _: fcfs(procs),
    "SJF": lambda procs, _: sjf(procs),
    "PRIORITY": lambda procs, _: priority_scheduling(procs),
}


def run_algorithm(algorithm: str, quantum: int, processes: list[Process]) -> list[dict]:
    """Run a scheduling algorithm by name and return the timeline."""
    algo_fn = ALGORITHMS.get(algorithm.upper())
    if algo_fn is None:
        algo_fn = ALGORITHMS["RR"]
    return algo_fn(processes, quantum)
