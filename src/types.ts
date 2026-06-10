export interface Exercise {
  id: string;
  name: string;
  category: string;
  notes?: string;
  isBodyweight?: boolean;
}

export interface WorkoutSet {
  reps: number;
  weight: number;
  completed: boolean;
}

export interface WorkoutExercise {
  exerciseId: string;
  sets: WorkoutSet[];
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  exercises: WorkoutExercise[];
  scheduleDays: number[]; // 0 = Sun, 1 = Mon, ..., 6 = Sat
}

export interface LoggedWorkout {
  id: string;
  templateId?: string;
  name: string;
  startTime: string; // ISO string representation
  endTime: string;   // ISO string representation
  exercises: WorkoutExercise[];
  bodyWeight?: number;
}

export interface WeightLog {
  id: string;
  date: string; // ISO String (data wpisu)
  weight: number;
  source: 'manual' | 'workout';
  workoutId?: string; // ID treningu, jeśli waga pochodzi z treningu
}

export interface BackupData {
  exercises: Exercise[];
  templates: WorkoutTemplate[];
  history: LoggedWorkout[];
  weightHistory?: WeightLog[]; // Opcjonalne pole dla kompatybilności wstecznej
}

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface Window {
    deferredPrompt?: BeforeInstallPromptEvent | null;
  }
}

export interface AppSettings {
  defaultTimerDuration: number; // in seconds
  userWeight?: number;
  scheduleType?: 'weekly' | 'rotational';
  rotationTemplates?: string[];
  weeklyWorkoutTarget?: number;
}

