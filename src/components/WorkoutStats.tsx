import { useState } from 'react';
import { getExercises, getHistory, getSettings } from '../services/storage';
import type { Exercise, LoggedWorkout } from '../types';

interface ChartPoint {
  x: number;
  y: number;
  val: number;
  dateStr: string;
  fullDateStr: string;
  maxWeight: number;
  estimated1RM: number;
  bodyWeight: number;
  weightY: number;
}

export function WorkoutStats() {
  const [exercises] = useState<Exercise[]>(() => getExercises());
  const [history] = useState<LoggedWorkout[]>(() => getHistory());
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>(() => {
    const loadedExercises = getExercises();
    return loadedExercises.length > 0 ? loadedExercises[0].id : '';
  });
  const [metric, setMetric] = useState<'1rm' | 'maxWeight'>('1rm');
  const [activePointIdx, setActivePointIdx] = useState<number | null>(null);

  const settings = getSettings();
  const selectedExercise = exercises.find((e) => e.id === selectedExerciseId);
  const isBodyweight = selectedExercise?.isBodyweight || false;

  // Group and calculate stats chronologically
  const exerciseSessions = history
    .filter((workout) =>
      workout.exercises.some((ex) => ex.exerciseId === selectedExerciseId)
    )
    .map((workout) => {
      const workoutEx = workout.exercises.find((ex) => ex.exerciseId === selectedExerciseId)!;
      const bw = workout.bodyWeight || settings.userWeight || 80;
      
      // Calculate max weight in this session (incorporating bodyweight if applicable)
      const maxWeight = workoutEx.sets.reduce((max, s) => {
        const effWeight = isBodyweight ? (s.weight + bw) : s.weight;
        return Math.max(max, effWeight);
      }, 0);

      // Calculate 1RM from completed sets, or fallback to all sets if no completed sets exist
      const completedSets = workoutEx.sets.filter((s) => s.completed);
      const targetSets = completedSets.length > 0 ? completedSets : workoutEx.sets;
      const estimated1RM = targetSets.reduce((max, s) => {
        const effWeight = isBodyweight ? (s.weight + bw) : s.weight;
        const epley = effWeight * (1 + s.reps / 30);
        return Math.max(max, epley);
      }, 0);

      return {
        id: workout.id,
        date: new Date(workout.startTime),
        dateStr: new Date(workout.startTime).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' }),
        fullDateStr: new Date(workout.startTime).toLocaleDateString('pl-PL', {
          weekday: 'long',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }),
        maxWeight: parseFloat(maxWeight.toFixed(1)),
        estimated1RM: parseFloat(estimated1RM.toFixed(1)),
        bodyWeight: bw,
      };
    });

  // Sort chronological ascending (oldest first)
  exerciseSessions.sort((a, b) => a.date.getTime() - b.date.getTime());

  // Chart setup
  const width = 500;
  const height = 260;
  const padding = { top: 30, right: 30, bottom: 50, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  let points: ChartPoint[] = [];
  let lineD = '';
  let areaD = '';
  let weightLineD = '';
  let gridLines: { y: number; val: string }[] = [];
  let minVal = 0;
  let maxVal = 0;

  if (exerciseSessions.length > 0) {
    const values = exerciseSessions.map((d) => (metric === '1rm' ? d.estimated1RM : d.maxWeight));
    const bwValues = exerciseSessions.map((d) => d.bodyWeight);
    const allValues = [...values, ...bwValues];
    minVal = Math.min(...allValues);
    maxVal = Math.max(...allValues);

    // Padding for Y axis
    if (minVal === maxVal) {
      minVal = Math.max(0, minVal - 5);
      maxVal = maxVal + 5;
    } else {
      const range = maxVal - minVal;
      minVal = Math.max(0, minVal - range * 0.15);
      maxVal = maxVal + range * 0.15;
    }

    minVal = Math.floor(minVal);
    maxVal = Math.ceil(maxVal);

    points = exerciseSessions.map((d, i) => {
      const val = metric === '1rm' ? d.estimated1RM : d.maxWeight;
      const x =
        padding.left +
        (exerciseSessions.length > 1 ? (i / (exerciseSessions.length - 1)) * chartWidth : chartWidth / 2);
      const y = padding.top + chartHeight - ((val - minVal) / (maxVal - minVal)) * chartHeight;
      const weightY = padding.top + chartHeight - ((d.bodyWeight - minVal) / (maxVal - minVal)) * chartHeight;
      return {
        x,
        y,
        val,
        dateStr: d.dateStr,
        fullDateStr: d.fullDateStr,
        maxWeight: d.maxWeight,
        estimated1RM: d.estimated1RM,
        bodyWeight: d.bodyWeight,
        weightY,
      };
    });

    if (points.length > 1) {
      lineD = `M ${points.map((p) => `${p.x} ${p.y}`).join(' L ')}`;
      areaD = `${lineD} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`;
      weightLineD = `M ${points.map((p) => `${p.x} ${p.weightY}`).join(' L ')}`;
    }

    // Grid lines (Y axis ticks)
    const gridCount = 4;
    gridLines = Array.from({ length: gridCount }).map((_, idx) => {
      const val = minVal + (idx / (gridCount - 1)) * (maxVal - minVal);
      const y = padding.top + chartHeight - (idx / (gridCount - 1)) * chartHeight;
      return { y, val: val.toFixed(0) };
    });
  }

  // Active point info display (defaults to the latest one)
  const displayPoint =
    activePointIdx !== null
      ? points[activePointIdx]
      : points.length > 0
      ? points[points.length - 1]
      : null;

  return (
    <div className="flex-column gap-16" style={{ paddingBottom: '32px' }}>
      <div>
        <h2>Wykresy i Statystyki</h2>
        <p className="text-muted" style={{ fontSize: '13px', marginTop: '2px' }}>
          Śledź swój progres siłowy i szacowany 1RM (One Rep Max) dla każdego ćwiczenia.
        </p>
      </div>

      {/* Selector and filters */}
      <div className="card flex-column gap-12">
        <div className="form-group">
          <label className="form-label" htmlFor="exercise-select">Ćwiczenie</label>
          <select
            id="exercise-select"
            className="input-text"
            value={selectedExerciseId}
            onChange={(e) => {
              setSelectedExerciseId(e.target.value);
              setActivePointIdx(null);
            }}
            style={{
              appearance: 'none',
              backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23ffffff\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'><polyline points=\'6 9 12 15 18 9\'></polyline></svg>")',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 12px center',
              backgroundSize: '16px',
              paddingRight: '36px',
            }}
          >
            {exercises.map((ex) => (
              <option key={ex.id} value={ex.id} style={{ backgroundColor: 'var(--bg-surface)' }}>
                {ex.name}
              </option>
            ))}
          </select>
        </div>

        {exerciseSessions.length > 0 && (
          <div className="flex-row" style={{ gap: '8px' }}>
            <button
              type="button"
              className={`chip-btn ${metric === '1rm' ? 'active' : ''}`}
              onClick={() => setMetric('1rm')}
              style={{ flex: 1, textAlign: 'center' }}
            >
              Szacowany 1RM
            </button>
            <button
              type="button"
              className={`chip-btn ${metric === 'maxWeight' ? 'active' : ''}`}
              onClick={() => setMetric('maxWeight')}
              style={{ flex: 1, textAlign: 'center' }}
            >
              Maks. Ciężar
            </button>
          </div>
        )}
      </div>

      {/* Chart and stats display */}
      {exerciseSessions.length === 0 ? (
        <div className="card text-center" style={{ padding: '48px 16px' }}>
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--text-secondary)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ margin: '0 auto 16px auto', opacity: 0.5 }}
          >
            <path d="M18 20V10" />
            <path d="M12 20V4" />
            <path d="M6 20v-6" />
          </svg>
          <h3>Brak historii treningowej</h3>
          <p className="text-muted" style={{ marginTop: '8px', fontSize: '14px' }}>
            To ćwiczenie ({selectedExercise?.name}) nie było jeszcze wykonywane w żadnym ukończonym treningu.
          </p>
        </div>
      ) : (
        <div className="flex-column gap-16">
          {/* Selected data point detail header card */}
          {displayPoint && (
            <div
              className="card flex-row justify-between align-center"
              style={{
                borderLeft: '4px solid var(--accent)',
                padding: '12px 16px',
                background: 'var(--bg-secondary)',
              }}
            >
              <div className="flex-column" style={{ gap: '4px' }}>
                <span className="text-muted" style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold' }}>
                  Sesja z {displayPoint.fullDateStr}
                </span>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Waga ciała w tej sesji: <strong>{displayPoint.bodyWeight} kg</strong>
                </span>
              </div>
              <div className="text-center">
                <span className="text-muted" style={{ fontSize: '11px', textTransform: 'uppercase' }}>
                  {metric === '1rm' ? 'Szacowany 1RM' : 'Maks. Ciężar'}
                </span>
                <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--accent)' }}>
                  {displayPoint.val} kg
                </div>
              </div>
            </div>
          )}

          {/* Premium Custom SVG Chart */}
          <div className="card" style={{ padding: '16px 8px 8px 8px' }}>
            <div style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
              <svg
                width="100%"
                height="100%"
                viewBox={`0 0 ${width} ${height}`}
                style={{ overflow: 'visible', display: 'block' }}
              >
                <defs>
                  {/* Premium gradient filling under line */}
                  <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Gridlines */}
                {gridLines.map((line, idx) => (
                  <g key={idx}>
                    <line
                      x1={padding.left}
                      y1={line.y}
                      x2={width - padding.right}
                      y2={line.y}
                      stroke="var(--border)"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                    />
                    {/* Y Axis Labels */}
                    <text
                      x={padding.left - 10}
                      y={line.y + 4}
                      fill="var(--text-secondary)"
                      fontSize="11"
                      textAnchor="end"
                      fontWeight="500"
                    >
                      {line.val}
                    </text>
                  </g>
                ))}

                {/* Left vertical axis line */}
                <line
                  x1={padding.left}
                  y1={padding.top}
                  x2={padding.left}
                  y2={padding.top + chartHeight}
                  stroke="var(--border)"
                  strokeWidth="1"
                />

                {/* Bottom horizontal axis line */}
                <line
                  x1={padding.left}
                  y1={padding.top + chartHeight}
                  x2={width - padding.right}
                  y2={padding.top + chartHeight}
                  stroke="var(--border)"
                  strokeWidth="1"
                />

                {/* Draw Gradient Area (only for 2+ points) */}
                {points.length > 1 && (
                  <path d={areaD} fill="url(#chart-gradient)" />
                )}

                {/* Draw Body Weight Line */}
                {points.length > 1 ? (
                  <path
                    d={weightLineD}
                    fill="none"
                    stroke="var(--text-secondary)"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.6"
                  />
                ) : null}

                {/* Draw Main Progress Line */}
                {points.length > 1 ? (
                  <path
                    d={lineD}
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : null}

                {/* Circles for Data Points with Interaction */}
                {points.map((p, idx) => {
                  const isActive =
                    activePointIdx === idx || (activePointIdx === null && idx === points.length - 1);
                  return (
                    <g key={idx}>
                      {/* Transparent larger circle for easier touching/clicking */}
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r="14"
                        fill="transparent"
                        style={{ cursor: 'pointer' }}
                        onClick={() => setActivePointIdx(idx)}
                      />

                      {/* Displayed circle marker */}
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={isActive ? '6' : '4'}
                        fill={isActive ? 'var(--accent)' : 'var(--bg-primary)'}
                        stroke="var(--accent)"
                        strokeWidth="2"
                        style={{ transition: 'all 0.1s ease', cursor: 'pointer' }}
                        onClick={() => setActivePointIdx(idx)}
                      />

                      {/* Date Axis Label (only display subset if too many points) */}
                      {(() => {
                        const total = points.length;
                        const shouldShow =
                          total <= 6 ||
                          idx === 0 ||
                          idx === total - 1 ||
                          (total > 6 && total <= 12 && idx % 2 === 0) ||
                          (total > 12 && idx % Math.floor(total / 4) === 0);

                        if (!shouldShow) return null;

                        return (
                          <text
                            x={p.x}
                            y={padding.top + chartHeight + 20}
                            fill={isActive ? 'var(--accent)' : 'var(--text-secondary)'}
                            fontSize="10"
                            fontWeight={isActive ? '600' : 'normal'}
                            textAnchor="middle"
                          >
                            {p.dateStr}
                          </text>
                        );
                      })()}
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Instruction tooltip under SVG */}
            <p className="text-center text-muted" style={{ fontSize: '11px', marginTop: '12px' }}>
              Wskazówka: Dotknij punktu na wykresie, aby zobaczyć szczegóły.
            </p>

            {/* Legend */}
            <div className="flex-row justify-center gap-16" style={{ marginTop: '8px', fontSize: '11px', borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
              <div className="flex-row align-center gap-4">
                <div style={{ width: '12px', height: '3px', background: 'var(--accent)', borderRadius: '1px' }} />
                <span className="text-muted">{metric === '1rm' ? 'Szacowany 1RM' : 'Maks. Ciężar'}</span>
              </div>
              <div className="flex-row align-center gap-4">
                <div style={{ width: '12px', height: '1.5px', borderBottom: '1.5px dashed var(--text-secondary)', opacity: 0.6 }} />
                <span className="text-muted">Waga ciała</span>
              </div>
            </div>
          </div>

          {/* Quick Stats overview */}
          <div className="card flex-column gap-8" style={{ fontSize: '14px' }}>
            <h3>Przegląd osiągnięć</h3>
            <div className="flex-row justify-between" style={{ padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
              <span className="text-muted">Całkowita liczba sesji:</span>
              <strong>{exerciseSessions.length}</strong>
            </div>
            <div className="flex-row justify-between" style={{ padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
              <span className="text-muted">Rekordowy ciężar (Max):</span>
              <strong style={{ color: 'var(--accent-success)' }}>
                {Math.max(...exerciseSessions.map((s) => s.maxWeight))} kg
              </strong>
            </div>
            <div className="flex-row justify-between" style={{ padding: '4px 0' }}>
              <span className="text-muted">Najlepszy szacowany 1RM:</span>
              <strong style={{ color: 'var(--accent)' }}>
                {Math.max(...exerciseSessions.map((s) => s.estimated1RM))} kg
              </strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
