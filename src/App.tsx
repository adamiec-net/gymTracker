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
import { getSettings, saveSettings } from './services/storage';
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
  const [pendingWorkout, setPendingWorkout] = useState<WorkoutTemplate | null>(null);
  const [confirmWeight, setConfirmWeight] = useState<number>(() => getSettings().userWeight || 80);
  const [activeWorkoutWeight, setActiveWorkoutWeight] = useState<number>(80);
  const headerTitle = TAB_TITLES[activeTab];

  const handleStartWorkoutRequest = (template: WorkoutTemplate) => {
    const currentSettings = getSettings();
    setConfirmWeight(currentSettings.userWeight || 80);
    setPendingWorkout(template);
  };

  const handleConfirmWeight = () => {
    if (pendingWorkout) {
      const currentSettings = getSettings();
      saveSettings({ ...currentSettings, userWeight: confirmWeight });
      setActiveWorkoutWeight(confirmWeight);
      setActiveWorkout(pendingWorkout);
      setPendingWorkout(null);
    }
  };

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
            userWeight={activeWorkoutWeight}
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
          <WorkoutSchedule onStartWorkout={handleStartWorkoutRequest} />
        );
      case 'templates':
        return (
          <WorkoutTemplates onStartWorkout={handleStartWorkoutRequest} />
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

      {pendingWorkout && (
        <div className="modal-backdrop">
          <div className="modal-content card" style={{ maxWidth: '360px', padding: '24px 20px' }}>
            <div className="card-header" style={{ marginBottom: '16px', borderBottom: 'none', padding: 0 }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Wprowadź swoją wagę</h3>
              <button 
                className="btn-close" 
                onClick={() => setPendingWorkout(null)}
                aria-label="Zamknij"
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '24px', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>
            
            <p className="text-muted text-center" style={{ fontSize: '13px', marginBottom: '20px', lineHeight: '1.4' }}>
              Podaj aktualną wagę przed rozpoczęciem treningu. Będzie ona używana do statystyk ćwiczeń z ciężarem własnego ciała.
            </p>

            <div className="flex-row align-center justify-center gap-12" style={{ marginBottom: '24px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setConfirmWeight(prev => Math.max(0, parseFloat((prev - 0.1).toFixed(1))))}
                style={{ width: '40px', height: '40px', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', padding: 0 }}
              >
                -
              </button>
              
              <input
                type="number"
                className="input-text text-center"
                value={confirmWeight}
                onChange={(e) => setConfirmWeight(Math.max(0, parseFloat(parseFloat(e.target.value).toFixed(1)) || 0))}
                step="0.1"
                min="0"
                style={{ width: '90px', fontSize: '22px', fontWeight: '700', height: '44px', padding: 0 }}
              />

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setConfirmWeight(prev => parseFloat((prev + 0.1).toFixed(1)))}
                style={{ width: '40px', height: '40px', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', padding: 0 }}
              >
                +
              </button>
              <span style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-secondary)' }}>kg</span>
            </div>

            <div className="flex-row gap-8">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setPendingWorkout(null)}
                style={{ flex: 1 }}
              >
                Anuluj
              </button>
              <button
                type="button"
                className="btn btn-success"
                onClick={handleConfirmWeight}
                style={{ flex: 2 }}
              >
                Rozpocznij
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
