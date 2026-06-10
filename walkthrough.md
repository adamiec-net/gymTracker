# Walkthrough - Gym Tracker PWA

A complete Progressive Web App (PWA) gym tracker built using **React + Vite + TypeScript + Vanilla CSS**, designed with a premium modern minimalist dark theme. The application runs entirely in the browser, stores data in `localStorage`, operates offline via a service worker, and is installable on Android/iOS/Desktop devices.

---

## Technical Stack & Architecture

- **Frontend Core**: React 18, Vite 8, TypeScript.
- **Styling**: Vanilla CSS (`src/index.css`) utilizing modern CSS variables for semantic theme styling, transition effects, checkmark animation keyframes, and full screen mobile boundaries (using `100dvh` to handle mobile browser toolbars).
- **PWA Capabilities**:
  - Web App Manifest: `public/manifest.json` provides application configuration, theme styling, and application icons.
  - Service Worker: `public/sw.js` caches static resources on install and handles fetch requests using a **stale-while-revalidate** strategy for fast page loads and full offline capability.
  - Offline Audio: `src/components/RestTimer.tsx` uses the **Web Audio API** to synthesize double-beep sounds, eliminating the need to load or request external audio files while offline.
- **Database/Storage**: `src/services/storage.ts` manages persistence in `localStorage`, preloads default exercises, handles templates, history logs, JSON backup downloads, and schema-validated JSON uploads.

---

## Key Features Implemented (Advanced Module)

We have successfully integrated a comprehensive body weight tracking module, historical workout editing, calisthenics performance adjustments, and correlation analysis:

### 1. Data Schema & Persistence Enhancements
- **New Types**: Added `WeightLog` model in [src/types.ts](file:///c:/source/gymTracker/src/types.ts). Extended `BackupData` to support weight history.
- **Bi-directional Sync**: Implemented `syncWeightFromWorkout` in [src/services/storage.ts](file:///c:/source/gymTracker/src/services/storage.ts). Saving a workout with a body weight value automatically creates or updates a corresponding weight log.
- **Propagation Logic**: Modifying or deleting a weight log automatically propagates to the linked workout in history, and deleting a workout automatically cleans up its corresponding weight log.
- **Backup Integrity**: Extended `importData` and `exportData` to handle weight logs seamlessly, ensuring backward compatibility with older backup formats.

### 2. Historical Workout Editing Modal
- **Interactive Controls**: Added a direct "Edytuj" (Edit) button on each card within the [WorkoutHistory.tsx](file:///c:/source/gymTracker/src/components/WorkoutHistory.tsx) tab.
- **EditWorkoutModal**: Opens a premium dark overlay modal allowing users to:
  - Modify workout title, start/end date-times (using timezone-safe helpers).
  - Adjust user body weight logged for the session.
  - Edit reps, weight, and completion state for individual sets.
  - Delete individual sets or add new ones.
  - Add completely new exercises to the historical log, or delete existing ones.
  - Commit updates cleanly via `saveWorkout` with automated state refreshing.

### 3. Differentiated Exercise Statistics
- **Restructured Tab View**: Rebuilt [WorkoutStats.tsx](file:///c:/source/gymTracker/src/components/WorkoutStats.tsx) to support a 3-tab layout (*Ćwiczenia*, *Waga Ciała*, *Korelacja*).
- **Calisthenics Separation**:
  - For standard exercises: calculates and plots **Estimated 1RM** (Epley formula), **Max Weight**, **Total Volume**, and **Max Reps**.
  - For calisthenic exercises (`isBodyweight: true`): body weight is **excluded** from loads. Tracks bodyweight-specific metrics: **Max Reps in Set**, **Sum of Reps**, **Max Additional Weight**, and **Volume (Additional Weight only)**.
  - Hides the body weight line on the SVG chart for calisthenics exercises to avoid chart clutter.

### 4. Dedicated Body Weight Module
- **SVG Weight Trend Chart**: Plots body weight history chronologically with visual gradients, interactive coordinate points, and mobile-friendly touch targets.
- **Summary Metrics**: Calculates current weight, highest/lowest logs, and weight change differences over the last **7 days** and **30 days** using date-range math.
- **Quick Logging**: An easy-to-use logging form to input body weight on any date.
- **Weight Log Manager**: List of all weight logs (descending) supporting instant delete (with confirmation) and **inline editing** using local state toggles.

### 5. Dual-Axis Weight Correlation Analysis
- **Filtering**: Filters dropdown selections to show only calisthenics/bodyweight movements.
- **Dual Y-Axes**: Plots calisthenics performance (solid primary line, left Y-axis in reps or additional kg) against user body weight (dashed secondary line, right Y-axis in kg) on the same timeline.
- **Dynamic Motivational Coach**: Analyzes progress between the first and last sessions. Automatically writes a tailored motivational paragraph in Polish (evaluating weight loss/gain vs strength loss/gain) explaining how weight trends impact relative performance.

---

## File Directory Structure

Below is a breakdown of the key files implemented across the project:

### Configuration & PWA Assets
- [package.json](file:///c:/source/gymTracker/package.json): Set up React, TypeScript, and Vite scripts.
- [vite.config.ts](file:///c:/source/gymTracker/vite.config.ts): Configured React plugin and static asset building.
- [index.html](file:///c:/source/gymTracker/index.html): Custom viewport configuration, mobile meta tags, meta links, and application icon headers.
- [public/manifest.json](file:///c:/source/gymTracker/public/manifest.json): Configuration for standalone app mode, startup parameters, theme colors, and SVG icon declarations.
- [public/sw.js](file:///c:/source/gymTracker/public/sw.js): Serves cached assets offline, updating them in the background.
- [src/registerServiceWorker.ts](file:///c:/source/gymTracker/src/registerServiceWorker.ts): Handles SW registration on browser boot.

### Core Logic & State Management
- [src/types.ts](file:///c:/source/gymTracker/src/types.ts): Data structure declarations for exercises, sets, workouts, PWA events, and `WeightLog`.
- [src/services/storage.ts](file:///c:/source/gymTracker/src/services/storage.ts): CRUD operations, backup JSON imports, and two-way workout-weight sync.
- [src/main.tsx](file:///c:/source/gymTracker/src/main.tsx): Root mount logic that listens for the PWA install event.
- [src/App.tsx](file:///c:/source/gymTracker/src/App.tsx): Coordinates tabs, displays the navigation menu, and coordinates the active workout tracking.

### Design System & Layout
- [src/index.css](file:///c:/source/gymTracker/src/index.css): Implements custom dark themes (`#121212` primary background, `#00d2ff` electric cyan accent), responsive layout blocks, and checklist animations.

### Views & Components (`src/components/`)
- [Navigation.tsx](file:///c:/source/gymTracker/src/components/Navigation.tsx): Bottom navigation bar using premium inline SVG icons.
- [WorkoutSchedule.tsx](file:///c:/source/gymTracker/src/components/WorkoutSchedule.tsx): 7-day calendar, starts scheduled workouts.
- [WorkoutTemplates.tsx](file:///c:/source/gymTracker/src/components/WorkoutTemplates.tsx): Creates, edits, and deletes workout templates.
- [ExerciseLibrary.tsx](file:///c:/source/gymTracker/src/components/ExerciseLibrary.tsx): Atlas listing default and custom exercises.
- [WorkoutActive.tsx](file:///c:/source/gymTracker/src/components/WorkoutActive.tsx): Active tracker interface, checking sets triggers rest timer.
- [RestTimer.tsx](file:///c:/source/gymTracker/src/components/RestTimer.tsx): Circle countdown widget with Web Audio double-beep.
- [WorkoutHistory.tsx](file:///c:/source/gymTracker/src/components/WorkoutHistory.tsx): Chronological completed workouts logs featuring the Edit Workout Modal.
- [WorkoutStats.tsx](file:///c:/source/gymTracker/src/components/WorkoutStats.tsx): Interactive SVG charts for exercise metrics, weight logging, and dual-axis calisthenics-weight correlations.
- [Settings.tsx](file:///c:/source/gymTracker/src/components/Settings.tsx): Handles backup exports/imports, system resets, and PWA installs.

---

## Verification Results

### Quality Assurance & Validation Tests
1. **Compilation**: `npx tsc --noEmit` and `npm run build` execute successfully.
2. **Type Safety**: TypeScript compiler completes with **0 errors**.
3. **Data Integrity**: Lazy state loading (`useState(() => get...)`) ensures there are no race conditions or component side-effects.

---

## How to Run the App

1. Install dependencies (if not already done):
   ```bash
   npm install
   ```
2. Start the local Vite development server:
   ```bash
   npm run dev
   ```
3. Open your browser and navigate to the printed URL (typically `http://localhost:5173`).
4. To test PWA features locally:
   - Run a production build:
     ```bash
     npm run build
     ```
   - Serve the build locally:
     ```bash
     npm run preview
     ```
   - Inspect the application in Google Chrome DevTools (Application tab) to review the **Service Worker** and **Manifest**.
