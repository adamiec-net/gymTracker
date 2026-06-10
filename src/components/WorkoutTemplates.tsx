import { useState, useEffect, type FormEvent } from 'react';
import { getTemplates, saveTemplate, deleteTemplate, getExercises } from '../services/storage';
import type { WorkoutTemplate, WorkoutExercise, WorkoutSet, Exercise } from '../types';

interface WorkoutTemplatesProps {
  onStartWorkout: (template: WorkoutTemplate) => void;
}

const WEEKDAYS = [
  { label: 'Pon', value: 1 },
  { label: 'Wt', value: 2 },
  { label: 'Śr', value: 3 },
  { label: 'Cz', value: 4 },
  { label: 'Pt', value: 5 },
  { label: 'Sob', value: 6 },
  { label: 'Nie', value: 0 },
];

export function WorkoutTemplates({ onStartWorkout }: WorkoutTemplatesProps) {
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [exercisesLibrary, setExercisesLibrary] = useState<Exercise[]>([]);
  
  // Editor state
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [scheduleDays, setScheduleDays] = useState<number[]>([]);
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState('');
  const [editorError, setEditorError] = useState('');

  useEffect(() => {
    setTemplates(getTemplates());
    setExercisesLibrary(getExercises());
  }, [isEditing]);

  const handleCreateNew = () => {
    setEditId(null);
    setName('');
    setScheduleDays([]);
    setExercises([]);
    setEditorError('');
    setIsEditing(true);

    const lib = getExercises();
    if (lib.length > 0) {
      setSelectedExerciseId(lib[0].id);
    } else {
      setSelectedExerciseId('');
    }
  };

  const handleEdit = (tpl: WorkoutTemplate) => {
    setEditId(tpl.id);
    setName(tpl.name);
    setScheduleDays(tpl.scheduleDays);
    setExercises(JSON.parse(JSON.stringify(tpl.exercises))); // Deep clone
    setEditorError('');
    setIsEditing(true);

    const lib = getExercises();
    if (lib.length > 0) {
      setSelectedExerciseId(lib[0].id);
    } else {
      setSelectedExerciseId('');
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Czy na pewno chcesz usunąć szablon "${name}"?`)) {
      const updated = deleteTemplate(id);
      setTemplates(updated);
    }
  };

  const toggleDay = (day: number) => {
    setScheduleDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleAddExerciseToTemplate = () => {
    if (!selectedExerciseId) return;
    
    // Check if exercise is already added
    if (exercises.some((e) => e.exerciseId === selectedExerciseId)) {
      setEditorError('To ćwiczenie jest już dodane do szablonu.');
      return;
    }

    setEditorError('');
    const newWorkoutExercise: WorkoutExercise = {
      exerciseId: selectedExerciseId,
      sets: [{ reps: 10, weight: 0, completed: false }], // default set
    };

    setExercises((prev) => [...prev, newWorkoutExercise]);
  };

  const handleRemoveExerciseFromTemplate = (idx: number) => {
    setExercises((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddSet = (exerciseIndex: number) => {
    setExercises((prev) => {
      const updated = [...prev];
      const sets = updated[exerciseIndex].sets;
      const lastSet = sets[sets.length - 1];
      
      // Copy last set values as starting point or use defaults
      const newSet: WorkoutSet = lastSet
        ? { reps: lastSet.reps, weight: lastSet.weight, completed: false }
        : { reps: 10, weight: 0, completed: false };

      updated[exerciseIndex].sets = [...sets, newSet];
      return updated;
    });
  };

  const handleRemoveSet = (exerciseIndex: number, setIndex: number) => {
    setExercises((prev) => {
      const updated = [...prev];
      const sets = updated[exerciseIndex].sets;
      if (sets.length <= 1) {
        // If only 1 set remains, maybe remove the whole exercise, or just don't allow it. Let's allow removing it.
        updated[exerciseIndex].sets = [];
      } else {
        updated[exerciseIndex].sets = sets.filter((_, i) => i !== setIndex);
      }
      return updated;
    });
  };

  const handleSetChange = (
    exerciseIndex: number,
    setIndex: number,
    field: 'reps' | 'weight',
    value: number
  ) => {
    setExercises((prev) => {
      const updated = [...prev];
      const sets = [...updated[exerciseIndex].sets];
      sets[setIndex] = {
        ...sets[setIndex],
        [field]: value,
      };
      updated[exerciseIndex].sets = sets;
      return updated;
    });
  };

  const handleSaveTemplate = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setEditorError('Nazwa szablonu jest wymagana.');
      return;
    }
    if (exercises.length === 0) {
      setEditorError('Dodaj przynajmniej jedno ćwiczenie.');
      return;
    }

    // Validate that all exercises have at least one set
    for (let i = 0; i < exercises.length; i++) {
      if (exercises[i].sets.length === 0) {
        const exName = exercisesLibrary.find(e => e.id === exercises[i].exerciseId)?.name || 'Ćwiczenie';
        setEditorError(`Dodaj przynajmniej jedną serię dla ćwiczenia: "${exName}"`);
        return;
      }
    }

    const tpl: WorkoutTemplate = {
      id: editId || 'template-' + Date.now(),
      name: name.trim(),
      exercises,
      scheduleDays,
    };

    saveTemplate(tpl);
    setIsEditing(false);
  };

  const getDaysString = (days: number[]) => {
    if (!days || days.length === 0) return 'Brak dni';
    const dayNames = ['Nie', 'Pon', 'Wt', 'Śr', 'Cz', 'Pt', 'Sob'];
    const sorted = [...days].sort((a, b) => {
      const adjA = a === 0 ? 7 : a;
      const adjB = b === 0 ? 7 : b;
      return adjA - adjB;
    });
    return sorted.map((d) => dayNames[d]).join(', ');
  };

  const getExerciseName = (id: string) => {
    return exercisesLibrary.find((e) => e.id === id)?.name || 'Nieznane ćwiczenie';
  };

  if (isEditing) {
    return (
      <div className="flex-column gap-12">
        <div className="flex-row justify-between align-center">
          <h2>{editId ? 'Edytuj szablon' : 'Nowy szablon'}</h2>
          <button className="btn btn-secondary btn-sm" onClick={() => setIsEditing(false)}>
            Anuluj
          </button>
        </div>

        <form onSubmit={handleSaveTemplate} className="flex-column gap-12">
          {editorError && <div className="text-danger" style={{ fontSize: '13px' }}>{editorError}</div>}

          {/* Template Name */}
          <div className="form-group">
            <label className="form-label">Nazwa szablonu</label>
            <input
              type="text"
              className="input-text"
              placeholder="np. PUSH / Klatka i Barki"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          {/* Days Selection */}
          <div className="form-group">
            <label className="form-label">Dni treningowe</label>
            <div className="days-selector">
              {WEEKDAYS.map((day) => {
                const isActive = scheduleDays.includes(day.value);
                return (
                  <button
                    key={day.value}
                    type="button"
                    className={`day-btn ${isActive ? 'active' : ''}`}
                    onClick={() => toggleDay(day.value)}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Added Exercises list */}
          <div className="form-group">
            <label className="form-label">Ćwiczenia w szablonie</label>
            <div className="flex-column gap-12">
              {exercises.length === 0 ? (
                <div className="card text-center" style={{ borderStyle: 'dashed', padding: '20px' }}>
                  <p className="text-muted">Brak ćwiczeń. Dodaj ćwiczenie poniżej.</p>
                </div>
              ) : (
                exercises.map((workoutEx, exIdx) => {
                  const exName = getExerciseName(workoutEx.exerciseId);
                  return (
                    <div key={workoutEx.exerciseId} className="card" style={{ padding: '12px' }}>
                      <div className="flex-row justify-between align-center">
                        <h4 style={{ fontSize: '14px', fontWeight: '600' }}>{exName}</h4>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => handleRemoveExerciseFromTemplate(exIdx)}
                          style={{ padding: '4px 8px', borderRadius: '4px' }}
                        >
                          Usuń
                        </button>
                      </div>

                      {/* Sets list */}
                      <div className="flex-column" style={{ marginTop: '8px', gap: '8px' }}>
                        {workoutEx.sets.map((set, setIdx) => (
                          <div key={setIdx} className="template-set-row">
                            <span className="set-number" style={{ width: '24px' }}>{setIdx + 1}</span>
                            
                            <div className="set-input-group">
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
                                placeholder="10"
                                min="0"
                              />
                              <span className="set-label">powt.</span>
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

                            <button
                              type="button"
                              className="btn-delete-set"
                              onClick={() => handleRemoveSet(exIdx, setIdx)}
                              title="Usuń serię"
                            >
                              &times;
                            </button>
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleAddSet(exIdx)}
                        style={{ marginTop: '8px', width: 'fit-content', alignSelf: 'flex-start' }}
                      >
                        + Dodaj serię
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Add exercise control */}
          <div className="card" style={{ padding: '12px', marginTop: '4px' }}>
            <label className="form-label" style={{ marginBottom: '4px' }}>Dodaj ćwiczenie</label>
            {exercisesLibrary.length === 0 ? (
              <p className="text-muted" style={{ fontSize: '13px' }}>
                Brak ćwiczeń w atlasie. Najpierw dodaj ćwiczenia w Atlasie ćwiczeń.
              </p>
            ) : (
              <div className="flex-row">
                <select
                  className="input-text"
                  value={selectedExerciseId}
                  onChange={(e) => setSelectedExerciseId(e.target.value)}
                  style={{ flex: 1, appearance: 'none', backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23ffffff\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'><polyline points=\'6 9 12 15 18 9\'></polyline></svg>")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '16px' }}
                >
                  {exercisesLibrary.map((ex) => (
                    <option key={ex.id} value={ex.id} style={{ backgroundColor: 'var(--bg-surface)' }}>
                      {ex.name} ({ex.category})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleAddExerciseToTemplate}
                >
                  Dodaj
                </button>
              </div>
            )}
          </div>

          <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: '16px' }}>
            Zapisz szablon
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex-column gap-12">
      <div className="flex-row justify-between align-center">
        <h2>Szablony treningowe</h2>
        <button className="btn btn-primary btn-sm" onClick={handleCreateNew}>
          + Nowy szablon
        </button>
      </div>

      <p className="text-muted">Twórz szablony i używaj ich do szybkiego rozpoczynania treningu.</p>

      {templates.length === 0 ? (
        <div className="card text-center" style={{ padding: '32px 16px' }}>
          <p className="text-muted" style={{ marginBottom: '16px' }}>Brak zapisanych szablonów.</p>
          <button className="btn btn-secondary btn-full" onClick={handleCreateNew}>
            Stwórz swój pierwszy szablon
          </button>
        </div>
      ) : (
        <div className="flex-column gap-12">
          {templates.map((tpl) => (
            <div key={tpl.id} className="card">
              <div className="card-header">
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '600' }}>{tpl.name}</h3>
                  <span className="days-badge">
                    {getDaysString(tpl.scheduleDays)}
                  </span>
                </div>
                <span className="text-muted" style={{ fontSize: '12px' }}>
                  {tpl.exercises.length} ćw. ({tpl.exercises.reduce((sum, e) => sum + e.sets.length, 0)} serii)
                </span>
              </div>
              
              <div className="flex-column" style={{ gap: '4px', margin: '4px 0' }}>
                {tpl.exercises.slice(0, 3).map((e, idx) => (
                  <div key={idx} className="flex-row justify-between" style={{ fontSize: '13px' }}>
                    <span className="text-muted">• {getExerciseName(e.exerciseId)}</span>
                    <span>{e.sets.length} serii</span>
                  </div>
                ))}
                {tpl.exercises.length > 3 && (
                  <span className="text-muted" style={{ fontSize: '12px', fontStyle: 'italic', paddingLeft: '8px' }}>
                    + {tpl.exercises.length - 3} więcej...
                  </span>
                )}
              </div>

              <div className="flex-row justify-between" style={{ marginTop: '8px' }}>
                <button
                  className="btn btn-primary"
                  onClick={() => onStartWorkout(tpl)}
                  style={{ flex: 1 }}
                >
                  Rozpocznij trening
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleEdit(tpl)}
                  title="Edytuj"
                  style={{ padding: '10px 12px' }}
                >
                  Edytuj
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDelete(tpl.id, tpl.name)}
                  title="Usuń"
                  style={{ padding: '10px 12px' }}
                >
                  Usuń
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
