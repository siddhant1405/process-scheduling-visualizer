/**
 * CPU Scheduling Engine
 * 
 * Implements CPU scheduling algorithms and outputs execution timeline as JSON.
 * Currently supports: Round Robin, FCFS, SJF (Non-Preemptive), Priority (Non-Preemptive)
 * 
 * Usage:
 *   ./scheduler                          → Round Robin with default processes
 *   ./scheduler RR 3 "1,0,5;2,1,3;3,2,8"  → Round Robin, quantum=3, custom processes
 *   ./scheduler FCFS 0 "1,0,5;2,1,3"      → FCFS with custom processes
 *   ./scheduler SJF 0 "1,0,5;2,1,3"       → SJF with custom processes
 *   ./scheduler PRIORITY 0 "1,0,5,2;2,1,3,1" → Priority with custom processes (lower = higher priority)
 * 
 * Process format: "pid,arrivalTime,burstTime[,priority];..."
 * Output: JSON array of { pid, start, end } timeline blocks
 */

#include <iostream>
#include <vector>
#include <queue>
#include <string>
#include <sstream>
#include <algorithm>
#include <climits>

struct Process {
    int pid;
    int arrivalTime;
    int burstTime;
    int remainingTime;
    int priority;       // Lower value = higher priority
    int completionTime;
    int turnaroundTime;
    int waitingTime;
};

struct TimeBlock {
    int pid;
    int start;
    int end;
};

// ─── Scheduling Algorithms ────────────────────────────────────────────────────

/**
 * Round Robin Scheduling
 * Preemptive algorithm with fixed time quantum.
 */
std::vector<TimeBlock> roundRobin(std::vector<Process> processes, int quantum) {
    std::vector<TimeBlock> timeline;
    std::queue<int> readyQueue; // indices into processes
    int currentTime = 0;
    int completed = 0;
    int n = processes.size();
    std::vector<bool> inQueue(n, false);

    // Sort by arrival time for initial ordering
    std::sort(processes.begin(), processes.end(),
        [](const Process& a, const Process& b) {
            return a.arrivalTime < b.arrivalTime;
        });

    // Enqueue processes that arrive at time 0
    for (int i = 0; i < n; i++) {
        if (processes[i].arrivalTime <= 0) {
            readyQueue.push(i);
            inQueue[i] = true;
        }
    }

    while (completed < n) {
        if (readyQueue.empty()) {
            // CPU idle — advance to next arriving process
            int nextArrival = INT_MAX;
            for (int i = 0; i < n; i++) {
                if (processes[i].remainingTime > 0 && processes[i].arrivalTime < nextArrival) {
                    nextArrival = processes[i].arrivalTime;
                }
            }
            currentTime = nextArrival;
            for (int i = 0; i < n; i++) {
                if (!inQueue[i] && processes[i].arrivalTime <= currentTime && processes[i].remainingTime > 0) {
                    readyQueue.push(i);
                    inQueue[i] = true;
                }
            }
            continue;
        }

        int idx = readyQueue.front();
        readyQueue.pop();

        int execTime = std::min(quantum, processes[idx].remainingTime);
        int startTime = currentTime;
        currentTime += execTime;
        processes[idx].remainingTime -= execTime;

        // Record timeline block
        timeline.push_back({processes[idx].pid, startTime, currentTime});

        // Enqueue newly arrived processes (arrived during this quantum)
        for (int i = 0; i < n; i++) {
            if (!inQueue[i] && processes[i].arrivalTime <= currentTime && processes[i].remainingTime > 0) {
                readyQueue.push(i);
                inQueue[i] = true;
            }
        }

        // If current process not finished, re-enqueue it
        if (processes[idx].remainingTime > 0) {
            readyQueue.push(idx);
        } else {
            completed++;
            processes[idx].completionTime = currentTime;
            processes[idx].turnaroundTime = currentTime - processes[idx].arrivalTime;
            processes[idx].waitingTime = processes[idx].turnaroundTime - processes[idx].burstTime;
        }
    }

    return timeline;
}

/**
 * First Come First Served (FCFS) Scheduling
 * Non-preemptive, processes execute in arrival order.
 */
std::vector<TimeBlock> fcfs(std::vector<Process> processes) {
    std::vector<TimeBlock> timeline;
    int n = processes.size();

    // Sort by arrival time
    std::sort(processes.begin(), processes.end(),
        [](const Process& a, const Process& b) {
            return a.arrivalTime < b.arrivalTime;
        });

    int currentTime = 0;
    for (int i = 0; i < n; i++) {
        if (currentTime < processes[i].arrivalTime) {
            currentTime = processes[i].arrivalTime;
        }
        int startTime = currentTime;
        currentTime += processes[i].burstTime;
        timeline.push_back({processes[i].pid, startTime, currentTime});
    }

    return timeline;
}

/**
 * Shortest Job First (SJF) - Non-Preemptive
 * Selects the process with shortest burst time among arrived processes.
 */
std::vector<TimeBlock> sjf(std::vector<Process> processes) {
    std::vector<TimeBlock> timeline;
    int n = processes.size();
    int completed = 0;
    int currentTime = 0;
    std::vector<bool> done(n, false);

    while (completed < n) {
        int shortest = -1;
        int minBurst = INT_MAX;

        for (int i = 0; i < n; i++) {
            if (!done[i] && processes[i].arrivalTime <= currentTime && processes[i].burstTime < minBurst) {
                minBurst = processes[i].burstTime;
                shortest = i;
            }
        }

        if (shortest == -1) {
            // No process available — advance time
            int nextArrival = INT_MAX;
            for (int i = 0; i < n; i++) {
                if (!done[i] && processes[i].arrivalTime < nextArrival) {
                    nextArrival = processes[i].arrivalTime;
                }
            }
            currentTime = nextArrival;
            continue;
        }

        int startTime = currentTime;
        currentTime += processes[shortest].burstTime;
        timeline.push_back({processes[shortest].pid, startTime, currentTime});
        done[shortest] = true;
        completed++;
    }

    return timeline;
}

/**
 * Priority Scheduling - Non-Preemptive
 * Lower priority value = higher priority.
 */
std::vector<TimeBlock> priorityScheduling(std::vector<Process> processes) {
    std::vector<TimeBlock> timeline;
    int n = processes.size();
    int completed = 0;
    int currentTime = 0;
    std::vector<bool> done(n, false);

    while (completed < n) {
        int best = -1;
        int bestPriority = INT_MAX;

        for (int i = 0; i < n; i++) {
            if (!done[i] && processes[i].arrivalTime <= currentTime) {
                if (processes[i].priority < bestPriority ||
                    (processes[i].priority == bestPriority && processes[i].arrivalTime < (best >= 0 ? processes[best].arrivalTime : INT_MAX))) {
                    bestPriority = processes[i].priority;
                    best = i;
                }
            }
        }

        if (best == -1) {
            int nextArrival = INT_MAX;
            for (int i = 0; i < n; i++) {
                if (!done[i] && processes[i].arrivalTime < nextArrival) {
                    nextArrival = processes[i].arrivalTime;
                }
            }
            currentTime = nextArrival;
            continue;
        }

        int startTime = currentTime;
        currentTime += processes[best].burstTime;
        timeline.push_back({processes[best].pid, startTime, currentTime});
        done[best] = true;
        completed++;
    }

    return timeline;
}

// ─── Input Parsing ────────────────────────────────────────────────────────────

/**
 * Parse process string in format: "pid,at,bt[,priority];pid,at,bt[,priority];..."
 */
std::vector<Process> parseProcesses(const std::string& input) {
    std::vector<Process> processes;
    std::stringstream ss(input);
    std::string processStr;

    while (std::getline(ss, processStr, ';')) {
        if (processStr.empty()) continue;

        std::stringstream ps(processStr);
        std::string token;
        std::vector<int> values;

        while (std::getline(ps, token, ',')) {
            values.push_back(std::stoi(token));
        }

        if (values.size() >= 3) {
            Process p;
            p.pid = values[0];
            p.arrivalTime = values[1];
            p.burstTime = values[2];
            p.remainingTime = p.burstTime;
            p.priority = (values.size() >= 4) ? values[3] : 0;
            p.completionTime = 0;
            p.turnaroundTime = 0;
            p.waitingTime = 0;
            processes.push_back(p);
        }
    }

    return processes;
}

// ─── JSON Output ──────────────────────────────────────────────────────────────

/**
 * Convert timeline to JSON string.
 * Outputs ONLY valid JSON to stdout — no debug/log messages.
 */
std::string toJSON(const std::vector<TimeBlock>& timeline) {
    std::string json = "[\n";
    for (size_t i = 0; i < timeline.size(); i++) {
        json += "  { \"pid\": " + std::to_string(timeline[i].pid)
             + ", \"start\": " + std::to_string(timeline[i].start)
             + ", \"end\": " + std::to_string(timeline[i].end) + " }";
        if (i < timeline.size() - 1) json += ",";
        json += "\n";
    }
    json += "]";
    return json;
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

int main(int argc, char* argv[]) {
    std::string algorithm = "RR";
    int quantum = 2;
    std::string processInput = "";

    // Parse command-line arguments
    if (argc >= 2) algorithm = argv[1];
    if (argc >= 3) quantum = std::stoi(argv[2]);
    if (argc >= 4) processInput = argv[3];

    // Default processes if none provided
    std::vector<Process> processes;
    if (processInput.empty()) {
        processes = {
            {1, 0, 5, 5, 3, 0, 0, 0},
            {2, 1, 3, 3, 1, 0, 0, 0},
            {3, 2, 8, 8, 4, 0, 0, 0},
            {4, 3, 6, 6, 2, 0, 0, 0}
        };
    } else {
        processes = parseProcesses(processInput);
    }

    // Run selected algorithm
    std::vector<TimeBlock> timeline;

    if (algorithm == "RR") {
        timeline = roundRobin(processes, quantum);
    } else if (algorithm == "FCFS") {
        timeline = fcfs(processes);
    } else if (algorithm == "SJF") {
        timeline = sjf(processes);
    } else if (algorithm == "PRIORITY") {
        timeline = priorityScheduling(processes);
    } else {
        // Default to Round Robin
        timeline = roundRobin(processes, quantum);
    }

    // Output ONLY JSON to stdout
    std::cout << toJSON(timeline);

    return 0;
}
