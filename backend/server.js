/**
 * Express Backend Server
 * 
 * Serves as the bridge between the frontend and the C++ scheduling engine.
 * Executes the compiled C++ binary with user-specified parameters and
 * returns the JSON timeline to the frontend.
 */

const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve frontend static files
app.use(express.static(path.join(__dirname, '..', 'frontend')));

/**
 * GET /run
 * 
 * Executes the C++ scheduler binary with query parameters:
 *   - algorithm: RR | FCFS | SJF | PRIORITY (default: RR)
 *   - quantum: time quantum for Round Robin (default: 2)
 *   - processes: semicolon-separated process list "pid,at,bt[,priority];..."
 * 
 * Returns: JSON array of { pid, start, end } timeline blocks
 */
app.get('/run', (req, res) => {
    const algorithm = req.query.algorithm || 'RR';
    const quantum = req.query.quantum || '2';
    const processes = req.query.processes || '';

    // Path to compiled C++ binary
    const binaryPath = path.join(__dirname, '..', 'cpp', 'scheduler.exe');

    // Build command with arguments
    let command = `"${binaryPath}" ${algorithm} ${quantum}`;
    if (processes) {
        command += ` "${processes}"`;
    }

    exec(command, { timeout: 5000 }, (error, stdout, stderr) => {
        if (error) {
            console.error(`Execution error: ${error.message}`);
            return res.status(500).json({
                error: 'Failed to execute scheduler',
                details: error.message,
                stderr: stderr
            });
        }

        if (stderr) {
            console.warn(`Scheduler stderr: ${stderr}`);
        }

        try {
            const timeline = JSON.parse(stdout);
            res.json({
                algorithm: algorithm,
                quantum: parseInt(quantum),
                timeline: timeline
            });
        } catch (parseError) {
            console.error(`JSON parse error: ${parseError.message}`);
            console.error(`Raw stdout: ${stdout}`);
            res.status(500).json({
                error: 'Failed to parse scheduler output',
                details: parseError.message,
                rawOutput: stdout
            });
        }
    });
});

/**
 * GET /compare
 * 
 * Runs all 4 algorithms on the same process set and returns results for each.
 * Query parameters:
 *   - quantum: time quantum for Round Robin (default: 2)
 *   - processes: semicolon-separated process list "pid,at,bt[,priority];..."
 * 
 * Returns: Object with results for each algorithm
 */
app.get('/compare', (req, res) => {
    const quantum = req.query.quantum || '2';
    const processes = req.query.processes || '';

    const binaryPath = path.join(__dirname, '..', 'cpp', 'scheduler.exe');
    const algorithms = ['RR', 'FCFS', 'SJF', 'PRIORITY'];

    // Run all algorithms in parallel
    const promises = algorithms.map(algo => {
        return new Promise((resolve, reject) => {
            let command = `"${binaryPath}" ${algo} ${quantum}`;
            if (processes) {
                command += ` "${processes}"`;
            }

            exec(command, { timeout: 5000 }, (error, stdout, stderr) => {
                if (error) {
                    reject(new Error(`${algo}: ${error.message}`));
                    return;
                }
                try {
                    const timeline = JSON.parse(stdout);
                    resolve({ algorithm: algo, timeline: timeline });
                } catch (parseError) {
                    reject(new Error(`${algo}: Failed to parse output`));
                }
            });
        });
    });

    Promise.all(promises)
        .then(results => {
            const response = {};
            results.forEach(r => {
                response[r.algorithm] = {
                    algorithm: r.algorithm,
                    quantum: parseInt(quantum),
                    timeline: r.timeline
                };
            });
            res.json(response);
        })
        .catch(err => {
            console.error(`Compare error: ${err.message}`);
            res.status(500).json({
                error: 'Failed to run comparison',
                details: err.message
            });
        });
});

/**
 * GET /health
 * Simple health check endpoint
 */
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
    console.log(`\n  ⚡ Scheduler Visualizer Backend`);
    console.log(`  ─────────────────────────────────`);
    console.log(`  → Server:    http://localhost:${PORT}`);
    console.log(`  → Frontend:  http://localhost:${PORT}/index.html`);
    console.log(`  → API:       http://localhost:${PORT}/run`);
    console.log(`  → Health:    http://localhost:${PORT}/health\n`);
});
