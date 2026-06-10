import { useState } from 'react';
import { getHistory, deleteWorkout, getExercises, saveWorkout } from '../services/storage';
import type { LoggedWorkout, Exercise, WorkoutExercise } from '../types';

export function WorkoutHistory() {
  const [history, setHistory] = useState<LoggedWorkout[]>(() => getHistory());
  const [exercises] = useState<Exercise[]>(() => getExercises());

  // Edit modal state
  const [editingWorkout, setEditingWorkout] = useState<LoggedWorkout | null>(null);
  const [workoutName, setWorkoutName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [bodyWeight, setBodyWeight] = useState<string>('');
  const [workoutExercises, setWorkoutExercises] = useState<WorkoutExercise[]>([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState('');

  const toLocalDatetimeString = (isoString: string): string => {
    if (!isoString) return '';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
    
    const pad = (num: number) => String(num).padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const toISOStringFromLocal = (localString: string): string => {
    if (!localString) return '';
    const date = new Date(localString);
    if (isNaN(date.getTime())) return '';
    return date.toISOString();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Czy na pewno chcesz usunąć ten trening z historii? Tej operacji nie można cofnąć.')) {
      const updated = deleteWorkout(id);
      setHistory(updated);
    }
  };

  const handleEditClick = (workout: LoggedWorkout) => {
    setEditingWorkout(workout);
    setWorkoutName(workout.name);
    setStartTime(toLocalDatetimeString(workout.startTime));
    setEndTime(toLocalDatetimeString(workout.endTime));
    setBodyWeight(workout.bodyWeight !== undefined ? String(workout.bodyWeight) : '');
    setWorkoutExercises(JSON.parse(JSON.stringify(workout.exercises))); // deep clone
    setSelectedExerciseId(exercises[0]?.id || '');
  };

  const handleCloseModal = () => {
    setEditingWorkout(null);
  };

  const handleSetChange = (exerciseIdx: number, setIdx: number, field: 'reps' | 'weight', value: number) => {
    setWorkoutExercises((prev) =>
      prev.map((ex, idx) => {
        if (idx !== exerciseIdx) return ex;
        const updatedSets = ex.sets.map((set, sIdx) => {
          if (sIdx !== setIdx) return set;
          return { ...set, [field]: value };
        });
        return { ...ex, sets: updatedSets };
      })
    );
  };

  const handleSetCompletedToggle = (exerciseIdx: number, setIdx: number) => {
    setWorkoutExercises((prev) =>
      prev.map((ex, idx) => {
        if (idx !== exerciseIdx) return ex;
        const updatedSets = ex.sets.map((set, sIdx) => {
          if (sIdx !== setIdx) return set;
          return { ...set, completed: !set.completed };
        });
        return { ...ex, sets: updatedSets };
      })
    );
  };

  const handleDeleteSet = (exerciseIdx: number, setIdx: number) => {
    setWorkoutExercises((prev) =>
      prev.map((ex, idx) => {
        if (idx !== exerciseIdx) return ex;
        return { ...ex, sets: ex.sets.filter((_, sIdx) => sIdx !== setIdx) };
      })
    );
  };

  const handleAddSet = (exerciseIdx: number) => {
    setWorkoutExercises((prev) =>
      prev.map((ex, idx) => {
        if (idx !== exerciseIdx) return ex;
        return { ...ex, sets: [...ex.sets, { reps: 10, weight: 0, completed: false }] };
      })
    );
  };

  const handleDeleteExercise = (exerciseIdx: number) => {
    setWorkoutExercises((prev) => prev.filter((_, idx) => idx !== exerciseIdx));
  };

  const handleAddExercise = () => {
    if (!selectedExerciseId) return;
    const newExercise: WorkoutExercise = {
      exerciseId: selectedExerciseId,
      sets: [{ reps: 10, weight: 0, completed: false }],
    };
    setWorkoutExercises((prev) => [...prev, newExercise]);
  };

  const handleSave = () => {
    if (!editingWorkout) return;
    if (!workoutName.trim()) {
      alert('Nazwa treningu nie może być pusta.');
      return;
    }
    if (!startTime || !endTime) {
      alert('Wprowadź czas rozpoczęcia i zakończenia.');
      return;
    }

    const startIso = toISOStringFromLocal(startTime);
    const endIso = toISOStringFromLocal(endTime);

    if (new Date(startIso).getTime() > new Date(endIso).getTime()) {
      alert('Czas rozpoczęcia nie może być późniejszy niż czas zakończenia.');
      return;
    }

    const parsedBodyWeight = bodyWeight !== '' ? parseFloat(bodyWeight) : undefined;
    if (parsedBodyWeight !== undefined && isNaN(parsedBodyWeight)) {
      alert('Waga ciała musi być liczbą.');
      return;
    }

    const updatedWorkout: LoggedWorkout = {
      ...editingWorkout,
      name: workoutName.trim(),
      startTime: startIso,
      endTime: endIso,
      bodyWeight: parsedBodyWeight,
      exercises: workoutExercises.map((ex) => ({
        ...ex,
        sets: ex.sets.map((set) => ({
          reps: Math.max(0, parseInt(String(set.reps)) || 0),
          weight: Math.max(0, parseFloat(String(set.weight)) || 0),
          completed: !!set.completed,
        })),
      })).filter((ex) => ex.sets.length > 0),
    };

    saveWorkout(updatedWorkout);
    setHistory(getHistory());
    setEditingWorkout(null);
  };

  const getExerciseName = (id: string) => {
    return exercises.find((e) => e.id === id)?.name || 'Nieznane ćwiczenie';
  };

  const formatWorkoutDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
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
                  <div className="flex-column" style={{ gap: '4px', paddingRight: '110px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>
                      {workout.name}
                    </h3>
                    <div className="text-muted" style={{ fontSize: '12px', fontWeight: '500' }}>
                      {formatWorkoutDate(workout.startTime)}
                    </div>
                  </div>

                  <div
                    style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      display: 'flex',
                      gap: '8px',
                      alignItems: 'center',
                    }}
                  >
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleEditClick(workout)}
                      style={{
                        padding: '4px 8px',
                        fontSize: '12px',
                      }}
                    >
                      Edytuj
                    </button>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={() => handleDelete(workout.id)}
                      title="Usuń ten trening"
                      style={{
                        fontSize: '20px',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        padding: '4px',
                        lineHeight: '1',
                      }}
                      aria-label="Usuń trening"
                    >
                      &times;
                    </button>
                  </div>
                </div>

                {/* Workout stats summary */}
                <div className="flex-row gap-16" style={{ fontSize: '13px', flexWrap: 'wrap' }}>
                  <div>
                    <span className="text-muted">Czas trwania: </span>
                    <strong style={{ color: 'var(--accent)' }}>{durationStr}</strong>
                  </div>
                  <div>
                    <span className="text-muted">Ćwiczenia: </span>
                    <strong>{workout.exercises.length}</strong>
                  </div>
                  {workout.bodyWeight !== undefined && workout.bodyWeight !== null && (
                    <div>
                      <span className="text-muted">Waga ciała: </span>
                      <strong>{workout.bodyWeight} kg</strong>
                    </div>
                  )}
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

      {/* Edit Modal */}
      {editingWorkout && (
        <div className="modal-backdrop">
          <div className="modal-content card" style={{ maxHeight: '85vh', display: 'flex', flexDirection: 'column', padding: '20px' }}>
            <div className="flex-row justify-between align-center" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Edytuj trening</h3>
              <button
                type="button"
                className="btn-close"
                onClick={handleCloseModal}
                aria-label="Zamknij"
              >
                &times;
              </button>
            </div>

            {/* Scrollable Form Content */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingRight: '4px', marginBottom: '16px' }}>
              {/* Workout Name */}
              <div className="form-group">
                <label className="form-label">Nazwa treningu</label>
                <input
                  type="text"
                  className="input-text"
                  value={workoutName}
                  onChange={(e) => setWorkoutName(e.target.value)}
                  placeholder="np. Trening siłowy"
                />
              </div>

              {/* Start and End Times */}
              <div className="flex-row" style={{ gap: '12px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Rozpoczęcie</label>
                  <input
                    type="datetime-local"
                    className="input-text"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Zakończenie</label>
                  <input
                    type="datetime-local"
                    className="input-text"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>

              {/* Logged Body Weight */}
              <div className="form-group">
                <label className="form-label">Waga ciała (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  className="input-text"
                  placeholder="np. 80.5 (opcjonalnie)"
                  value={bodyWeight}
                  onChange={(e) => setBodyWeight(e.target.value)}
                />
              </div>

              {/* Exercises List */}
              <div className="flex-column" style={{ gap: '12px' }}>
                <label className="form-label">Ćwiczenia</label>
                {workoutExercises.length === 0 ? (
                  <div className="card text-center" style={{ padding: '16px', borderStyle: 'dashed' }}>
                    <p className="text-muted" style={{ fontSize: '13px' }}>Brak ćwiczeń. Dodaj jakieś poniżej.</p>
                  </div>
                ) : (
                  workoutExercises.map((workoutEx, exIdx) => {
                    const exName = getExerciseName(workoutEx.exerciseId);
                    return (
                      <div
                        key={exIdx}
                        className="card"
                        style={{
                          padding: '12px',
                          backgroundColor: 'rgba(255, 255, 255, 0.01)',
                          borderColor: 'var(--border)',
                          gap: '10px',
                        }}
                      >
                        <div
                          className="flex-row justify-between align-center"
                          style={{
                            borderBottom: '1px solid var(--border)',
                            paddingBottom: '8px',
                          }}
                        >
                          <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
                            {exName}
                          </h4>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDeleteExercise(exIdx)}
                            style={{ padding: '2px 8px', fontSize: '11px', borderRadius: '4px' }}
                          >
                            Usuń ćwiczenie
                          </button>
                        </div>

                        {/* Sets list header */}
                        {workoutEx.sets.length > 0 && (
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '28px 1fr 1fr 40px 28px',
                              gap: '8px',
                              paddingBottom: '2px',
                              fontSize: '10px',
                              fontWeight: '600',
                              color: 'var(--text-secondary)',
                              textTransform: 'uppercase',
                              textAlign: 'center',
                            }}
                          >
                            <span>Seria</span>
                            <span>Powt.</span>
                            <span>Ciężar</span>
                            <span>Done</span>
                            <span></span>
                          </div>
                        )}

                        {/* Sets */}
                        <div className="flex-column" style={{ gap: '6px' }}>
                          {workoutEx.sets.map((set, setIdx) => (
                            <div
                              key={setIdx}
                              style={{
                                display: 'grid',
                                gridTemplateColumns: '28px 1fr 1fr 40px 28px',
                                alignItems: 'center',
                                gap: '8px',
                              }}
                            >
                              <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', textAlign: 'center' }}>
                                {setIdx + 1}
                              </span>

                              {/* Reps */}
                              <div className="set-input-group" style={{ padding: '2px 6px' }}>
                                <input
                                  type="number"
                                  min="0"
                                  className="set-input"
                                  value={set.reps || ''}
                                  onChange={(e) =>
                                    handleSetChange(
                                      exIdx,
                                      setIdx,
                                      'reps',
                                      Math.max(0, parseInt(e.target.value) || 0)
                                    )
                                  }
                                  placeholder="0"
                                />
                                <span className="set-label" style={{ fontSize: '10px' }}>powt.</span>
                              </div>

                              {/* Weight */}
                              <div className="set-input-group" style={{ padding: '2px 6px' }}>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.1"
                                  className="set-input"
                                  value={set.weight || ''}
                                  onChange={(e) =>
                                    handleSetChange(
                                      exIdx,
                                      setIdx,
                                      'weight',
                                      Math.max(0, parseFloat(e.target.value) || 0)
                                    )
                                  }
                                  placeholder="0"
                                />
                                <span className="set-label" style={{ fontSize: '10px' }}>kg</span>
                              </div>

                              {/* Completed */}
                              <div style={{ display: 'flex', justifyContent: 'center' }}>
                                <label className="checkmark-container">
                                  <input
                                    type="checkbox"
                                    className="checkmark-input"
                                    checked={set.completed}
                                    onChange={() => handleSetCompletedToggle(exIdx, setIdx)}
                                  />
                                  <span className="checkmark-box" style={{ width: '22px', height: '22px', borderRadius: '6px' }}></span>
                                </label>
                              </div>

                              {/* Delete Set */}
                              <button
                                type="button"
                                className="btn-delete-set"
                                onClick={() => handleDeleteSet(exIdx, setIdx)}
                                style={{ fontSize: '18px', padding: 0 }}
                              >
                                &times;
                              </button>
                            </div>
                          ))}
                        </div>

                        {/* Add Set Button */}
                        <div style={{ marginTop: '4px' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleAddSet(exIdx)}
                          >
                            + Dodaj serię
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Add Exercise */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.01)',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px dashed var(--border)',
                }}
              >
                <label className="form-label" style={{ marginBottom: '6px', display: 'block' }}>
                  Dodaj ćwiczenie do treningu
                </label>
                <div className="flex-row">
                  <select
                    className="input-text"
                    value={selectedExerciseId}
                    onChange={(e) => setSelectedExerciseId(e.target.value)}
                    style={{
                      flex: 1,
                      appearance: 'none',
                      backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23ffffff\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'><polyline points=\'6 9 12 15 18 9\'></polyline></svg>")',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 12px center',
                      backgroundSize: '16px',
                      paddingRight: '36px'
                    }}
                  >
                    <option value="" style={{ backgroundColor: 'var(--bg-surface)' }}>-- Wybierz ćwiczenie --</option>
                    {exercises.map((ex) => (
                      <option key={ex.id} value={ex.id} style={{ backgroundColor: 'var(--bg-surface)' }}>
                        {ex.name} ({ex.category})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleAddExercise}
                    disabled={!selectedExerciseId}
                    style={{ padding: '10px 14px' }}
                  >
                    + Dodaj
                  </button>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex-row gap-12" style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCloseModal}
                style={{ flex: 1 }}
              >
                Anuluj
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSave}
                style={{ flex: 1 }}
              >
                Zapisz
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

