import type { Exercise, WorkoutTemplate, LoggedWorkout, BackupData, AppSettings } from '../types';

const STORAGE_KEYS = {
  EXERCISES: 'gym_tracker_exercises',
  TEMPLATES: 'gym_tracker_templates',
  HISTORY: 'gym_tracker_history',
  SETTINGS: 'gym_tracker_settings',
};

const DEFAULT_EXERCISES: Exercise[] = [
  { id: 'def-pompki', name: 'Pompki', category: 'Klatka piersiowa', notes: 'Klasyczne pompki na ziemi' },
  { id: 'def-podciaganie-nachwyt', name: 'Podciąganie nachwytem', category: 'Plecy', notes: 'Chwyt nachwytem na szerokość barków' },
  { id: 'def-podciaganie-podchwyt', name: 'Podciąganie podchwytem', category: 'Plecy', notes: 'Chwyt podchwytem na szerokość barków' },
  { id: 'def-przysiady', name: 'Przysiady', category: 'Nogi', notes: 'Przysiady bez obciążenia lub ze sztangą' },
  { id: 'def-swing-kettlem', name: 'Swing kettlem', category: 'Kettlebell', notes: 'Swing oburącz z odważnikiem' },
];

/**
 * Fetch all exercises from localStorage. Preloads default exercises if empty.
 */
export const getExercises = (): Exercise[] => {
  const stored = localStorage.getItem(STORAGE_KEYS.EXERCISES);
  if (!stored) {
    localStorage.setItem(STORAGE_KEYS.EXERCISES, JSON.stringify(DEFAULT_EXERCISES));
    return DEFAULT_EXERCISES;
  }
  try {
    return JSON.parse(stored) as Exercise[];
  } catch (e) {
    console.error('Error parsing exercises, resetting to default', e);
    return DEFAULT_EXERCISES;
  }
};

/**
 * Save or update an exercise.
 */
export const saveExercise = (exercise: Exercise): Exercise[] => {
  const exercises = getExercises();
  const index = exercises.findIndex((e) => e.id === exercise.id);
  if (index >= 0) {
    exercises[index] = exercise;
  } else {
    exercises.push(exercise);
  }
  localStorage.setItem(STORAGE_KEYS.EXERCISES, JSON.stringify(exercises));
  return exercises;
};

/**
 * Delete an exercise by ID.
 */
export const deleteExercise = (id: string): Exercise[] => {
  const exercises = getExercises();
  const filtered = exercises.filter((e) => e.id !== id);
  localStorage.setItem(STORAGE_KEYS.EXERCISES, JSON.stringify(filtered));
  return filtered;
};

const DEFAULT_SETTINGS: AppSettings = {
  defaultTimerDuration: 90,
};

/**
 * Fetch settings from localStorage. Returns default settings if not configured.
 */
export const getSettings = (): AppSettings => {
  const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
  if (!stored) {
    return DEFAULT_SETTINGS;
  }
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
  } catch (e) {
    console.error('Error parsing settings, returning defaults', e);
    return DEFAULT_SETTINGS;
  }
};

/**
 * Save settings to localStorage.
 */
export const saveSettings = (settings: AppSettings): void => {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
};

/**
 * Fetch all templates from localStorage.
 */
export const getTemplates = (): WorkoutTemplate[] => {
  const stored = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
  if (!stored) {
    return [];
  }
  try {
    return JSON.parse(stored) as WorkoutTemplate[];
  } catch (e) {
    console.error('Error parsing templates', e);
    return [];
  }
};

/**
 * Save or update a template.
 */
export const saveTemplate = (template: WorkoutTemplate): WorkoutTemplate[] => {
  const templates = getTemplates();
  const index = templates.findIndex((t) => t.id === template.id);
  if (index >= 0) {
    templates[index] = template;
  } else {
    templates.push(template);
  }
  localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(templates));
  return templates;
};

/**
 * Delete a template by ID.
 */
export const deleteTemplate = (id: string): WorkoutTemplate[] => {
  const templates = getTemplates();
  const filtered = templates.filter((t) => t.id !== id);
  localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(filtered));
  return filtered;
};

/**
 * Fetch the workout history (logged workouts) from localStorage.
 */
export const getHistory = (): LoggedWorkout[] => {
  const stored = localStorage.getItem(STORAGE_KEYS.HISTORY);
  if (!stored) {
    return [];
  }
  try {
    return JSON.parse(stored) as LoggedWorkout[];
  } catch (e) {
    console.error('Error parsing workout history', e);
    return [];
  }
};

/**
 * Save or update a logged workout in the history.
 */
export const saveWorkout = (workout: LoggedWorkout): LoggedWorkout[] => {
  const history = getHistory();
  const index = history.findIndex((w) => w.id === workout.id);
  if (index >= 0) {
    history[index] = workout;
  } else {
    history.push(workout);
  }
  // Sort history chronologically: newest first
  history.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
  return history;
};

/**
 * Delete a logged workout from history by ID.
 */
export const deleteWorkout = (id: string): LoggedWorkout[] => {
  const history = getHistory();
  const filtered = history.filter((w) => w.id !== id);
  localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(filtered));
  return filtered;
};

/**
 * Export all gym tracker data as a serialized JSON string.
 */
export const exportData = (): string => {
  const data: BackupData = {
    exercises: getExercises(),
    templates: getTemplates(),
    history: getHistory(),
  };
  return JSON.stringify(data, null, 2);
};

/**
 * Import gym tracker data from a JSON string. Overwrites existing keys on success.
 */
export const importData = (jsonData: string): boolean => {
  try {
    const parsed = JSON.parse(jsonData);
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Parsed data is not a valid JSON object');
    }

    const exercises = Array.isArray(parsed.exercises) ? parsed.exercises : null;
    const templates = Array.isArray(parsed.templates) ? parsed.templates : null;
    const history = Array.isArray(parsed.history) ? parsed.history : null;

    if (exercises === null && templates === null && history === null) {
      throw new Error('Imported data does not contain exercises, templates, or history');
    }

    // Validate structure of exercises if present
    if (exercises) {
      for (const item of exercises) {
        if (!item.id || !item.name || !item.category) {
          throw new Error('Invalid exercise format: missing id, name or category');
        }
      }
    }

    // Validate structure of templates if present
    if (templates) {
      for (const item of templates) {
        if (!item.id || !item.name || !Array.isArray(item.exercises)) {
          throw new Error('Invalid template format: missing id, name or exercises array');
        }
      }
    }

    // Validate structure of history if present
    if (history) {
      for (const item of history) {
        if (!item.id || !item.name || !item.startTime || !item.endTime || !Array.isArray(item.exercises)) {
          throw new Error('Invalid history format: missing id, name, startTime, endTime or exercises array');
        }
      }
    }

    // If validation passes, write to localStorage
    if (exercises) {
      localStorage.setItem(STORAGE_KEYS.EXERCISES, JSON.stringify(exercises));
    }
    if (templates) {
      localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(templates));
    }
    if (history) {
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
    }

    return true;
  } catch (e) {
    console.error('Import validation failed:', e);
    throw e;
  }
};

/**
 * Clear all gym tracker data and restore default exercises.
 */
export const resetAllData = (): void => {
  localStorage.removeItem(STORAGE_KEYS.EXERCISES);
  localStorage.removeItem(STORAGE_KEYS.TEMPLATES);
  localStorage.removeItem(STORAGE_KEYS.HISTORY);
  localStorage.removeItem(STORAGE_KEYS.SETTINGS);
  // Re-preload defaults
  getExercises();
};
