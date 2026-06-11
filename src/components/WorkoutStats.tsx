import { useState } from 'react';
import { getExercises, getHistory, getWeightHistory, getSettings } from '../services/storage';
import type { Exercise, LoggedWorkout, WeightLog, AppSettings } from '../types';

type ChartViewType = 'maxWeight_maxReps' | 'sumReps_volume';

interface ChartPoint {
  x: number;
  yLeft: number;
  yRight?: number;
  yReps: number;
  leftVal: number;
  rightVal?: number;
  repsVal: number;
  dateStr: string;
  fullDateStr: string;
  maxReps: number;
  sumReps: number;
  maxWeight: number;
  volume: number;
  estimated1RM: number;
  bodyWeight?: number;
}

const getWorkoutBodyWeight = (workout: LoggedWorkout, weightLogs: WeightLog[]): number | undefined => {
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
  return undefined;
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

  const weightLogs = getWeightHistory();
  const selectedExercise = exercises.find((e) => e.id === selectedExerciseId);

  // Group and calculate stats chronologically
  const exerciseSessions = history
    .filter((workout) =>
      workout.exercises.some((ex) => ex.exerciseId === selectedExerciseId)
    )
    .map((workout) => {
      const workoutEx = workout.exercises.find((ex) => ex.exerciseId === selectedExerciseId)!;
      const bw = getWorkoutBodyWeight(workout, weightLogs);
      
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

  // Heatmap & Weekly Correlation logic
  const settings = getSettings();
  const WEEKS_COUNT = 16;
  const DAYS_COUNT = WEEKS_COUNT * 7;

  // Helper to find Monday of a given date
  const getMondayOfDate = (d: Date): Date => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
    date.setDate(diff);
    date.setHours(0, 0, 0, 0);
    return date;
  };

  // 1. Calculate Daily Heatmap
  const activityMap = new Map<string, boolean>();
  history.forEach((w) => {
    const d = new Date(w.startTime);
    if (!isNaN(d.getTime())) {
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      activityMap.set(dateKey, true);
    }
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const heatmapDays = [];
  for (let i = DAYS_COUNT - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    heatmapDays.push({
      dateKey,
      active: activityMap.has(dateKey),
      date: d,
    });
  }

  // 2. Calculate Weekly Streak
  const getWeeklyStreak = (hist: LoggedWorkout[]): number => {
    if (hist.length === 0) return 0;

    const activeMondays = new Set<string>();
    hist.forEach((w) => {
      const d = new Date(w.startTime);
      if (!isNaN(d.getTime())) {
        const mon = getMondayOfDate(d);
        const key = mon.toISOString().split('T')[0];
        activeMondays.add(key);
      }
    });

    const todayMon = getMondayOfDate(new Date());
    const todayMonKey = todayMon.toISOString().split('T')[0];

    const prevMon = new Date(todayMon);
    prevMon.setDate(todayMon.getDate() - 7);
    const prevMonKey = prevMon.toISOString().split('T')[0];

    const isPrevActive = activeMondays.has(prevMonKey);
    const isTodayActive = activeMondays.has(todayMonKey);

    if (!isPrevActive) {
      return isTodayActive ? 1 : 0;
    }

    let streak = 0;
    const currentCheck = new Date(prevMon);
    while (true) {
      const key = currentCheck.toISOString().split('T')[0];
      if (activeMondays.has(key)) {
        streak++;
        currentCheck.setDate(currentCheck.getDate() - 7);
      } else {
        break;
      }
    }

    if (isTodayActive) {
      streak += 1;
    }

    return streak;
  };

  const formatWeeksPolish = (n: number): string => {
    if (n === 1) return '1 tydzień';
    const lastDigit = n % 10;
    const lastTwoDigits = n % 100;
    if (lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 10 || lastTwoDigits >= 20)) {
      return `${n} tygodnie`;
    }
    return `${n} tygodni`;
  };

  const weeklyStreak = getWeeklyStreak(history);
  const weeklyStreakText = formatWeeksPolish(weeklyStreak);

  // Helper to resolve weight for a given week
  const getWeightForWeek = (start: Date, end: Date, wLogs: WeightLog[], opts: AppSettings): number | undefined => {
    const logsInWeek = wLogs.filter((l) => {
      const t = new Date(l.date).getTime();
      return t >= start.getTime() && t <= end.getTime();
    });
    if (logsInWeek.length > 0) {
      const sum = logsInWeek.reduce((acc, l) => acc + l.weight, 0);
      return parseFloat((sum / logsInWeek.length).toFixed(1));
    }
    const pastLogs = wLogs.filter((l) => new Date(l.date).getTime() < start.getTime());
    if (pastLogs.length > 0) {
      return pastLogs[pastLogs.length - 1].weight;
    }
    const futureLogs = wLogs.filter((l) => new Date(l.date).getTime() > end.getTime());
    if (futureLogs.length > 0) {
      return futureLogs[0].weight;
    }
    return opts.userWeight;
  };

  // 3. Generate 16 weeks data for correlation chart
  const currentMonday = getMondayOfDate(new Date());
  const weeksList = [];
  for (let i = 15; i >= 0; i--) {
    const start = new Date(currentMonday);
    start.setDate(currentMonday.getDate() - i * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    weeksList.push({ start, end });
  }

  const weeklyCorrelationData = weeksList.map((week, idx) => {
    const workoutsInWeek = history.filter((w) => {
      const t = new Date(w.startTime).getTime();
      return t >= week.start.getTime() && t <= week.end.getTime();
    });

    const wWeight = getWeightForWeek(week.start, week.end, weightLogs, settings);

    // Sum reps * weight for all completed sets in all workouts of this week
    let totalRepsWeightSum = 0;
    const workoutCount = workoutsInWeek.length;

    workoutsInWeek.forEach((w) => {
      w.exercises.forEach((ex) => {
        const completedSets = ex.sets.filter((s) => s.completed);
        const targetSets = completedSets.length > 0 ? completedSets : ex.sets;
        
        targetSets.forEach((set) => {
          if (set.weight > 0) {
            totalRepsWeightSum += set.reps * set.weight;
          } else {
            // zero weight represents a bodyweight exercise -> use current workout/week bodyWeight or settings
            const currentWorkoutBw = w.bodyWeight || wWeight || settings.userWeight || 0;
            totalRepsWeightSum += set.reps * currentWorkoutBw;
          }
        });
      });
    });

    const strengthLevel = workoutCount > 0 ? parseFloat((totalRepsWeightSum / workoutCount).toFixed(1)) : 0;
    const startLabel = week.start.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' });

    return {
      weekIndex: idx,
      start: week.start,
      end: week.end,
      strengthLevel,
      bodyWeight: wWeight,
      label: startLabel,
      workoutCount,
    };
  });

  // Calculate 16-week average strength level for active weeks
  const activeWeeks = weeklyCorrelationData.filter((wd) => wd.workoutCount > 0);
  const avgStrength16 = activeWeeks.length > 0
    ? activeWeeks.reduce((sum, wd) => sum + wd.strengthLevel, 0) / activeWeeks.length
    : 0;

  // Comparison Text
  const latestActiveWeek = [...weeklyCorrelationData].reverse().find((wd) => wd.workoutCount > 0);
  let weeklyComparisonText = '';
  if (latestActiveWeek && avgStrength16 > 0) {
    const diffPercent = ((latestActiveWeek.strengthLevel - avgStrength16) / avgStrength16) * 100;
    const isCurrentWeek = latestActiveWeek.weekIndex === 15;
    const weekLabel = isCurrentWeek ? 'w tym tygodniu' : `w tygodniu od ${latestActiveWeek.start.toLocaleDateString('pl-PL')}`;
    const sign = diffPercent >= 0 ? '+' : '';
    weeklyComparisonText = `Średnia waga treningu ${weekLabel} (${latestActiveWeek.strengthLevel.toFixed(1)} kg) była o ${sign}${diffPercent.toFixed(1)}% ${diffPercent >= 0 ? 'wyższa' : 'niższa'} niż średnia z całego okresu 16 tygodni (${avgStrength16.toFixed(1)} kg).`;
  }

  // Weekly Chart state and calculations
  const [activeWeeklyPointIdx, setActiveWeeklyPointIdx] = useState<number | null>(null);

  const strengthValues = weeklyCorrelationData.map((d) => d.strengthLevel);
  const maxStrength = Math.max(...strengthValues);
  const minStrengthY = 0;
  const maxStrengthY = maxStrength > 0 ? Math.ceil(maxStrength * 1.15) : 1000;

  const weeklyWeightValues = weeklyCorrelationData
    .map((d) => d.bodyWeight)
    .filter((w): w is number => w !== undefined && w !== null && w > 0);
  
  const hasWeeklyWeightData = weeklyWeightValues.length > 0;
  let minWeeklyWeightY = 0;
  let maxWeeklyWeightY = 0;
  if (hasWeeklyWeightData) {
    const minW = Math.min(...weeklyWeightValues);
    const maxW = Math.max(...weeklyWeightValues);
    if (minW === maxW) {
      minWeeklyWeightY = Math.max(0, minW - 5);
      maxWeeklyWeightY = minW + 5;
    } else {
      const range = maxW - minW;
      minWeeklyWeightY = Math.max(0, minW - range * 0.2);
      maxWeeklyWeightY = maxW + range * 0.2;
    }
    minWeeklyWeightY = Math.floor(minWeeklyWeightY);
    maxWeeklyWeightY = Math.ceil(maxWeeklyWeightY);
  }

  const weeklyPoints = weeklyCorrelationData.map((d, i) => {
    const x = padding.left + (i / 15) * chartWidth;
    const yLeft = padding.top + chartHeight - ((d.strengthLevel - minStrengthY) / (maxStrengthY - minStrengthY)) * chartHeight;
    const yRight = (hasWeeklyWeightData && d.bodyWeight !== undefined && d.bodyWeight !== null && minWeeklyWeightY !== maxWeeklyWeightY)
      ? padding.top + chartHeight - ((d.bodyWeight - minWeeklyWeightY) / (maxWeeklyWeightY - minWeeklyWeightY)) * chartHeight
      : undefined;

    return {
      x,
      yLeft,
      yRight,
      strengthLevel: d.strengthLevel,
      bodyWeight: d.bodyWeight,
      label: d.label,
      workoutCount: d.workoutCount,
      start: d.start,
      end: d.end,
    };
  });

  let lineWeeklyStrengthD = '';
  let areaWeeklyStrengthD = '';
  let lineWeeklyWeightD = '';

  if (weeklyPoints.length > 1) {
    lineWeeklyStrengthD = `M ${weeklyPoints.map((p) => `${p.x} ${p.yLeft}`).join(' L ')}`;
    areaWeeklyStrengthD = `${lineWeeklyStrengthD} L ${weeklyPoints[weeklyPoints.length - 1].x} ${padding.top + chartHeight} L ${weeklyPoints[0].x} ${padding.top + chartHeight} Z`;

    const validWeightPoints = weeklyPoints.filter((p) => p.yRight !== undefined);
    if (validWeightPoints.length > 1) {
      lineWeeklyWeightD = `M ${validWeightPoints.map((p) => `${p.x} ${p.yRight}`).join(' L ')}`;
    }
  }

  const displayWeeklyPoint = activeWeeklyPointIdx !== null
    ? weeklyPoints[activeWeeklyPointIdx]
    : weeklyPoints[weeklyPoints.length - 1];

  let leftWeeklyGridLines: { y: number; val: string }[] = [];
  let rightWeeklyGridLines: { y: number; val: string }[] = [];
  const gridCount = 4;

  leftWeeklyGridLines = Array.from({ length: gridCount }).map((_, idx) => {
    const val = minStrengthY + (idx / (gridCount - 1)) * (maxStrengthY - minStrengthY);
    const y = padding.top + chartHeight - (idx / (gridCount - 1)) * chartHeight;
    return { y, val: val.toFixed(0) };
  });

  if (hasWeeklyWeightData) {
    rightWeeklyGridLines = Array.from({ length: gridCount }).map((_, idx) => {
      const val = minWeeklyWeightY + (idx / (gridCount - 1)) * (maxWeeklyWeightY - minWeeklyWeightY);
      const y = padding.top + chartHeight - (idx / (gridCount - 1)) * chartHeight;
      return { y, val: val.toFixed(1) };
    });
  }

  let points: ChartPoint[] = [];
  let lineLeftD = '';
  let areaLeftD = '';
  let lineRightD = '';
  let lineRepsD = '';
  let hasWeightData = false;
  
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

    // Right Y Axis metric: Body Weight
    const rightValues = exerciseSessions.map((d) => d.bodyWeight).filter((w): w is number => w !== undefined && w !== null && w > 0);
    hasWeightData = rightValues.length > 0;

    if (hasWeightData) {
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
    }

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
      const yRight = (hasWeightData && rightVal !== undefined && rightVal !== null && minRight !== maxRight)
        ? padding.top + chartHeight - ((rightVal - minRight) / (maxRight - minRight)) * chartHeight
        : undefined;
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
      
      const validWeightPoints = points.filter((p) => p.yRight !== undefined);
      if (validWeightPoints.length > 1) {
        lineRightD = `M ${validWeightPoints.map((p) => `${p.x} ${p.yRight}`).join(' L ')}`;
      }
      
      lineRepsD = `M ${points.map((p) => `${p.x} ${p.yReps}`).join(' L ')}`;
    }

    // Grid ticks
    const gridCount = 4;
    leftGridLines = Array.from({ length: gridCount }).map((_, idx) => {
      const val = minLeft + (idx / (gridCount - 1)) * (maxLeft - minLeft);
      const y = padding.top + chartHeight - (idx / (gridCount - 1)) * chartHeight;
      return { y, val: val.toFixed(0) };
    });

    if (hasWeightData) {
      rightGridLines = Array.from({ length: gridCount }).map((_, idx) => {
        const val = minRight + (idx / (gridCount - 1)) * (maxRight - minRight);
        const y = padding.top + chartHeight - (idx / (gridCount - 1)) * chartHeight;
        return { y, val: val.toFixed(1) };
      });
    }
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
    
    if (earliest.bodyWeight !== undefined && earliest.bodyWeight !== null && latest.bodyWeight !== undefined && latest.bodyWeight !== null) {
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
  }

  return (
    <div className="flex-column gap-16" style={{ paddingBottom: '32px' }}>
      <div>
        <h2>Wykresy i Statystyki</h2>
        <p className="text-muted" style={{ fontSize: '13px', marginTop: '2px' }}>
          Śledź swój progres siłowy i objętościowy skorelowany z wagą ciała.
        </p>
      </div>

      {/* Heatmap & Weekly Correlation Section */}
      <div className="card flex-column gap-12" style={{ padding: '16px' }}>
        <div className="flex-row justify-between align-center">
          <h3 style={{ fontSize: '15px', margin: 0 }}>Aktywność i Korelacja ({WEEKS_COUNT} tyg.)</h3>
          <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--accent)' }}>
            Ciąg treningowy: {weeklyStreakText}
          </span>
        </div>

        {/* Heatmap daily grid */}
        <div className="heatmap-scroll-container">
          <div className="heatmap-grid">
            {heatmapDays.map((day) => (
              <div
                key={day.dateKey}
                className={`heatmap-cell ${day.active ? 'active' : ''}`}
                title={`${day.date.toLocaleDateString('pl-PL')} ${day.active ? '(Trening zaliczony)' : '(Brak treningu)'}`}
              />
            ))}
          </div>
        </div>

        <div style={{ borderBottom: '1px solid var(--border)', margin: '4px 0' }} />

        {/* Weekly Correlation Chart */}
        <h4 style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '4px 0 0 0' }}>
          Tonaż treningowy vs Waga ciała (Tygodniowo)
        </h4>

        {displayWeeklyPoint && (
          <div
            className="flex-row justify-between align-center"
            style={{
              padding: '8px 12px',
              background: 'var(--bg-primary)',
              borderRadius: '6px',
              border: '1px solid var(--border)',
              fontSize: '12.5px',
            }}
          >
            <div className="flex-column" style={{ gap: '2px' }}>
              <span className="text-muted" style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }}>
                Tydzień od {displayWeeklyPoint.start.toLocaleDateString('pl-PL')} do {displayWeeklyPoint.end.toLocaleDateString('pl-PL')}
              </span>
              <span>
                Treningi: <strong>{displayWeeklyPoint.workoutCount}</strong>
              </span>
            </div>
            <div className="text-right" style={{ textAlign: 'right' }}>
              <div style={{ color: 'var(--accent)', fontWeight: '600' }}>
                Śr. tonaż: {displayWeeklyPoint.strengthLevel} kg
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                Waga: {displayWeeklyPoint.bodyWeight !== undefined && displayWeeklyPoint.bodyWeight !== null ? `${displayWeeklyPoint.bodyWeight} kg` : 'brak danych'}
              </div>
            </div>
          </div>
        )}

        <div style={{ position: 'relative', width: '100%', overflow: 'hidden', marginTop: '4px' }}>
          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${width} ${height}`}
            style={{ overflow: 'visible', display: 'block' }}
          >
            <defs>
              <linearGradient id="weekly-strength-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25" />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Gridlines */}
            {leftWeeklyGridLines.map((line, idx) => (
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
                {/* Left Y Axis Labels (Strength Level) */}
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
            {hasWeeklyWeightData && rightWeeklyGridLines.map((line, idx) => (
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
            {hasWeeklyWeightData && (
              <line
                x1={width - padding.right}
                y1={padding.top}
                x2={width - padding.right}
                y2={padding.top + chartHeight}
                stroke="var(--border)"
                strokeWidth="1"
              />
            )}

            {/* Bottom horizontal axis line */}
            <line
              x1={padding.left}
              y1={padding.top + chartHeight}
              x2={width - padding.right}
              y2={padding.top + chartHeight}
              stroke="var(--border)"
              strokeWidth="1"
            />

            {/* Draw Area for Strength Level */}
            {weeklyPoints.length > 1 && (
              <path d={areaWeeklyStrengthD} fill="url(#weekly-strength-gradient)" />
            )}

            {/* Draw Weight Line (Dashed) */}
            {weeklyPoints.length > 1 && lineWeeklyWeightD && (
              <path
                d={lineWeeklyWeightD}
                fill="none"
                stroke="var(--text-secondary)"
                strokeWidth="2"
                strokeDasharray="4 4"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.5"
              />
            )}

            {/* Draw Strength Level Line (Solid Blue) */}
            {weeklyPoints.length > 1 && (
              <path
                d={lineWeeklyStrengthD}
                fill="none"
                stroke="var(--accent)"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Circles for Data Points with Interaction */}
            {weeklyPoints.map((p, idx) => {
              const isActive = activeWeeklyPointIdx === idx || (activeWeeklyPointIdx === null && idx === 15);
              return (
                <g key={idx}>
                  {/* Transparent larger circle for touch area */}
                  <circle
                    cx={p.x}
                    cy={p.yLeft}
                    r="14"
                    fill="transparent"
                    style={{ cursor: 'pointer' }}
                    onClick={() => setActiveWeeklyPointIdx(idx)}
                  />

                  {/* Displayed circle marker on Strength Level Line */}
                  <circle
                    cx={p.x}
                    cy={p.yLeft}
                    r={isActive ? '6' : '4'}
                    fill={isActive ? 'var(--accent)' : 'var(--bg-primary)'}
                    stroke="var(--accent)"
                    strokeWidth="2.5"
                    style={{ transition: 'all 0.1s ease', cursor: 'pointer' }}
                    onClick={() => setActiveWeeklyPointIdx(idx)}
                  />

                  {/* Date Axis Label (simplified for weeks, e.g. every 3 weeks to fit) */}
                  {(() => {
                    const shouldShow = idx % 3 === 0 || idx === 15;
                    if (!shouldShow) return null;
                    return (
                      <text
                        x={p.x}
                        y={padding.top + chartHeight + 20}
                        fill={isActive ? 'var(--accent)' : 'var(--text-secondary)'}
                        fontSize="9"
                        fontWeight={isActive ? '600' : 'normal'}
                        textAnchor="middle"
                      >
                        {p.label}
                      </text>
                    );
                  })()}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Legend */}
        <div className="flex-row justify-center gap-16" style={{ marginTop: '4px', fontSize: '11px', flexWrap: 'wrap' }}>
          <div className="flex-row align-center gap-4">
            <div style={{ width: '12px', height: '3px', background: 'var(--accent)', borderRadius: '1px' }} />
            <span className="text-muted">Poziom siły (lewa oś Y)</span>
          </div>
          {hasWeeklyWeightData && (
            <div className="flex-row align-center gap-4">
              <div style={{ width: '12px', height: '1.5px', borderBottom: '1.5px dashed var(--text-secondary)', opacity: 0.6 }} />
              <span className="text-muted">Waga ciała (prawa oś Y)</span>
            </div>
          )}
        </div>

        {/* Summary / Comparison message */}
        {weeklyComparisonText && (
          <div
            style={{
              marginTop: '8px',
              padding: '10px 12px',
              background: 'rgba(0, 210, 255, 0.02)',
              borderLeft: '3px solid var(--accent)',
              borderRadius: '0 6px 6px 0',
              fontSize: '12.5px',
              lineHeight: '1.5',
              color: 'var(--text-secondary)',
            }}
          >
            {weeklyComparisonText}
          </div>
        )}
      </div>

      <div style={{ borderBottom: '1px solid var(--border)', margin: '8px 0' }} />

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
                  Waga ciała w tej sesji: <strong style={{ color: 'var(--text-primary)' }}>{displayPoint.bodyWeight !== undefined && displayPoint.bodyWeight !== null ? `${displayPoint.bodyWeight.toFixed(1)} kg` : 'brak danych'}</strong>
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
                {hasWeightData && rightGridLines.map((line, idx) => (
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
                {hasWeightData && (
                  <line
                    x1={width - padding.right}
                    y1={padding.top}
                    x2={width - padding.right}
                    y2={padding.top + chartHeight}
                    stroke="var(--border)"
                    strokeWidth="1"
                  />
                )}

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
              {hasWeightData && (
                <div className="flex-row align-center gap-4">
                  <div style={{ width: '12px', height: '1.5px', borderBottom: '1.5px dashed var(--text-secondary)', opacity: 0.6 }} />
                  <span className="text-muted">Waga ciała (prawa oś Y)</span>
                </div>
              )}
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
