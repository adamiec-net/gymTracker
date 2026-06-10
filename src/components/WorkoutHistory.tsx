import { useState } from 'react';
import { getHistory, deleteWorkout, getExercises } from '../services/storage';
import type { LoggedWorkout, Exercise } from '../types';

export function WorkoutHistory() {
  const [history, setHistory] = useState<LoggedWorkout[]>(() => getHistory());
  const [exercises] = useState<Exercise[]>(() => getExercises());

  const handleDelete = (id: string) => {
    if (window.confirm('Czy na pewno chcesz usunąć ten trening z historii? Tej operacji nie można cofnąć.')) {
      const updated = deleteWorkout(id);
      setHistory(updated);
    }
  };

  const getExerciseName = (id: string) => {
    return exercises.find((e) => e.id === id)?.name || 'Nieznane ćwiczenie';
  };

  const formatWorkoutDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      // Format: Wednesday, 10.06.2026, 21:00
      // In Polish: Środa, 10.06.2026, 21:00
      const weekday = date.toLocaleDateString('pl-PL', { weekday: 'long' });
      const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
      const dayMonthYear = date.toLocaleDateString('pl-PL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      const time = date.toLocaleTimeString('pl-PL', {
        hour: '2-digit',
        minute: '2-digit',
      });
      return `${capitalizedWeekday}, ${dayMonthYear}, ${time}`;
    } catch {
      return isoString;
    }
  };

  const formatDuration = (startIso: string, endIso: string) => {
    try {
      const start = new Date(startIso).getTime();
      const end = new Date(endIso).getTime();
      const diffMs = end - start;
      if (diffMs <= 0) return '0 min';

      const diffMins = Math.round(diffMs / 60000);
      if (diffMins < 60) {
        return `${diffMins} min`;
      } else {
        const hrs = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        return mins > 0 ? `${hrs} godz. ${mins} min` : `${hrs} godz.`;
      }
    } catch {
      return 'N/A';
    }
  };

  return (
    <div className="flex-column gap-16" style={{ paddingBottom: '32px' }}>
      <div className="flex-row justify-between align-center">
        <div>
          <h2>Historia treningów</h2>
          <p className="text-muted" style={{ fontSize: '13px', marginTop: '2px' }}>
            Przeglądaj ukończone treningi i monitoruj swoje zaangażowanie.
          </p>
        </div>
      </div>

      {history.length === 0 ? (
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
            <path d="M12 8v4l3 3" />
            <circle cx="12" cy="12" r="9" />
          </svg>
          <h3>Brak wpisów w historii</h3>
          <p className="text-muted" style={{ marginTop: '8px', fontSize: '14px' }}>
            Ukończ swój pierwszy trening z zakładki Harmonogram lub Szablony, aby go tutaj zobaczyć.
          </p>
        </div>
      ) : (
        <div className="flex-column gap-16">
          {history.map((workout) => {
            const durationStr = formatDuration(workout.startTime, workout.endTime);
            return (
              <div key={workout.id} className="card flex-column gap-12" style={{ position: 'relative' }}>
                {/* Header */}
                <div
                  className="flex-row justify-between align-start"
                  style={{
                    borderBottom: '1px solid var(--border)',
                    paddingBottom: '10px',
                  }}
                >
                  <div className="flex-column" style={{ gap: '4px', paddingRight: '40px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>
                      {workout.name}
                    </h3>
                    <div className="text-muted" style={{ fontSize: '12px', fontWeight: '500' }}>
                      {formatWorkoutDate(workout.startTime)}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => handleDelete(workout.id)}
                    title="Usuń ten trening"
                    style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      fontSize: '20px',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      padding: '4px',
                    }}
                    aria-label="Usuń trening"
                  >
                    &times;
                  </button>
                </div>

                {/* Workout stats summary */}
                <div className="flex-row gap-16" style={{ fontSize: '13px' }}>
                  <div>
                    <span className="text-muted">Czas trwania: </span>
                    <strong style={{ color: 'var(--accent)' }}>{durationStr}</strong>
                  </div>
                  <div>
                    <span className="text-muted">Ćwiczenia: </span>
                    <strong>{workout.exercises.length}</strong>
                  </div>
                </div>

                {/* Exercises list */}
                <div className="flex-column gap-12" style={{ marginTop: '4px' }}>
                  {workout.exercises.map((workoutEx, exIdx) => {
                    const name = getExerciseName(workoutEx.exerciseId);
                    return (
                      <div
                        key={exIdx}
                        style={{
                          background: 'rgba(255, 255, 255, 0.02)',
                          padding: '10px 12px',
                          borderRadius: '6px',
                          border: '1px solid var(--border)',
                        }}
                      >
                        <h4
                          style={{
                            fontSize: '14px',
                            fontWeight: '600',
                            marginBottom: '8px',
                            color: 'var(--text-primary)',
                          }}
                        >
                          {name}
                        </h4>

                        {/* Sets list */}
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
                            gap: '8px',
                          }}
                        >
                          {workoutEx.sets.map((set, setIdx) => (
                            <div
                              key={setIdx}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                background: set.completed
                                  ? 'rgba(46, 213, 115, 0.1)'
                                  : 'rgba(255, 255, 255, 0.04)',
                                border: set.completed
                                  ? '1px solid rgba(46, 213, 115, 0.3)'
                                  : '1px solid transparent',
                                color: set.completed ? 'var(--text-success)' : 'var(--text-secondary)',
                              }}
                            >
                              <span
                                style={{
                                  fontWeight: '700',
                                  opacity: 0.6,
                                  minWidth: '14px',
                                }}
                              >
                                {setIdx + 1}
                              </span>
                              <div style={{ flex: 1 }}>
                                <strong>{set.reps}</strong> x <strong>{set.weight}</strong> kg
                              </div>
                              {set.completed && (
                                <span
                                  style={{
                                    fontSize: '10px',
                                    fontWeight: 'bold',
                                    color: 'var(--accent-success)',
                                  }}
                                  title="Ukończona"
                                >
                                  ✓
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
