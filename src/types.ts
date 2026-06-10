export interface Exercise {
  id: string;
  name: string;
  category: string;
  notes?: string;
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
}

export interface BackupData {
  exercises: Exercise[];
  templates: WorkoutTemplate[];
  history: LoggedWorkout[];
}
