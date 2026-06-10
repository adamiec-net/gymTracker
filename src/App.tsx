import { useState } from 'react';
import { Navigation } from './components/Navigation';
import type { Tab } from './components/Navigation';
import { getExercises, getTemplates, getHistory } from './services/storage';
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
  const headerTitle = TAB_TITLES[activeTab];


  const renderActiveView = () => {
    switch (activeTab) {
      case 'schedule':
        return (
          <div className="placeholder-screen flex-column">
            <h2>Harmonogram treningów</h2>
            <p className="text-muted">Zaplanuj swoje treningi na poszczególne dni tygodnia.</p>
            <div className="card">
              <div className="card-header">
                <h3>Dzisiejszy trening</h3>
                <span className="text-success" style={{ fontSize: '12px', fontWeight: 'bold' }}>Środa</span>
              </div>
              <p>Brak zaplanowanego treningu na dzisiaj.</p>
              <button className="btn btn-primary btn-full">Rozpocznij pusty trening</button>
            </div>
            <div className="card">
              <h3>Nadchodzące dni</h3>
              <div className="flex-column gap-12" style={{ marginTop: '8px' }}>
                {['Czwartek', 'Piątek', 'Sobota', 'Niedziela', 'Poniedziałek', 'Wtorek'].map((day, idx) => (
                  <div key={idx} className="flex-row justify-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <span>{day}</span>
                    <span className="text-muted" style={{ fontSize: '13px' }}>Brak planu</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case 'templates': {
        const templates = getTemplates();
        return (
          <div className="placeholder-screen flex-column">
            <h2>Szablony treningowe</h2>
            <p className="text-muted">Twórz szablony i używaj ich do szybkiego rozpoczynania treningu.</p>
            {templates.length === 0 ? (
              <div className="card text-center" style={{ padding: '24px 16px' }}>
                <p className="text-muted" style={{ marginBottom: '16px' }}>Brak zapisanych szablonów.</p>
                <button className="btn btn-secondary btn-full">+ Nowy szablon</button>
              </div>
            ) : (
              <div className="flex-column gap-12">
                {templates.map((tpl) => (
                  <div key={tpl.id} className="card">
                    <div className="card-header">
                      <h3>{tpl.name}</h3>
                      <span className="text-muted">{tpl.exercises.length} ćwiczeń</span>
                    </div>
                    <button className="btn btn-primary btn-sm">Zacznij trening</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }
      case 'exercises': {
        const exercises = getExercises();
        return (
          <div className="placeholder-screen flex-column">
            <h2>Atlas ćwiczeń</h2>
            <p className="text-muted">Przeglądaj bibliotekę ćwiczeń lub dodaj własne customowe ruchy.</p>
            <div className="form-group">
              <input type="text" className="input-text" placeholder="Szukaj ćwiczenia..." disabled />
            </div>
            <div className="flex-column gap-12" style={{ marginTop: '8px' }}>
              {exercises.map((ex) => (
                <div key={ex.id} className="card">
                  <div className="card-header">
                    <h3>{ex.name}</h3>
                    <span className="text-success" style={{ fontSize: '12px', background: 'rgba(0,255,135,0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                      {ex.category}
                    </span>
                  </div>
                  {ex.notes && <p style={{ fontSize: '13px', marginTop: '4px' }}>{ex.notes}</p>}
                </div>
              ))}
            </div>
          </div>
        );
      }
      case 'history': {
        const history = getHistory();
        return (
          <div className="placeholder-screen flex-column">
            <h2>Historia treningów</h2>
            <p className="text-muted">Przeglądaj swoje poprzednie sesje treningowe i ich szczegóły.</p>
            {history.length === 0 ? (
              <div className="card text-center" style={{ padding: '32px 16px' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 12px auto', opacity: 0.5 }}>
                  <path d="M12 8v4l3 3" />
                  <circle cx="12" cy="12" r="9" />
                </svg>
                <h3>Brak historii</h3>
                <p className="text-muted" style={{ marginTop: '8px' }}>Twoje ukończone treningi pojawią się tutaj.</p>
              </div>
            ) : (
              <div className="flex-column gap-12">
                {history.map((workout) => (
                  <div key={workout.id} className="card">
                    <div className="card-header">
                      <h3>{workout.name}</h3>
                      <span className="text-muted" style={{ fontSize: '12px' }}>
                        {new Date(workout.startTime).toLocaleDateString()}
                      </span>
                    </div>
                    <p style={{ fontSize: '13px' }}>Ukończono {workout.exercises.length} ćwiczeń</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }
      case 'stats':
        return (
          <div className="placeholder-screen flex-column">
            <h2>Statystyki progresu</h2>
            <p className="text-muted">Wybierz ćwiczenie, aby zobaczyć historię obciążeń i szacowane 1RM.</p>
            
            <div className="card flex-column align-center text-center" style={{ padding: '24px 16px' }}>
              <h3 style={{ marginBottom: '16px' }}>Przykładowy progres (1RM)</h3>
              <div style={{ width: '100%', height: '140px', position: 'relative', margin: '8px 0' }}>
                <svg width="100%" height="100%" viewBox="0 0 300 120" style={{ overflow: 'visible' }}>
                  <line x1="0" y1="20" x2="300" y2="20" stroke="var(--border)" strokeWidth="1" strokeDasharray="4 4" />
                  <line x1="0" y1="60" x2="300" y2="60" stroke="var(--border)" strokeWidth="1" strokeDasharray="4 4" />
                  <line x1="0" y1="100" x2="300" y2="100" stroke="var(--border)" strokeWidth="1" strokeDasharray="4 4" />
                  
                  <path
                    d="M 20 100 Q 80 80 140 70 T 260 30"
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  
                  <circle cx="20" cy="100" r="5" fill="var(--bg-primary)" stroke="var(--accent)" strokeWidth="2" />
                  <circle cx="80" cy="85" r="5" fill="var(--bg-primary)" stroke="var(--accent)" strokeWidth="2" />
                  <circle cx="140" cy="70" r="5" fill="var(--bg-primary)" stroke="var(--accent)" strokeWidth="2" />
                  <circle cx="200" cy="55" r="5" fill="var(--bg-primary)" stroke="var(--accent)" strokeWidth="2" />
                  <circle cx="260" cy="30" r="5" fill="var(--bg-primary)" stroke="var(--accent)" strokeWidth="2" />

                  <text x="20" y="118" fill="var(--text-secondary)" fontSize="10" textAnchor="middle">Tydzień 1</text>
                  <text x="140" y="118" fill="var(--text-secondary)" fontSize="10" textAnchor="middle">Tydzień 3</text>
                  <text x="260" y="118" fill="var(--text-secondary)" fontSize="10" textAnchor="middle">Tydzień 5</text>
                </svg>
              </div>
              <p className="text-muted" style={{ fontSize: '13px', marginTop: '12px' }}>
                Wykresy wygenerują się automatycznie po zalogowaniu co najmniej dwóch treningów z tym samym ćwiczeniem.
              </p>
            </div>
          </div>
        );
      case 'settings':
        return (
          <div className="placeholder-screen flex-column">
            <h2>Ustawienia aplikacji</h2>
            <p className="text-muted">Zarządzaj swoimi danymi lokalnymi i konfiguracją PWA.</p>
            <div className="card flex-column gap-12">
              <h3>Kopia zapasowa (Backup)</h3>
              <button className="btn btn-secondary btn-full">Eksportuj dane do pliku</button>
              <button className="btn btn-secondary btn-full">Importuj dane z pliku</button>
            </div>
            <div className="card flex-column gap-12">
              <h3>Usuwanie danych</h3>
              <p className="text-danger" style={{ fontSize: '13px' }}>
                Tej operacji nie można cofnąć. Wszystkie zalogowane treningi, szablony oraz ćwiczenia zostaną bezpowrotnie usunięte.
              </p>
              <button className="btn btn-danger btn-full">Wyczyść wszystkie dane</button>
            </div>
            <div className="card text-center">
              <h3>O aplikacji</h3>
              <p style={{ marginTop: '8px' }}>Gym Tracker PWA v1.0.0</p>
              <span className="text-success" style={{ fontSize: '12px', display: 'block', marginTop: '4px' }}>
                Aplikacja gotowa do pracy offline
              </span>
            </div>
          </div>
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
