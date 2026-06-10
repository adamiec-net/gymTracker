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

## File Directory Structure & Changes

Below is a breakdown of the key files implemented across the project:

### Configuration & PWA Assets
- [package.json](file:///c:/source/gymTracker/package.json): Set up React, TypeScript, and Vite scripts.
- [vite.config.ts](file:///c:/source/gymTracker/vite.config.ts): Configured React plugin and static asset building.
- [index.html](file:///c:/source/gymTracker/index.html): Custom viewport configuration, mobile meta tags, manifest linkage, and application icon headers.
- [public/manifest.json](file:///c:/source/gymTracker/public/manifest.json): Configuration for standalone app mode, startup parameters, theme colors, and SVG icon declarations.
- [public/sw.js](file:///c:/source/gymTracker/public/sw.js): Serves cached assets offline, updating them in the background.
- [src/registerServiceWorker.ts](file:///c:/source/gymTracker/src/registerServiceWorker.ts): Handles SW registration on browser boot.

### Core Logic & State Management
- [src/types.ts](file:///c:/source/gymTracker/src/types.ts): Data structure declarations for `Exercise`, `WorkoutSet`, `WorkoutExercise`, `WorkoutTemplate`, `LoggedWorkout`, and PWA event typings.
- [src/services/storage.ts](file:///c:/source/gymTracker/src/services/storage.ts): Implements CRUD actions on `localStorage` with lazy storage initialization and secure JSON backup import checks.
- [src/main.tsx](file:///c:/source/gymTracker/src/main.tsx): Root mount logic that listens for the `beforeinstallprompt` event to enable the "Install" button inside the Settings page.
- [src/App.tsx](file:///c:/source/gymTracker/src/App.tsx): Coordinates tabs, displays the navigation menu, and coordinates the mounting of active workouts.

### Design System & Layout
- [src/index.css](file:///c:/source/gymTracker/src/index.css): Implements custom dark themes (`#121212` primary background, `#00d2ff` electric cyan accent), responsive layout blocks, and checklist animations.

### Views & Components (`src/components/`)
- [Navigation.tsx](file:///c:/source/gymTracker/src/components/Navigation.tsx): Implements a sleek bottom navigation bar using premium inline SVG icons.
- [WorkoutSchedule.tsx](file:///c:/source/gymTracker/src/components/WorkoutSchedule.tsx): Renders a 7-day visual calendar highlighting today. Displays today's planned template with a primary "Start Workout" button.
- [WorkoutTemplates.tsx](file:///c:/source/gymTracker/src/components/WorkoutTemplates.tsx): Supports creating, editing, and deleting plans. Allows assigning days, adding exercises, and defining planned weights and reps for sets.
- [ExerciseLibrary.tsx](file:///c:/source/gymTracker/src/components/ExerciseLibrary.tsx): Atlas listing default and custom exercises. Offers category selection pills, search filters, and an inline overlay form.
- [WorkoutActive.tsx](file:///c:/source/gymTracker/src/components/WorkoutActive.tsx): Tracker interface displaying set list completion boxes. Automatically triggers the rest timer on checked sets, tracks total elapsed time, and enables adding exercises ad-hoc.
- [RestTimer.tsx](file:///c:/source/gymTracker/src/components/RestTimer.tsx): Circle countdown widget with start, pause, skip, and +30s buttons. Triggers offline alarm beeps and vibration.
- [WorkoutHistory.tsx](file:///c:/source/gymTracker/src/components/WorkoutHistory.tsx): Chronological logs detailing completed sets and duration, with options to delete entries.
- [WorkoutStats.tsx](file:///c:/source/gymTracker/src/components/WorkoutStats.tsx): Custom interactive SVG line graph displaying maximum weight or Estimated 1RM (Epley formula) over time, with detailed stats display for selected data points.
- [Settings.tsx](file:///c:/source/gymTracker/src/components/Settings.tsx): Handles backup exports, validated file imports, resets, and displays the PWA installation button.

---

## Verification Results

### Quality Assurance & Validation Tests
1. **Compilation**: `npx tsc --noEmit` and `npm run build` execute successfully.
2. **Linter Check**: Running `npm run lint` yields **0 warnings or errors** across all components.
3. **PWA Compliance**: The service worker, manifest structure, and static assets are fully compliant with Lighthouse PWA installation requirements.
4. **Data Isolation**: Application uses lazy state initialization (`useState(() => get...)`) to avoid double renders and React Hooks side-effects.

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
