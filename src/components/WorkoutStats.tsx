import { useState, useEffect } from 'react';
import { getExercises, getHistory, getSettings, getWeightHistory, saveWeightLog, deleteWeightLog } from '../services/storage';
import type { Exercise, LoggedWorkout, WeightLog } from '../types';

type MetricType = '1rm' | 'maxWeight' | 'volume' | 'maxReps' | 'sumReps' | 'maxExtraWeight' | 'volumeExtra';

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
  const [activeTab, setActiveTab] = useState<'exercises' | 'weight' | 'correlation'>('exercises');
  const [exercises] = useState<Exercise[]>(() => getExercises());
  const [history] = useState<LoggedWorkout[]>(() => getHistory());
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>(() => {
    const loadedExercises = getExercises();
    return loadedExercises.length > 0 ? loadedExercises[0].id : '';
  });
  
  const [metric, setMetric] = useState<MetricType>(() => {
    const loadedExercises = getExercises();
    const defaultEx = loadedExercises.length > 0 ? loadedExercises[0] : null;
    return defaultEx?.isBodyweight ? 'maxReps' : '1rm';
  });
  const [activePointIdx, setActivePointIdx] = useState<number | null>(null);

  const [weightLogs, setWeightLogs] = useState<WeightLog[]>(() => getWeightHistory());
  const [activeWeightPointIdx, setActiveWeightPointIdx] = useState<number | null>(null);

  const getTodayDateStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [newWeightDate, setNewWeightDate] = useState<string>(getTodayDateStr());
  const [newWeightVal, setNewWeightVal] = useState<string>(() => {
    const logs = getWeightHistory();
    return logs.length > 0 ? logs[logs.length - 1].weight.toString() : '80';
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingWeight, setEditingWeight] = useState<string>('');

  // Sync weight logs when tab changes
  useEffect(() => {
    if (activeTab === 'weight') {
      setWeightLogs(getWeightHistory());
    }
  }, [activeTab]);

  // Sync default input weight with latest log
  useEffect(() => {
    if (weightLogs.length > 0) {
      setNewWeightVal(weightLogs[weightLogs.length - 1].weight.toString());
    } else {
      setNewWeightVal('80');
    }
  }, [weightLogs]);

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
      
      const completedSets = workoutEx.sets.filter((s) => s.completed);
      const targetSets = completedSets.length > 0 ? completedSets : workoutEx.sets;

      // Calculate Calisthenics metric values (No body weight addition!)
      const maxReps = targetSets.reduce((max, s) => Math.max(max, s.reps), 0);
      const sumReps = targetSets.reduce((sum, s) => sum + s.reps, 0);
      const maxExtraWeight = targetSets.reduce((max, s) => Math.max(max, s.weight), 0);
      const volumeExtra = targetSets.reduce((sum, s) => sum + s.weight * s.reps, 0);

      // Calculate Standard metric values (No body weight addition!)
      const estimated1RM = targetSets.reduce((max, s) => {
        const epley = s.weight * (1 + s.reps / 30);
        return Math.max(max, epley);
      }, 0);
      const maxWeight = targetSets.reduce((max, s) => Math.max(max, s.weight), 0);
      const volume = targetSets.reduce((sum, s) => sum + s.weight * s.reps, 0);

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
        maxReps,
        sumReps,
        maxExtraWeight: parseFloat(maxExtraWeight.toFixed(1)),
        volumeExtra: parseFloat(volumeExtra.toFixed(1)),
        estimated1RM: parseFloat(estimated1RM.toFixed(1)),
        maxWeight: parseFloat(maxWeight.toFixed(1)),
        volume: parseFloat(volume.toFixed(1)),
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

  const showWeightLine = !isBodyweight && (metric === '1rm' || metric === 'maxWeight');

  const getMetricLabel = (m: MetricType) => {
    switch (m) {
      case 'maxReps': return 'Maks. Powtórzenia';
      case 'sumReps': return 'Suma Powtórzeń';
      case 'maxExtraWeight': return 'Maks. Dodatkowy Ciężar';
      case 'volumeExtra': return 'Objętość Dodatkowa';
      case '1rm': return 'Szacowany 1RM';
      case 'maxWeight': return 'Maks. Ciężar';
      case 'volume': return 'Suma Objętości';
      default: return '';
    }
  };

  const getMetricUnit = (m: MetricType) => {
    if (m === 'maxReps' || m === 'sumReps') return 'powt.';
    return 'kg';
  };

  if (exerciseSessions.length > 0) {
    const values = exerciseSessions.map((d) => {
      if (isBodyweight) {
        if (metric === 'maxReps') return d.maxReps;
        if (metric === 'sumReps') return d.sumReps;
        if (metric === 'maxExtraWeight') return d.maxExtraWeight;
        if (metric === 'volumeExtra') return d.volumeExtra;
        return d.maxReps;
      } else {
        if (metric === '1rm') return d.estimated1RM;
        if (metric === 'maxWeight') return d.maxWeight;
        if (metric === 'volume') return d.volume;
        if (metric === 'maxReps') return d.maxReps;
        return d.estimated1RM;
      }
    });

    const bwValues = exerciseSessions.map((d) => d.bodyWeight);
    const allValues = showWeightLine ? [...values, ...bwValues] : values;
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
      const val = values[i];
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

  // Calisthenics stats
  const totalRepsAllSessions = exerciseSessions.reduce((sum, s) => sum + s.sumReps, 0);
  const maxRepsAllSessions = exerciseSessions.reduce((max, s) => Math.max(max, s.maxReps), 0);
  const recordExtraWeight = exerciseSessions.reduce((max, s) => Math.max(max, s.maxExtraWeight), 0);
  const bestVolumeExtra = exerciseSessions.reduce((max, s) => Math.max(max, s.volumeExtra), 0);

  // Standard stats
  const totalSessions = exerciseSessions.length;
  const recordWeight = exerciseSessions.reduce((max, s) => Math.max(max, s.maxWeight), 0);
  const bestEstimated1RM = exerciseSessions.reduce((max, s) => Math.max(max, s.estimated1RM), 0);

  return (
    <div className="flex-column gap-16" style={{ paddingBottom: '32px' }}>
      <div>
        <h2>Wykresy i Statystyki</h2>
        <p className="text-muted" style={{ fontSize: '13px', marginTop: '2px' }}>
          Śledź swój progres siłowy i szacowany 1RM (One Rep Max) dla każdego ćwiczenia.
        </p>
      </div>

      {/* Tabs Selector */}
      <div className="flex-row" style={{ gap: '8px', flexWrap: 'wrap' }}>
        <button
          type="button"
          className={`chip-btn ${activeTab === 'exercises' ? 'active' : ''}`}
          onClick={() => setActiveTab('exercises')}
          style={{ flex: '1 1 auto', textAlign: 'center', minWidth: '80px' }}
        >
          Ćwiczenia
        </button>
        <button
          type="button"
          className={`chip-btn ${activeTab === 'weight' ? 'active' : ''}`}
          onClick={() => setActiveTab('weight')}
          style={{ flex: '1 1 auto', textAlign: 'center', minWidth: '80px' }}
        >
          Waga Ciała
        </button>
        <button
          type="button"
          className={`chip-btn ${activeTab === 'correlation' ? 'active' : ''}`}
          onClick={() => setActiveTab('correlation')}
          style={{ flex: '1 1 auto', textAlign: 'center', minWidth: '80px' }}
        >
          Korelacja
        </button>
      </div>

      {activeTab === 'weight' && (
        <div className="flex-column gap-16">
          {/* Weight Summary Stats */}
          {(() => {
            const latestWeight = weightLogs.length > 0 ? weightLogs[weightLogs.length - 1].weight : null;
            const weights = weightLogs.map((l) => l.weight);
            const minWeightVal = weights.length > 0 ? Math.min(...weights) : null;
            const maxWeightVal = weights.length > 0 ? Math.max(...weights) : null;

            const getChangeForDays = (days: number) => {
              if (weightLogs.length < 2) return 'Brak danych';
              const latestLog = weightLogs[weightLogs.length - 1];
              const latestTime = new Date(latestLog.date).getTime();
              const targetTime = latestTime - days * 24 * 60 * 60 * 1000;

              // Find the closest log to targetTime (excluding latest)
              let closestLog: WeightLog | null = null;
              let minDiff = Infinity;

              for (let i = 0; i < weightLogs.length - 1; i++) {
                const log = weightLogs[i];
                const logTime = new Date(log.date).getTime();
                const diff = Math.abs(logTime - targetTime);
                if (diff < minDiff) {
                  minDiff = diff;
                  closestLog = log;
                }
              }

              if (!closestLog) return 'Brak danych';

              const actualDiffDays = (latestTime - new Date(closestLog.date).getTime()) / (24 * 60 * 60 * 1000);
              if (days === 7 && actualDiffDays < 4) return 'Brak danych';
              if (days === 30 && actualDiffDays < 15) return 'Brak danych';

              const diff = latestLog.weight - closestLog.weight;
              const sign = diff > 0 ? '+' : '';
              return `${sign}${diff.toFixed(1)} kg`;
            };

            const change7d = getChangeForDays(7);
            const change30d = getChangeForDays(30);

            return (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                <div className="card text-center" style={{ padding: '12px', gap: '4px' }}>
                  <span className="text-muted" style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold' }}>Aktualna waga</span>
                  <strong style={{ fontSize: '20px', color: 'var(--accent)' }}>
                    {latestWeight !== null ? `${latestWeight} kg` : 'Brak danych'}
                  </strong>
                </div>
                <div className="card text-center" style={{ padding: '12px', gap: '4px' }}>
                  <span className="text-muted" style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold' }}>Najniższa / Najwyższa</span>
                  <strong style={{ fontSize: '15px' }}>
                    {minWeightVal !== null ? `${minWeightVal} kg` : '-'} / {maxWeightVal !== null ? `${maxWeightVal} kg` : '-'}
                  </strong>
                </div>
                <div className="card text-center" style={{ padding: '12px', gap: '4px' }}>
                  <span className="text-muted" style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold' }}>Zmiana (7 dni)</span>
                  <strong style={{ fontSize: '16px', color: change7d.startsWith('-') ? 'var(--accent-success)' : change7d.startsWith('+') ? 'var(--accent-danger)' : 'var(--text-secondary)' }}>
                    {change7d}
                  </strong>
                </div>
                <div className="card text-center" style={{ padding: '12px', gap: '4px' }}>
                  <span className="text-muted" style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold' }}>Zmiana (30 dni)</span>
                  <strong style={{ fontSize: '16px', color: change30d.startsWith('-') ? 'var(--accent-success)' : change30d.startsWith('+') ? 'var(--accent-danger)' : 'var(--text-secondary)' }}>
                    {change30d}
                  </strong>
                </div>
              </div>
            );
          })()}

          {/* SVG Weight Chart */}
          {(() => {
            if (weightLogs.length < 2) {
              return (
                <div className="card text-center" style={{ padding: '32px 16px' }}>
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
                    <line x1="18" y1="20" x2="18" y2="10" />
                    <line x1="12" y1="20" x2="12" y2="4" />
                    <line x1="6" y1="20" x2="6" y2="14" />
                  </svg>
                  <p className="text-muted">Brak wystarczającej ilości danych do wygenerowania wykresu wagi.</p>
                </div>
              );
            }

            const weights = weightLogs.map((l) => l.weight);
            let minWeight = Math.min(...weights);
            let maxWeight = Math.max(...weights);

            if (minWeight === maxWeight) {
              minWeight = Math.max(0, minWeight - 5);
              maxWeight = maxWeight + 5;
            } else {
              const range = maxWeight - minWeight;
              minWeight = Math.max(0, minWeight - range * 0.15);
              maxWeight = maxWeight + range * 0.15;
            }

            minWeight = Math.floor(minWeight);
            maxWeight = Math.ceil(maxWeight);

            const wWidth = 500;
            const wHeight = 260;
            const wPadding = { top: 30, right: 30, bottom: 50, left: 50 };
            const wChartWidth = wWidth - wPadding.left - wPadding.right;
            const wChartHeight = wHeight - wPadding.top - wPadding.bottom;

            const weightPoints = weightLogs.map((log, idx) => {
              const x = wPadding.left + (weightLogs.length > 1 ? (idx / (weightLogs.length - 1)) * wChartWidth : wChartWidth / 2);
              const y = wPadding.top + wChartHeight - ((log.weight - minWeight) / (maxWeight - minWeight)) * wChartHeight;
              const dateObj = new Date(log.date);
              const dateStr = dateObj.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' });
              const fullDateStr = dateObj.toLocaleDateString('pl-PL', {
                weekday: 'long',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
              });
              return {
                x,
                y,
                val: log.weight,
                dateStr,
                fullDateStr,
                log
              };
            });

            const wLineD = `M ${weightPoints.map((p) => `${p.x} ${p.y}`).join(' L ')}`;
            const wAreaD = `${wLineD} L ${weightPoints[weightPoints.length - 1].x} ${wPadding.top + wChartHeight} L ${weightPoints[0].x} ${wPadding.top + wChartHeight} Z`;

            const wGridCount = 4;
            const wGridLines = Array.from({ length: wGridCount }).map((_, idx) => {
              const val = minWeight + (idx / (wGridCount - 1)) * (maxWeight - minWeight);
              const y = wPadding.top + wChartHeight - (idx / (wGridCount - 1)) * wChartHeight;
              return { y, val: val.toFixed(1) };
            });

            const displayPoint = activeWeightPointIdx !== null && activeWeightPointIdx < weightPoints.length
              ? weightPoints[activeWeightPointIdx]
              : weightPoints[weightPoints.length - 1];

            return (
              <div className="flex-column gap-16">
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
                        Wpis z {displayPoint.fullDateStr}
                      </span>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        Źródło: <strong>{displayPoint.log.source === 'workout' ? 'Trening' : 'Ręczny'}</strong>
                      </span>
                    </div>
                    <div className="text-center">
                      <span className="text-muted" style={{ fontSize: '11px', textTransform: 'uppercase' }}>
                        Waga
                      </span>
                      <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--accent)' }}>
                        {displayPoint.val} kg
                      </div>
                    </div>
                  </div>
                )}

                <div className="card" style={{ padding: '16px 8px 8px 8px' }}>
                  <div style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
                    <svg
                      width="100%"
                      height="100%"
                      viewBox={`0 0 ${wWidth} ${wHeight}`}
                      style={{ overflow: 'visible', display: 'block' }}
                    >
                      <defs>
                        <linearGradient id="weight-chart-gradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Horizontal Gridlines */}
                      {wGridLines.map((line, idx) => (
                        <g key={idx}>
                          <line
                            x1={wPadding.left}
                            y1={line.y}
                            x2={wWidth - wPadding.right}
                            y2={line.y}
                            stroke="var(--border)"
                            strokeWidth="1"
                            strokeDasharray="4 4"
                          />
                          <text
                            x={wPadding.left - 10}
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

                      {/* Axis lines */}
                      <line
                        x1={wPadding.left}
                        y1={wPadding.top}
                        x2={wPadding.left}
                        y2={wPadding.top + wChartHeight}
                        stroke="var(--border)"
                        strokeWidth="1"
                      />
                      <line
                        x1={wPadding.left}
                        y1={wPadding.top + wChartHeight}
                        x2={wWidth - wPadding.right}
                        y2={wPadding.top + wChartHeight}
                        stroke="var(--border)"
                        strokeWidth="1"
                      />

                      {/* Chart paths */}
                      <path d={wAreaD} fill="url(#weight-chart-gradient)" />
                      <path
                        d={wLineD}
                        fill="none"
                        stroke="var(--accent)"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {/* Interactive Circles */}
                      {weightPoints.map((p, idx) => {
                        const isActive =
                          activeWeightPointIdx === idx || (activeWeightPointIdx === null && idx === weightPoints.length - 1);
                        return (
                          <g key={idx}>
                            <circle
                              cx={p.x}
                              cy={p.y}
                              r="14"
                              fill="transparent"
                              style={{ cursor: 'pointer' }}
                              onClick={() => setActiveWeightPointIdx(idx)}
                            />
                            <circle
                              cx={p.x}
                              cy={p.y}
                              r={isActive ? '6' : '4'}
                              fill={isActive ? 'var(--accent)' : 'var(--bg-primary)'}
                              stroke="var(--accent)"
                              strokeWidth="2"
                              style={{ transition: 'all 0.1s ease', cursor: 'pointer' }}
                              onClick={() => setActiveWeightPointIdx(idx)}
                            />
                            {(() => {
                              const total = weightPoints.length;
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
                                  y={wPadding.top + wChartHeight + 20}
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
                  <p className="text-center text-muted" style={{ fontSize: '11px', marginTop: '12px' }}>
                    Wskazówka: Dotknij punktu na wykresie, aby zobaczyć szczegóły.
                  </p>
                </div>
              </div>
            );
          })()}

          {/* Quick Weight Add Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const parsedWeight = parseFloat(newWeightVal);
              if (isNaN(parsedWeight) || parsedWeight <= 0) return;

              const newLog: WeightLog = {
                id: typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
                  ? crypto.randomUUID()
                  : 'weight-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
                date: new Date(newWeightDate + 'T12:00:00').toISOString(),
                weight: parsedWeight,
                source: 'manual',
              };

              const updated = saveWeightLog(newLog);
              setWeightLogs(updated);
              setNewWeightDate(getTodayDateStr());
            }}
            className="card flex-column gap-12"
          >
            <h3 style={{ fontSize: '15px' }}>Dodaj pomiar wagi</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="new-weight-date">Data</label>
                <input
                  id="new-weight-date"
                  type="date"
                  className="input-text"
                  value={newWeightDate}
                  onChange={(e) => setNewWeightDate(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="new-weight-val">Waga (kg)</label>
                <input
                  id="new-weight-val"
                  type="number"
                  step="0.1"
                  className="input-text"
                  value={newWeightVal}
                  onChange={(e) => setNewWeightVal(e.target.value)}
                  required
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-full">
              + Dodaj wagę
            </button>
          </form>

          {/* Weight History List */}
          <div className="card flex-column gap-12">
            <h3 style={{ fontSize: '15px' }}>Historia pomiarów</h3>
            {weightLogs.length === 0 ? (
              <p className="text-center text-muted" style={{ padding: '16px 0' }}>Brak pomiarów w bazie.</p>
            ) : (
              <div className="flex-column" style={{ gap: '8px' }}>
                {[...weightLogs].reverse().map((log) => {
                  const isEditing = editingId === log.id;
                  const formattedDate = new Date(log.date).toLocaleDateString('pl-PL', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  });

                  // Display workout source name if available
                  let sourceText = 'Ręczny';
                  if (log.source === 'workout') {
                    const matchedWorkout = history.find((w) => w.id === log.workoutId);
                    sourceText = matchedWorkout ? matchedWorkout.name : 'Trening';
                  }

                  const badgeStyle = {
                    fontSize: '11px',
                    fontWeight: '600' as const,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    color: log.source === 'workout' ? 'var(--accent)' : 'var(--text-secondary)',
                    background: log.source === 'workout' ? 'rgba(0, 210, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                  };

                  return (
                    <div
                      key={log.id}
                      className="flex-row justify-between align-center"
                      style={{
                        padding: '10px 12px',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        backgroundColor: 'var(--bg-surface)',
                      }}
                    >
                      <div className="flex-column" style={{ gap: '4px' }}>
                        <span style={{ fontSize: '13px', fontWeight: '500' }}>{formattedDate}</span>
                        <div className="flex-row" style={{ gap: '6px' }}>
                          <span style={badgeStyle}>{sourceText}</span>
                        </div>
                      </div>

                      <div className="flex-row align-center" style={{ gap: '12px' }}>
                        {isEditing ? (
                          <>
                            <input
                              type="number"
                              step="0.1"
                              className="input-text"
                              style={{ width: '80px', padding: '4px 8px', fontSize: '14px', textAlign: 'center' }}
                              value={editingWeight}
                              onChange={(e) => setEditingWeight(e.target.value)}
                              autoFocus
                            />
                            <div className="flex-row" style={{ gap: '4px' }}>
                              <button
                                type="button"
                                className="btn btn-success btn-sm"
                                onClick={() => {
                                  const parsed = parseFloat(editingWeight);
                                  if (isNaN(parsed) || parsed <= 0) return;
                                  const updatedLog = { ...log, weight: parsed };
                                  const updated = saveWeightLog(updatedLog);
                                  setWeightLogs(updated);
                                  setEditingId(null);
                                }}
                                style={{ padding: '6px 10px' }}
                              >
                                Zapisz
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => setEditingId(null)}
                                style={{ padding: '6px 10px' }}
                              >
                                Anuluj
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <span style={{ fontSize: '16px', fontWeight: '700', color: 'var(--accent)' }}>
                              {log.weight} kg
                            </span>
                            <div className="flex-row" style={{ gap: '4px' }}>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => {
                                  setEditingId(log.id);
                                  setEditingWeight(log.weight.toString());
                                }}
                                style={{ padding: '6px 10px' }}
                              >
                                Edytuj
                              </button>
                              <button
                                type="button"
                                className="btn btn-danger btn-sm"
                                onClick={() => {
                                  if (window.confirm('Czy na pewno chcesz usunąć ten wpis wagi?')) {
                                    const updated = deleteWeightLog(log.id);
                                    setWeightLogs(updated);
                                    setActiveWeightPointIdx(null);
                                  }
                                }}
                                style={{ padding: '6px 10px' }}
                              >
                                Usuń
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'correlation' && (
        <div className="card text-center" style={{ padding: '48px 16px' }}>
          <h3>Widok korelacji - w przygotowaniu</h3>
        </div>
      )}

      {activeTab === 'exercises' && (
        <>
          {/* Selector and filters */}
          <div className="card flex-column gap-12">
            <div className="form-group">
              <label className="form-label" htmlFor="exercise-select">Ćwiczenie</label>
              <select
                id="exercise-select"
                className="input-text"
                value={selectedExerciseId}
                onChange={(e) => {
                  const newExerciseId = e.target.value;
                  setSelectedExerciseId(newExerciseId);
                  setActivePointIdx(null);
                  const newEx = exercises.find((ex) => ex.id === newExerciseId);
                  if (newEx?.isBodyweight) {
                    setMetric('maxReps');
                  } else {
                    setMetric('1rm');
                  }
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {isBodyweight ? (
                  <>
                    <button
                      type="button"
                      className={`chip-btn ${metric === 'maxReps' ? 'active' : ''}`}
                      onClick={() => setMetric('maxReps')}
                      style={{ textAlign: 'center' }}
                    >
                      Maks. Powtórzenia
                    </button>
                    <button
                      type="button"
                      className={`chip-btn ${metric === 'sumReps' ? 'active' : ''}`}
                      onClick={() => setMetric('sumReps')}
                      style={{ textAlign: 'center' }}
                    >
                      Suma Powtórzeń
                    </button>
                    <button
                      type="button"
                      className={`chip-btn ${metric === 'maxExtraWeight' ? 'active' : ''}`}
                      onClick={() => setMetric('maxExtraWeight')}
                      style={{ textAlign: 'center' }}
                    >
                      Maks. Dodatkowy Ciężar
                    </button>
                    <button
                      type="button"
                      className={`chip-btn ${metric === 'volumeExtra' ? 'active' : ''}`}
                      onClick={() => setMetric('volumeExtra')}
                      style={{ textAlign: 'center' }}
                    >
                      Objętość Dodatkowa
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className={`chip-btn ${metric === '1rm' ? 'active' : ''}`}
                      onClick={() => setMetric('1rm')}
                      style={{ textAlign: 'center' }}
                    >
                      Szacowany 1RM
                    </button>
                    <button
                      type="button"
                      className={`chip-btn ${metric === 'maxWeight' ? 'active' : ''}`}
                      onClick={() => setMetric('maxWeight')}
                      style={{ textAlign: 'center' }}
                    >
                      Maks. Ciężar
                    </button>
                    <button
                      type="button"
                      className={`chip-btn ${metric === 'volume' ? 'active' : ''}`}
                      onClick={() => setMetric('volume')}
                      style={{ textAlign: 'center' }}
                    >
                      Suma Objętości
                    </button>
                    <button
                      type="button"
                      className={`chip-btn ${metric === 'maxReps' ? 'active' : ''}`}
                      onClick={() => setMetric('maxReps')}
                      style={{ textAlign: 'center' }}
                    >
                      Maks. Powtórzenia
                    </button>
                  </>
                )}
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
                      {getMetricLabel(metric)}
                    </span>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--accent)' }}>
                      {displayPoint.val} {getMetricUnit(metric)}
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
                    {showWeightLine && points.length > 1 ? (
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
                    <span className="text-muted">{getMetricLabel(metric)}</span>
                  </div>
                  {showWeightLine && (
                    <div className="flex-row align-center gap-4">
                      <div style={{ width: '12px', height: '1.5px', borderBottom: '1.5px dashed var(--text-secondary)', opacity: 0.6 }} />
                      <span className="text-muted">Waga ciała</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Stats overview */}
              {isBodyweight ? (
                <div className="card flex-column gap-8" style={{ fontSize: '14px' }}>
                  <h3>Przegląd osiągnięć</h3>
                  <div className="flex-row justify-between" style={{ padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <span className="text-muted">Suma wszystkich powtórzeń:</span>
                    <strong>{totalRepsAllSessions}</strong>
                  </div>
                  <div className="flex-row justify-between" style={{ padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <span className="text-muted">Maks. powtórzenia w serii:</span>
                    <strong>{maxRepsAllSessions}</strong>
                  </div>
                  <div className="flex-row justify-between" style={{ padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <span className="text-muted">Rekordowy dodatkowy ciężar:</span>
                    <strong style={{ color: 'var(--accent-success)' }}>
                      {recordExtraWeight} kg
                    </strong>
                  </div>
                  <div className="flex-row justify-between" style={{ padding: '4px 0' }}>
                    <span className="text-muted">Najlepsza objętość dodatkowa:</span>
                    <strong style={{ color: 'var(--accent)' }}>
                      {bestVolumeExtra} kg
                    </strong>
                  </div>
                </div>
              ) : (
                <div className="card flex-column gap-8" style={{ fontSize: '14px' }}>
                  <h3>Przegląd osiągnięć</h3>
                  <div className="flex-row justify-between" style={{ padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <span className="text-muted">Całkowita liczba sesji:</span>
                    <strong>{totalSessions}</strong>
                  </div>
                  <div className="flex-row justify-between" style={{ padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <span className="text-muted">Rekordowy ciężar (Max):</span>
                    <strong style={{ color: 'var(--accent-success)' }}>
                      {recordWeight} kg
                    </strong>
                  </div>
                  <div className="flex-row justify-between" style={{ padding: '4px 0' }}>
                    <span className="text-muted">Najlepszy szacowany 1RM:</span>
                    <strong style={{ color: 'var(--accent)' }}>
                      {bestEstimated1RM} kg
                    </strong>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
