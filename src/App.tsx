import { useState } from 'react';
import { Navigation } from './components/Navigation';
import type { Tab } from './components/Navigation';
import { WorkoutSchedule } from './components/WorkoutSchedule';
import { WorkoutTemplates } from './components/WorkoutTemplates';
import { ExerciseLibrary } from './components/ExerciseLibrary';
import { WorkoutActive } from './components/WorkoutActive';
import { WorkoutHistory } from './components/WorkoutHistory';
import { WorkoutStats } from './components/WorkoutStats';
import { Settings } from './components/Settings';
import type { WorkoutTemplate } from './types';
import './App.css';

const TAB_TITLES: Record<Tab, string> = {
  schedule: 'Harmonogram',
  templates: 'Szablony',
  exercises: 'Atlas ćwiczeń',
  history: 'Historia treningów',
  stats: 'Statystyki',
  settings: 'Ustawienia',
};

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('schedule');
  const [activeWorkout, setActiveWorkout] = useState<WorkoutTemplate | null>(null);
  const headerTitle = TAB_TITLES[activeTab];

  if (activeWorkout) {
    return (
      <div className="app-container">
        <header className="app-header">
          <h1>Aktywny trening</h1>
          <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)' }}>
            GymTracker
          </div>
        </header>
        
        <main className="app-content">
          <WorkoutActive
            template={activeWorkout}
            onFinish={() => {
              setActiveWorkout(null);
              setActiveTab('history');
            }}
            onCancel={() => {
              setActiveWorkout(null);
            }}
          />
        </main>
      </div>
    );
  }

  const renderActiveView = () => {
    switch (activeTab) {
      case 'schedule':
        return (
          <WorkoutSchedule onStartWorkout={setActiveWorkout} />
        );
      case 'templates':
        return (
          <WorkoutTemplates onStartWorkout={setActiveWorkout} />
        );
      case 'exercises':
        return (
          <ExerciseLibrary />
        );

      case 'history':
        return (
          <WorkoutHistory />
        );
      case 'stats':
        return (
          <WorkoutStats />
        );
      case 'settings':
        return (
          <Settings />
        );
      default:
        return null;
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>{headerTitle}</h1>
        <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)' }}>
          GymTracker
        </div>
      </header>
      
      <main className="app-content">
        {renderActiveView()}
      </main>

      <Navigation activeTab={activeTab} onTabSelect={setActiveTab} />
    </div>
  );
}

export default App;
