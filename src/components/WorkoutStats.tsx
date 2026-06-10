import { useState } from 'react';
import { getExercises, getHistory, getSettings, getWeightHistory } from '../services/storage';
import type { Exercise, LoggedWorkout, WeightLog } from '../types';

type ChartViewType = 'maxWeight_maxReps' | 'sumReps_volume';

interface ChartPoint {
  x: number;
  yLeft: number;
  yRight: number;
  yReps: number;
  leftVal: number;
  rightVal: number;
  repsVal: number;
  dateStr: string;
  fullDateStr: string;
  maxReps: number;
  sumReps: number;
  maxWeight: number;
  volume: number;
  estimated1RM: number;
  bodyWeight: number;
}

const getWorkoutBodyWeight = (workout: LoggedWorkout, weightLogs: WeightLog[], settingsUserWeight?: number): number => {
  if (workout.bodyWeight !== undefined && workout.bodyWeight !== null && workout.bodyWeight > 0) {
    return workout.bodyWeight;
  }
  if (weightLogs.length > 0) {
    const workoutTime = new Date(workout.startTime).getTime();
    let closestLog = weightLogs[0];
    let minDiff = Math.abs(new Date(closestLog.date).getTime() - workoutTime);
    for (let i = 1; i < weightLogs.length; i++) {
      const diff = Math.abs(new Date(weightLogs[i].date).getTime() - workoutTime);
      if (diff < minDiff) {
        minDiff = diff;
        closestLog = weightLogs[i];
      }
    }
    return closestLog.weight;
  }
  return settingsUserWeight || 80;
};

export function WorkoutStats() {
  const [exercises] = useState<Exercise[]>(() => getExercises());
  const [history] = useState<LoggedWorkout[]>(() => getHistory());
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>(() => {
    const loadedExercises = getExercises();
    return loadedExercises.length > 0 ? loadedExercises[0].id : '';
  });
  const [chartView, setChartView] = useState<ChartViewType>('maxWeight_maxReps');
  const [activePointIdx, setActivePointIdx] = useState<number | null>(null);

  const settings = getSettings();
  const weightLogs = getWeightHistory();
  const selectedExercise = exercises.find((e) => e.id === selectedExerciseId);

  // Group and calculate stats chronologically
  const exerciseSessions = history
    .filter((workout) =>
      workout.exercises.some((ex) => ex.exerciseId === selectedExerciseId)
    )
    .map((workout) => {
      const workoutEx = workout.exercises.find((ex) => ex.exerciseId === selectedExerciseId)!;
      const bw = getWorkoutBodyWeight(workout, weightLogs, settings.userWeight);
      
      const completedSets = workoutEx.sets.filter((s) => s.completed);
      const targetSets = completedSets.length > 0 ? completedSets : workoutEx.sets;

      const maxReps = targetSets.reduce((max, s) => Math.max(max, s.reps), 0);
      const sumReps = targetSets.reduce((sum, s) => sum + s.reps, 0);
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
  const padding = { top: 30, right: 50, bottom: 50, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  let points: ChartPoint[] = [];
  let lineLeftD = '';
  let areaLeftD = '';
  let lineRightD = '';
  let lineRepsD = '';
  
  let leftGridLines: { y: number; val: string }[] = [];
  let rightGridLines: { y: number; val: string }[] = [];
  
  let minLeft = 0;
  let maxLeft = 0;
  let minRight = 0;
  let maxRight = 0;
  let minReps = 0;
  let maxReps = 0;

  if (exerciseSessions.length > 0) {
    // Left axis metric: Max Weight or Volume
    const leftValues = exerciseSessions.map((d) => chartView === 'maxWeight_maxReps' ? d.maxWeight : d.volume);
    minLeft = Math.min(...leftValues);
    maxLeft = Math.max(...leftValues);
    if (minLeft === maxLeft) {
      minLeft = Math.max(0, minLeft - 5);
      maxLeft = maxLeft + 5;
    } else {
      const range = maxLeft - minLeft;
      minLeft = Math.max(0, minLeft - range * 0.15);
      maxLeft = maxLeft + range * 0.15;
    }
    minLeft = Math.floor(minLeft);
    maxLeft = Math.ceil(maxLeft);

    // Right axis metric: Body Weight
    const rightValues = exerciseSessions.map((d) => d.bodyWeight);
    minRight = Math.min(...rightValues);
    maxRight = Math.max(...rightValues);
    if (minRight === maxRight) {
      minRight = Math.max(0, minRight - 5);
      maxRight = maxRight + 5;
    } else {
      const range = maxRight - minRight;
      minRight = Math.max(0, minRight - range * 0.15);
      maxRight = maxRight + range * 0.15;
    }
    minRight = Math.floor(minRight);
    maxRight = Math.ceil(maxRight);

    // Reps metric: Max Reps or Sum of Reps
    const repsValues = exerciseSessions.map((d) => chartView === 'maxWeight_maxReps' ? d.maxReps : d.sumReps);
    minReps = Math.min(...repsValues);
    maxReps = Math.max(...repsValues);
    if (minReps === maxReps) {
      minReps = Math.max(0, minReps - 2);
      maxReps = maxReps + 2;
    } else {
      const range = maxReps - minReps;
      minReps = Math.max(0, minReps - range * 0.15);
      maxReps = maxReps + range * 0.15;
    }
    minReps = Math.floor(minReps);
    maxReps = Math.ceil(maxReps);

    points = exerciseSessions.map((d, i) => {
      const x = padding.left + (exerciseSessions.length > 1 ? (i / (exerciseSessions.length - 1)) * chartWidth : chartWidth / 2);
      
      const leftVal = chartView === 'maxWeight_maxReps' ? d.maxWeight : d.volume;
      const rightVal = d.bodyWeight;
      const repsVal = chartView === 'maxWeight_maxReps' ? d.maxReps : d.sumReps;

      const yLeft = padding.top + chartHeight - ((leftVal - minLeft) / (maxLeft - minLeft)) * chartHeight;
      const yRight = padding.top + chartHeight - ((rightVal - minRight) / (maxRight - minRight)) * chartHeight;
      const yReps = padding.top + chartHeight - ((repsVal - minReps) / (maxReps - minReps)) * chartHeight;

      return {
        x,
        yLeft,
        yRight,
        yReps,
        leftVal,
        rightVal,
        repsVal,
        dateStr: d.dateStr,
        fullDateStr: d.fullDateStr,
        maxReps: d.maxReps,
        sumReps: d.sumReps,
        maxWeight: d.maxWeight,
        volume: d.volume,
        estimated1RM: d.estimated1RM,
        bodyWeight: d.bodyWeight,
      };
    });

    if (points.length > 1) {
      lineLeftD = `M ${points.map((p) => `${p.x} ${p.yLeft}`).join(' L ')}`;
      areaLeftD = `${lineLeftD} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`;
      lineRightD = `M ${points.map((p) => `${p.x} ${p.yRight}`).join(' L ')}`;
      lineRepsD = `M ${points.map((p) => `${p.x} ${p.yReps}`).join(' L ')}`;
    }

    // Grid ticks
    const gridCount = 4;
    leftGridLines = Array.from({ length: gridCount }).map((_, idx) => {
      const val = minLeft + (idx / (gridCount - 1)) * (maxLeft - minLeft);
      const y = padding.top + chartHeight - (idx / (gridCount - 1)) * chartHeight;
      return { y, val: val.toFixed(0) };
    });

    rightGridLines = Array.from({ length: gridCount }).map((_, idx) => {
      const val = minRight + (idx / (gridCount - 1)) * (maxRight - minRight);
      const y = padding.top + chartHeight - (idx / (gridCount - 1)) * chartHeight;
      return { y, val: val.toFixed(1) };
    });
  }

  // Active point info display (defaults to the latest one)
  const displayPoint =
    activePointIdx !== null
      ? points[activePointIdx]
      : points.length > 0
      ? points[points.length - 1]
      : null;

  // Achievement stats
  const totalSessions = exerciseSessions.length;
  const recordWeight = exerciseSessions.reduce((max, s) => Math.max(max, s.maxWeight), 0);
  const bestEstimated1RM = exerciseSessions.reduce((max, s) => Math.max(max, s.estimated1RM), 0);
  const maxRepsAllSessions = exerciseSessions.reduce((max, s) => Math.max(max, s.maxReps), 0);
  const totalRepsAllSessions = exerciseSessions.reduce((sum, s) => sum + s.sumReps, 0);

  // Motivational description comparing earliest and latest session
  let motivationalDescription = '';
  if (exerciseSessions.length >= 2) {
    const earliest = exerciseSessions[0];
    const latest = exerciseSessions[exerciseSessions.length - 1];
    const deltaWeight = latest.bodyWeight - earliest.bodyWeight;

    if (chartView === 'maxWeight_maxReps') {
      const deltaMaxWeight = latest.maxWeight - earliest.maxWeight;
      const deltaMaxReps = latest.maxReps - earliest.maxReps;

      const weightSign = deltaMaxWeight >= 0 ? '+' : '';
      const repsSign = deltaMaxReps >= 0 ? '+' : '';

      const performanceText = `maksymalny ciężar zmienił się o ${weightSign}${deltaMaxWeight.toFixed(1)} kg, a maks. powtórzenia o ${repsSign}${deltaMaxReps} powt.`;

      if (deltaWeight < 0) {
        motivationalDescription = `Twoja waga spadła o ${Math.abs(deltaWeight).toFixed(1)} kg. W tym czasie Twój ${performanceText}. Spadek masy ciała często poprawia siłę względną i ułatwia ruchy z obciążeniem.`;
      } else if (deltaWeight > 0) {
        motivationalDescription = `Twoja waga wzrosła o ${deltaWeight.toFixed(1)} kg. W tym czasie Twój ${performanceText}. Przyrost masy ciała może wspierać budowanie siły absolutnej, ale stawia też większe wyzwania przed kontrolą ciała.`;
      } else {
        motivationalDescription = `Twoja waga pozostała bez zmian. W tym czasie Twój ${performanceText}. Stabilizacja wagi sprzyja precyzyjnej ocenie czystego progresu siłowego.`;
      }
    } else {
      const deltaVolume = latest.volume - earliest.volume;
      const deltaSumReps = latest.sumReps - earliest.sumReps;

      const volSign = deltaVolume >= 0 ? '+' : '';
      const repsSign = deltaSumReps >= 0 ? '+' : '';

      const performanceText = `objętość treningowa zmieniła się o ${volSign}${deltaVolume.toFixed(1)} kg, a suma powtórzeń o ${repsSign}${deltaSumReps} powt.`;

      if (deltaWeight < 0) {
        motivationalDescription = `Twoja waga spadła o ${Math.abs(deltaWeight).toFixed(1)} kg. W tym czasie Twoja ${performanceText}. Gratulacje za utrzymanie lub poprawę objętości pracy przy niższej masie ciała!`;
      } else if (deltaWeight > 0) {
        motivationalDescription = `Twoja waga wzrosła o ${deltaWeight.toFixed(1)} kg. W tym czasie Twoja ${performanceText}. Dodatkowa masa ciała pomaga w generowaniu wyższej objętości treningowej, o ile idzie w parze z odpowiednią regeneracją.`;
      } else {
        motivationalDescription = `Twoja waga pozostała bez zmian. W tym czasie Twoja ${performanceText}. Świetny punkt odniesienia do analizy wydolności mięśniowej.`;
      }
    }
  }

  return (
    <div className="flex-column gap-16" style={{ paddingBottom: '32px' }}>
      <div>
        <h2>Wykresy i Statystyki</h2>
        <p className="text-muted" style={{ fontSize: '13px', marginTop: '2px' }}>
          Śledź swój progres siłowy i objętościowy skorelowany z wagą ciała.
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              type="button"
              className={`chip-btn ${chartView === 'maxWeight_maxReps' ? 'active' : ''}`}
              onClick={() => setChartView('maxWeight_maxReps')}
              style={{ textAlign: 'center' }}
            >
              Maks. Ciężar + Maks. Powtórzenia
            </button>
            <button
              type="button"
              className={`chip-btn ${chartView === 'sumReps_volume' ? 'active' : ''}`}
              onClick={() => setChartView('sumReps_volume')}
              style={{ textAlign: 'center' }}
            >
              Suma Powtórzeń + Objętość
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
                  Waga ciała w tej sesji: <strong style={{ color: 'var(--text-primary)' }}>{displayPoint.bodyWeight.toFixed(1)} kg</strong>
                </span>
              </div>
              <div className="text-center">
                {chartView === 'maxWeight_maxReps' ? (
                  <div className="flex-column" style={{ gap: '2px', alignItems: 'flex-end' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      Maks. Ciężar: <strong style={{ color: 'var(--accent)' }}>{displayPoint.maxWeight} kg</strong>
                    </span>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      Maks. Powtórzenia: <strong style={{ color: '#00e676' }}>{displayPoint.maxReps} powt.</strong>
                    </span>
                  </div>
                ) : (
                  <div className="flex-column" style={{ gap: '2px', alignItems: 'flex-end' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      Objętość: <strong style={{ color: 'var(--accent)' }}>{displayPoint.volume} kg</strong>
                    </span>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      Suma Powtórzeń: <strong style={{ color: '#00e676' }}>{displayPoint.sumReps} powt.</strong>
                    </span>
                  </div>
                )}
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
                  <linearGradient id="stats-chart-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Gridlines */}
                {leftGridLines.map((line, idx) => (
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
                    {/* Left Y Axis Labels (Weight or Volume) */}
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

                {/* Right Y Axis Labels (Body Weight) */}
                {rightGridLines.map((line, idx) => (
                  <text
                    key={idx}
                    x={width - padding.right + 10}
                    y={line.y + 4}
                    fill="var(--text-secondary)"
                    fontSize="11"
                    textAnchor="start"
                    fontWeight="500"
                  >
                    {line.val}
                  </text>
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

                {/* Right vertical axis line */}
                <line
                  x1={width - padding.right}
                  y1={padding.top}
                  x2={width - padding.right}
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

                {/* Draw Gradient Area for Left Axis line */}
                {points.length > 1 && (
                  <path d={areaLeftD} fill="url(#stats-chart-gradient)" />
                )}

                {/* Draw Body Weight Line (Right Axis - Dashed) */}
                {points.length > 1 && (
                  <path
                    d={lineRightD}
                    fill="none"
                    stroke="var(--text-secondary)"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.5"
                  />
                )}

                {/* Draw Reps Line (Normalized - Green) */}
                {points.length > 1 && (
                  <path
                    d={lineRepsD}
                    fill="none"
                    stroke="#00e676"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Draw Primary Metric Line (Left Axis - Solid Blue) */}
                {points.length > 1 && (
                  <path
                    d={lineLeftD}
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Circles for Data Points with Interaction */}
                {points.map((p, idx) => {
                  const isActive =
                    activePointIdx === idx || (activePointIdx === null && idx === points.length - 1);
                  return (
                    <g key={idx}>
                      {/* Transparent larger circle for easier touching/clicking */}
                      <circle
                        cx={p.x}
                        cy={p.yLeft}
                        r="14"
                        fill="transparent"
                        style={{ cursor: 'pointer' }}
                        onClick={() => setActivePointIdx(idx)}
                      />

                      {/* Displayed circle marker on Left Line */}
                      <circle
                        cx={p.x}
                        cy={p.yLeft}
                        r={isActive ? '6' : '4'}
                        fill={isActive ? 'var(--accent)' : 'var(--bg-primary)'}
                        stroke="var(--accent)"
                        strokeWidth="2.5"
                        style={{ transition: 'all 0.1s ease', cursor: 'pointer' }}
                        onClick={() => setActivePointIdx(idx)}
                      />

                      {/* Displayed circle marker on Reps Line */}
                      <circle
                        cx={p.x}
                        cy={p.yReps}
                        r={isActive ? '5' : '3.5'}
                        fill={isActive ? '#00e676' : 'var(--bg-primary)'}
                        stroke="#00e676"
                        strokeWidth="2"
                        style={{ transition: 'all 0.1s ease', cursor: 'pointer' }}
                        onClick={() => setActivePointIdx(idx)}
                      />

                      {/* Date Axis Label */}
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
            <div className="flex-row justify-center gap-16" style={{ marginTop: '8px', fontSize: '11px', borderTop: '1px solid var(--border)', paddingTop: '8px', flexWrap: 'wrap' }}>
              <div className="flex-row align-center gap-4">
                <div style={{ width: '12px', height: '3px', background: 'var(--accent)', borderRadius: '1px' }} />
                <span className="text-muted">
                  {chartView === 'maxWeight_maxReps' ? 'Maks. Ciężar' : 'Suma Objętości'} (lewa oś Y)
                </span>
              </div>
              <div className="flex-row align-center gap-4">
                <div style={{ width: '12px', height: '3px', background: '#00e676', borderRadius: '1px' }} />
                <span className="text-muted">
                  {chartView === 'maxWeight_maxReps' ? 'Maks. Powtórzenia' : 'Suma Powtórzeń'} (trend)
                </span>
              </div>
              <div className="flex-row align-center gap-4">
                <div style={{ width: '12px', height: '1.5px', borderBottom: '1.5px dashed var(--text-secondary)', opacity: 0.6 }} />
                <span className="text-muted">Waga ciała (prawa oś Y)</span>
              </div>
            </div>
          </div>

          {/* Quick Stats overview */}
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
            <div className="flex-row justify-between" style={{ padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
              <span className="text-muted">Najlepszy szacowany 1RM:</span>
              <strong style={{ color: 'var(--accent)' }}>
                {bestEstimated1RM} kg
              </strong>
            </div>
            <div className="flex-row justify-between" style={{ padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
              <span className="text-muted">Maks. powtórzenia w serii:</span>
              <strong>{maxRepsAllSessions}</strong>
            </div>
            <div className="flex-row justify-between" style={{ padding: '4px 0' }}>
              <span className="text-muted">Suma powtórzeń (ogółem):</span>
              <strong>{totalRepsAllSessions}</strong>
            </div>
          </div>

          {/* Motivational description card */}
          {motivationalDescription && (
            <div className="card flex-column gap-12" style={{ padding: '16px', background: 'rgba(0, 210, 255, 0.03)', borderLeft: '4px solid var(--accent)' }}>
              <div className="flex-row align-center gap-8">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A5 5 0 0 0 8 8c0 1 .3 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
                  <line x1="9" y1="18" x2="15" y2="18" />
                  <line x1="10" y1="22" x2="14" y2="22" />
                </svg>
                <h4 style={{ fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--accent)', letterSpacing: '0.5px' }}>
                  Analiza trendu wagi i siły
                </h4>
              </div>
              <p style={{ fontSize: '13.5px', lineHeight: '1.6', color: 'var(--text-secondary)', margin: 0 }}>
                {motivationalDescription}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
