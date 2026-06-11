import { useState, useEffect } from 'react';
import type { WorkoutTemplate, LoggedWorkout, WorkoutExercise, WorkoutSet, Exercise } from '../types';
import { getExercises, saveWorkout, getSettings, saveTemplate } from '../services/storage';
import { RestTimer } from './RestTimer';

interface WorkoutActiveProps {
  template: WorkoutTemplate;
  userWeight?: number;
  onFinish: (logged: LoggedWorkout) => void;
  onCancel: () => void;
}

export function WorkoutActive({ template, userWeight, onFinish, onCancel }: WorkoutActiveProps) {
  // Track start time once when component mounts using initial state
  const [startTime] = useState(() => new Date().toISOString());

  // Local state initialized once per template mount
  const [exercises, setExercises] = useState<WorkoutExercise[]>(() =>
    JSON.parse(JSON.stringify(template.exercises))
  );
  const [exercisesLibrary] = useState<Exercise[]>(() => getExercises());
  
  // Rest Timer state
  const [timerActive, setTimerActive] = useState(false);
  const [timerDuration, setTimerDuration] = useState(() => getSettings().defaultTimerDuration);

  // Overlay state for adding exercise on-the-fly
  const [showAddExerciseOverlay, setShowAddExerciseOverlay] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Workout duration in seconds
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = Math.floor((Date.now() - new Date(startTime).getTime()) / 1000);
      setElapsedTime(diff);
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const formatElapsedTime = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSetChange = (
    exerciseIndex: number,
    setIndex: number,
    field: 'reps' | 'weight',
    value: number
  ) => {
    setExercises((prev) =>
      prev.map((ex, idx) => {
        if (idx !== exerciseIndex) return ex;
        const updatedSets = ex.sets.map((set, sIdx) => {
          if (sIdx !== setIndex) return set;
          return { ...set, [field]: value };
        });
        return { ...ex, sets: updatedSets };
      })
    );
  };

  const handleSetCompletedToggle = (exerciseIndex: number, setIndex: number) => {
    setExercises((prev) => {
      const updated = prev.map((ex, idx) => {
        if (idx !== exerciseIndex) return ex;
        const updatedSets = ex.sets.map((set, sIdx) => {
          if (sIdx !== setIndex) return set;
          return { ...set, completed: !set.completed };
        });
        return { ...ex, sets: updatedSets };
      });

      // Automatically launch Rest Timer when set is completed (false -> true)
      const currentCompleted = prev[exerciseIndex].sets[setIndex].completed;
      if (!currentCompleted) {
        setTimerActive(true);
      }

      return updated;
    });
  };

  const handleAddSet = (exerciseIndex: number) => {
    setExercises((prev) =>
      prev.map((ex, idx) => {
        if (idx !== exerciseIndex) return ex;
        const lastSet = ex.sets[ex.sets.length - 1];
        const newSet: WorkoutSet = lastSet
          ? { reps: lastSet.reps, weight: lastSet.weight, completed: false }
          : { reps: 10, weight: 0, completed: false };
        return { ...ex, sets: [...ex.sets, newSet] };
      })
    );
  };

  const handleRemoveLastSet = (exerciseIndex: number) => {
    setExercises((prev) =>
      prev.map((ex, idx) => {
        if (idx !== exerciseIndex) return ex;
        return { ...ex, sets: ex.sets.slice(0, -1) };
      })
    );
  };

  const handleRemoveExercise = (exerciseIndex: number) => {
    if (window.confirm('Czy na pewno chcesz usunąć to ćwiczenie z bieżącego treningu?')) {
      setExercises((prev) => prev.filter((_, idx) => idx !== exerciseIndex));
    }
  };

  const handleAddExerciseOnTheFly = (exerciseId: string) => {
    setExercises((prev) => {
      const newWorkoutEx: WorkoutExercise = {
        exerciseId,
        sets: [{ reps: 10, weight: 0, completed: false }],
      };
      return [...prev, newWorkoutEx];
    });
    setShowAddExerciseOverlay(false);
    setSearchQuery('');
  };

  const hasTemplateChanges = () => {
    if (exercises.length !== template.exercises.length) {
      return true;
    }
    for (let i = 0; i < exercises.length; i++) {
      const activeEx = exercises[i];
      const templateEx = template.exercises[i];
      if (activeEx.exerciseId !== templateEx?.exerciseId) {
        return true;
      }
      if (activeEx.sets.length !== templateEx.sets.length) {
        return true;
      }
      for (let j = 0; j < activeEx.sets.length; j++) {
        const activeSet = activeEx.sets[j];
        const templateSet = templateEx.sets[j];
        if (activeSet.reps !== templateSet.reps || activeSet.weight !== templateSet.weight) {
          return true;
        }
      }
    }
    return false;
  };

  const handleFinishWorkout = () => {
    const totalCompletedSets = exercises.reduce(
      (sum, ex) => sum + ex.sets.filter((s) => s.completed).length,
      0
    );

    if (totalCompletedSets === 0) {
      const confirmFinish = window.confirm(
        'Nie ukończono żadnej serii. Czy na pewno chcesz zakończyć i zapisać ten trening?'
      );
      if (!confirmFinish) {
        return;
      }
    }

    const endTime = new Date().toISOString();
    const loggedWorkout: LoggedWorkout = {
      id: 'workout-' + Date.now(),
      templateId: template.id,
      name: template.name,
      startTime,
      endTime,
      exercises: exercises.filter((ex) => ex.sets.length > 0),
      bodyWeight: userWeight,
    };

    // Check if there are changes to reps or weight compared to the template
    if (hasTemplateChanges()) {
      const confirmUpdate = window.confirm(
        'Wartości serii (ilość powtórzeń lub ciężar) różnią się od zdefiniowanych w szablonie. Czy chcesz zaktualizować szablon o nowe wartości?'
      );
      if (confirmUpdate) {
        const updatedExercises = exercises.map((ex) => ({
          ...ex,
          sets: ex.sets.map((set) => ({
            reps: set.reps,
            weight: set.weight,
            completed: false,
          })),
        }));

        const updatedTemplate: WorkoutTemplate = {
          ...template,
          exercises: updatedExercises,
        };

        saveTemplate(updatedTemplate);
      }
    }

    // Save directly to storage
    saveWorkout(loggedWorkout);

    // Call callback to let App.tsx navigate away
    onFinish(loggedWorkout);
  };

  const handleCancelWorkout = () => {
    if (window.confirm('Czy na pewno chcesz porzucić ten trening? Postęp nie zostanie zapisany.')) {
      onCancel();
    }
  };

  const getExerciseName = (id: string) => {
    return exercisesLibrary.find((e) => e.id === id)?.name || 'Nieznane ćwiczenie';
  };

  // Filter exercises for on-the-fly addition
  const filteredExercises = exercisesLibrary.filter((ex) =>
    ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ex.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-column gap-12" style={{ paddingBottom: '32px' }}>
      
      {/* Active Workout Info Panel */}
      <div className="card" style={{ borderLeft: '4px solid var(--accent-success)', padding: '12px 16px' }}>
        <div className="flex-row justify-between align-center">
          <div>
            <span className="text-success" style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Trening w toku
            </span>
            <h2 style={{ fontSize: '20px', marginTop: '2px' }}>{template.name}</h2>
          </div>
          <div className="text-center">
            <span className="text-muted" style={{ fontSize: '11px', textTransform: 'uppercase' }}>Czas</span>
            <div style={{ fontSize: '18px', fontWeight: '700', fontFamily: 'monospace', color: 'var(--accent)' }}>
              {formatElapsedTime(elapsedTime)}
            </div>
          </div>
        </div>

        {/* Rest configuration panel */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '8px', marginTop: '8px' }}>
          <div className="flex-row align-center justify-between" style={{ fontSize: '13px' }}>
            <span className="text-muted">Czas odpoczynku:</span>
            <div className="flex-row">
              <select
                className="input-text"
                value={timerDuration}
                onChange={(e) => setTimerDuration(parseInt(e.target.value) || 90)}
                style={{ width: '85px', padding: '4px 6px', fontSize: '13px', appearance: 'none', backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23ffffff\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'><polyline points=\'6 9 12 15 18 9\'></polyline></svg>")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: '12px' }}
              >
                <option value={30} style={{ backgroundColor: 'var(--bg-surface)' }}>30s</option>
                <option value={45} style={{ backgroundColor: 'var(--bg-surface)' }}>45s</option>
                <option value={60} style={{ backgroundColor: 'var(--bg-surface)' }}>60s</option>
                <option value={90} style={{ backgroundColor: 'var(--bg-surface)' }}>90s</option>
                <option value={120} style={{ backgroundColor: 'var(--bg-surface)' }}>120s</option>
                <option value={180} style={{ backgroundColor: 'var(--bg-surface)' }}>180s</option>
              </select>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setTimerActive(true)}
                style={{ padding: '4px 8px' }}
              >
                ⏱️ Pokaż
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Exercises list */}
      <div className="flex-column gap-12">
        {exercises.length === 0 ? (
          <div className="card text-center" style={{ padding: '32px 16px', borderStyle: 'dashed' }}>
            <p className="text-muted">Brak ćwiczeń w treningu. Dodaj ćwiczenie klikając przycisk poniżej.</p>
          </div>
        ) : (
          exercises.map((workoutEx, exIdx) => {
            const exName = getExerciseName(workoutEx.exerciseId);
            return (
              <div key={`${workoutEx.exerciseId}-${exIdx}`} className="card" style={{ padding: '16px 12px' }}>
                <div 
                  className="flex-row justify-between align-center" 
                  style={{ borderBottom: '1px solid var(--border)', paddingBottom: '8px', marginBottom: '8px' }}
                >
                  <h3 style={{ fontSize: '15px', fontWeight: '700' }}>{exName}</h3>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => handleRemoveExercise(exIdx)}
                    style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '11px' }}
                  >
                    Usuń ćw.
                  </button>
                </div>

                {/* Grid header for sets */}
                {workoutEx.sets.length > 0 && (
                  <div 
                    style={{ 
                      display: 'grid', 
                      gridTemplateColumns: '48px 1fr 1fr 48px', 
                      gap: '12px', 
                      paddingBottom: '4px', 
                      fontSize: '11px', 
                      fontWeight: '600', 
                      color: 'var(--text-secondary)', 
                      textTransform: 'uppercase', 
                      textAlign: 'center' 
                    }}
                  >
                    <span>Seria</span>
                    <span>Powt.</span>
                    <span>Ciężar</span>
                    <span>Done</span>
                  </div>
                )}

                {/* Sets List */}
                <div className="flex-column" style={{ gap: '4px' }}>
                  {workoutEx.sets.map((set, setIdx) => (
                    <div key={setIdx} className={`set-row ${set.completed ? 'completed' : ''}`}>
                      <span className="set-number">{setIdx + 1}</span>
                      
                      <div className="set-input-group">
                        <button
                          type="button"
                          className="btn-set-adjust"
                          onClick={() =>
                            handleSetChange(
                              exIdx,
                              setIdx,
                              'reps',
                              Math.max(0, (set.reps || 0) - 1)
                            )
                          }
                          disabled={set.completed}
                          title="Odejmij powtórzenie"
                        >
                          &minus;
                        </button>
                        <input
                          type="number"
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
                          min="0"
                        />
                        <span className="set-label">powt.</span>
                        <button
                          type="button"
                          className="btn-set-adjust"
                          onClick={() =>
                            handleSetChange(
                              exIdx,
                              setIdx,
                              'reps',
                              (set.reps || 0) + 1
                            )
                          }
                          disabled={set.completed}
                          title="Dodaj powtórzenie"
                        >
                          &#43;
                        </button>
                      </div>

                      <div className="set-input-group">
                        <input
                          type="number"
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
                          step="any"
                          min="0"
                        />
                        <span className="set-label">kg</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <label className="checkmark-container">
                          <input
                            type="checkbox"
                            className="checkmark-input"
                            checked={set.completed}
                            onChange={() => handleSetCompletedToggle(exIdx, setIdx)}
                          />
                          <span className="checkmark-box"></span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex-row" style={{ marginTop: '12px', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleAddSet(exIdx)}
                    style={{ flex: 1 }}
                  >
                    + Seria
                  </button>
                  {workoutEx.sets.length > 0 && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleRemoveLastSet(exIdx)}
                      style={{ flex: 1 }}
                    >
                      - Seria
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Control Buttons */}
      <div className="flex-column gap-12" style={{ marginTop: '16px' }}>
        <button
          type="button"
          className="btn btn-secondary btn-full"
          onClick={() => setShowAddExerciseOverlay(true)}
        >
          + Dodaj ćwiczenie w locie
        </button>

        <div className="flex-row" style={{ gap: '12px' }}>
          <button
            type="button"
            className="btn btn-danger"
            onClick={handleCancelWorkout}
            style={{ flex: 1, padding: '12px' }}
          >
            Porzuć trening
          </button>
          
          <button
            type="button"
            className="btn btn-success"
            onClick={handleFinishWorkout}
            style={{ flex: 2, padding: '12px' }}
          >
            Zakończ trening
          </button>
        </div>
      </div>

      {/* Rest Timer Modal */}
      {timerActive && (
        <RestTimer
          duration={timerDuration}
          onClose={() => setTimerActive(false)}
        />
      )}

      {/* Add Exercise on-the-fly overlay */}
      {showAddExerciseOverlay && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div className="flex-row justify-between align-center" style={{ marginBottom: '12px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Dodaj ćwiczenie</h3>
              <button 
                type="button" 
                className="btn-close" 
                onClick={() => {
                  setShowAddExerciseOverlay(false);
                  setSearchQuery('');
                }}
                aria-label="Zamknij"
              >
                &times;
              </button>
            </div>

            <input
              type="text"
              className="input-text"
              placeholder="Wyszukaj ćwiczenie..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ marginBottom: '12px' }}
              autoFocus
            />

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredExercises.length === 0 ? (
                <p className="text-muted text-center" style={{ padding: '16px' }}>Brak ćwiczeń spełniających kryteria</p>
              ) : (
                filteredExercises.map((ex) => (
                  <button
                    key={ex.id}
                    type="button"
                    className="card"
                    style={{
                      padding: '12px',
                      width: '100%',
                      cursor: 'pointer',
                      textAlign: 'left',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-surface)',
                      display: 'block'
                    }}
                    onClick={() => handleAddExerciseOnTheFly(ex.id)}
                  >
                    <div className="flex-row justify-between align-center">
                      <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{ex.name}</span>
                      <span className="category-badge">{ex.category}</span>
                    </div>
                    {ex.notes && (
                      <div className="text-muted" style={{ fontSize: '12px', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {ex.notes}
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-full"
              onClick={() => {
                setShowAddExerciseOverlay(false);
                setSearchQuery('');
              }}
              style={{ marginTop: '12px' }}
            >
              Zamknij
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
