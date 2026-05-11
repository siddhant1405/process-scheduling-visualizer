import { useEffect, useRef } from 'react';
import { getColor, SCALE_FACTOR } from '../utils/constants';

function blockStartPx(tl, idx) {
  let px = 0;
  for (let i = 0; i < idx; i++) px += (tl[i].end - tl[i].start) * SCALE_FACTOR + 2;
  return px;
}

export default function GanttChart({ timeline }) {
  const chartRef = useRef(null);

  useEffect(() => {
    if (!chartRef.current) return;
    const blocks = chartRef.current.querySelectorAll('.gantt-block');
    blocks.forEach((el, i) => {
      setTimeout(() => el.classList.add('animate-in'), i * 100);
    });
  }, [timeline]);

  if (!timeline?.length) return null;

  const totalTime = Math.max(...timeline.map(b => b.end));
  const tw = totalTime * SCALE_FACTOR + (timeline.length - 1) * 2;

  // Compute time marker positions
  const pts = new Set();
  timeline.forEach(b => { pts.add(b.start); pts.add(b.end); });
  const sorted = [...pts].sort((a, b) => a - b);

  const markers = sorted.map(t => {
    let px = 0;
    for (let i = 0; i < timeline.length; i++) {
      if (t <= timeline[i].end) {
        px = blockStartPx(timeline, i) + (t - timeline[i].start) * SCALE_FACTOR;
        break;
      }
    }
    if (t === timeline[timeline.length - 1].end) {
      const li = timeline.length - 1;
      px = blockStartPx(timeline, li) + (timeline[li].end - timeline[li].start) * SCALE_FACTOR;
    }
    return { t, px };
  });

  return (
    <div className="gantt-container">
      <div className="gantt-chart" ref={chartRef}>
        {timeline.map((block, i) => {
          const c = getColor(block.pid);
          const dur = block.end - block.start;
          const w = dur * SCALE_FACTOR;
          return (
            <div
              key={i}
              className="gantt-block"
              style={{
                width: `${w}px`, minWidth: `${w}px`,
                background: `linear-gradient(135deg,${c.bg},${c.border})`,
                borderColor: c.border, color: c.main,
                animationDelay: `${i * 100}ms`,
              }}
              title={`P${block.pid} | ${block.start}→${block.end} (${dur})`}
            >
              <span className="block-label">P{block.pid}</span>
            </div>
          );
        })}
      </div>
      <div className="gantt-timeline" style={{ width: `${tw}px`, position: 'relative' }}>
        {markers.map(({ t, px }) => (
          <span key={t} className="gantt-marker" style={{ left: `${px}px` }}>{t}</span>
        ))}
      </div>
    </div>
  );
}
