import { getColor } from '../utils/constants';

export default function ProcessTable({ processes, algorithm, onUpdate, onRemove, onAdd }) {
  const showPriority = algorithm === 'PRIORITY';

  const handleChange = (index, field, value) => {
    onUpdate(index, field, parseInt(value) || 0);
  };

  return (
    <div className="process-section">
      <div className="process-header">
        <h3>📋 Process Table</h3>
        <button className="btn btn-sm btn-ghost" onClick={onAdd}>+ Add Process</button>
      </div>
      <div className="table-wrapper">
        <table id="process-table">
          <thead>
            <tr>
              <th>PID</th>
              <th>Arrival Time</th>
              <th>Burst Time</th>
              <th className={`priority-col${showPriority ? '' : ' hidden-col'}`}>Priority</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {processes.map((proc, i) => {
              const c = getColor(proc.pid);
              return (
                <tr key={proc.pid}>
                  <td>
                    <span className="pid-label">
                      <span className="pid-dot" style={{ background: c.main }} />
                      P{proc.pid}
                    </span>
                  </td>
                  <td>
                    <input
                      type="number" min="0" max="100"
                      value={proc.arrivalTime}
                      onChange={e => handleChange(i, 'arrivalTime', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number" min="1" max="100"
                      value={proc.burstTime}
                      onChange={e => handleChange(i, 'burstTime', e.target.value)}
                    />
                  </td>
                  <td className={`priority-col${showPriority ? '' : ' hidden-col'}`}>
                    <input
                      type="number" min="1" max="100"
                      value={proc.priority}
                      onChange={e => handleChange(i, 'priority', e.target.value)}
                    />
                  </td>
                  <td>
                    <button className="btn btn-danger btn-sm" onClick={() => onRemove(i)}>✕</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
