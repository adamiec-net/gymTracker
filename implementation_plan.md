# Gym Tracker PWA - Implementation Plan

A Progressive Web App (PWA) gym tracker built using React + Vite + TypeScript. The application is designed to run locally in the browser and be installable on Android devices, featuring a sleek modern minimalist dark theme. All workout data is stored locally in the browser's `localStorage` with options to export and import backups.

## User Review Required
None.

## Open Questions
None.

## Proposed Changes

### Setup and Configuration

#### [NEW] [package.json](file:///c:/source/gymTracker/package.json)
We will initialize the Vite React TypeScript application.

#### [NEW] [vite.config.ts](file:///c:/source/gymTracker/vite.config.ts)
Configure Vite to support building the PWA. We will configure basic asset copy or write custom steps to handle the PWA assets.

#### [NEW] [public/manifest.json](file:///c:/source/gymTracker/public/manifest.json)
PWA web app manifest to allow installation on Android. It will specify the app name, start URL, theme color, background color, display mode (`standalone`), and app icons.

#### [NEW] [public/sw.js](file:///c:/source/gymTracker/public/sw.js)
A lightweight service worker to handle offline caching of assets and basic offline operation.

#### [NEW] [src/registerServiceWorker.ts](file:///c:/source/gymTracker/src/registerServiceWorker.ts)
Script to register the service worker on application startup.

### Core Logic and Types

#### [NEW] [src/types.ts](file:///c:/source/gymTracker/src/types.ts)
Define data structures:
- `Exercise`: `id`, `name`, `category`, `notes`
- `WorkoutSet`: `reps`, `weight`, `completed`
- `WorkoutExercise`: `exerciseId`, `sets`: `WorkoutSet[]`
- `WorkoutTemplate`: `id`, `name`, `exercises`: `WorkoutExercise[]`, `scheduleDays`: `number[]` (0=Sun, 1=Mon, ..., 6=Sat)
- `LoggedWorkout`: `id`, `templateId` (optional), `name`, `startTime`, `endTime`, `exercises`: `WorkoutExercise[]`

#### [NEW] [src/services/storage.ts](file:///c:/source/gymTracker/src/services/storage.ts)
Manage local storage for:
- Exercises list (preloaded with default values: Pompki, Podciąganie nachwytem, Podciąganie podchwytem, Przysiady, Swing kettlem)
- Workout templates
- Workout history
- Export/Import helper to export/import JSON.

### UI Styling

#### [NEW] [src/index.css](file:///c:/source/gymTracker/src/index.css)
Establish the modern minimalist dark theme design system:
- High contrast dark backgrounds (`#121212`, `#1e1e1e`, `#2d2d2d`).
- Clean minimalist typography (using system fonts or Inter if available, sizing, spacing).
- Accent colors (minimalist gray/white with a primary cyan/blue or electric accent for active actions and checkmarks).
- Modern minimalist components (clean borders, no heavy shadows, sharp or slightly rounded corners, clear active states).
- Layout: full screen mobile layout with bottom navigation or clean top tabs.

### Components

#### [NEW] [src/components/Navigation.tsx](file:///c:/source/gymTracker/src/components/Navigation.tsx)
Bottom or side navigation bar to switch between views:
- Schedule / Home
- Workouts / Templates
- Exercise Library
- History
- Statistics
- Settings

#### [NEW] [src/components/WorkoutSchedule.tsx](file:///c:/source/gymTracker/src/components/WorkoutSchedule.tsx)
Shows the training schedule. Displays current day and week days, showing which workout template is planned for today. Provides a quick action to start today's workout.

#### [NEW] [src/components/WorkoutTemplates.tsx](file:///c:/source/gymTracker/src/components/WorkoutTemplates.tsx)
Manage pre-defined workout templates:
- View templates (e.g. PUSH, PULL, LEGS).
- Add/Edit/Delete templates.
- Define planned sets, reps, and default weights.
- Configure schedule days.

#### [NEW] [src/components/ExerciseLibrary.tsx](file:///c:/source/gymTracker/src/components/ExerciseLibrary.tsx)
Manage exercises:
- View predefined exercises.
- Create new custom exercises.
- Search/filter exercises.

#### [NEW] [src/components/WorkoutActive.tsx](file:///c:/source/gymTracker/src/components/WorkoutActive.tsx)
The active workout interface (workout tracker):
- Real-time logging of sets, reps, weight.
- Interactive checkboxes to mark sets as done.
- Shows planned vs actual values.
- Quick buttons to add/remove sets.
- Integrated Rest Timer component.
- Add exercise on-the-fly.
- "Finish Workout" button (validates and saves to history, triggers success screen).

#### [NEW] [src/components/RestTimer.tsx](file:///c:/source/gymTracker/src/components/RestTimer.tsx)
Rest timer that runs in the active workout:
- Countdown timer (e.g., 60s, 90s, 120s or custom).
- Visual circular progress or minimalist digital clock.
- Start/Pause/Skip buttons.
- Play sound/vibrate when finished (if browser permissions allow).

#### [NEW] [src/components/WorkoutHistory.tsx](file:///c:/source/gymTracker/src/components/WorkoutHistory.tsx)
View past logged workouts:
- Scrollable list of previous sessions.
- Detailed view of completed sets/weight/reps.
- Delete entries.

#### [NEW] [src/components/WorkoutStats.tsx](file:///c:/source/gymTracker/src/components/WorkoutStats.tsx)
Visualize progress:
- Select an exercise to see progress.
- Simple minimalist chart showing 1RM estimate or max weight/volume per workout session.

#### [NEW] [src/components/Settings.tsx](file:///c:/source/gymTracker/src/components/Settings.tsx)
App management:
- Export data to a JSON file.
- Import data from a JSON file (validation + loading).
- Clear all data button (with confirm).
- PWA Installation info/status.

### Main App Assembly

#### [MODIFY] [src/App.tsx](file:///c:/source/gymTracker/src/App.tsx)
Main router and layout coordinator. Integrates state management (active workout state, current active tab, rest timer state).

## Verification Plan

### Manual Verification
1. Run application in development mode (`npm run dev`) and test core workflows:
   - Browse default exercises and add a custom one.
   - Create a template "Trening A", add exercises, define sets/reps, set schedule.
   - Start active workout from "Trening A".
   - Modify actual reps/weight, complete sets, trigger rest timer.
   - Finish workout, verify it saves to History.
   - Check Statistics for the exercise to see if progress registers.
   - Test Backup/Restore (export to JSON, clear data, import JSON, verify recovery).
2. Validate PWA manifest and service worker:
   - Check browser DevTools Application panel for manifest parsing and Service Worker registration.
   - Emulate offline mode in DevTools and refresh the page to verify asset caching.
