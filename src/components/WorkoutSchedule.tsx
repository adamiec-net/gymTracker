import { useState, useEffect } from 'react';
import { getTemplates } from '../services/storage';
import type { WorkoutTemplate } from '../types';

interface WorkoutScheduleProps {
  onStartWorkout: (template: WorkoutTemplate) => void;
}

const WEEK_DAYS = [
  { label: 'Poniedziałek', short: 'Pn', value: 1 },
  { label: 'Wtorek', short: 'Wt', value: 2 },
  { label: 'Środa', short: 'Śr', value: 3 },
  { label: 'Czwartek', short: 'Cz', value: 4 },
  { label: 'Piątek', short: 'Pt', value: 5 },
  { label: 'Sobota', short: 'Sb', value: 6 },
  { label: 'Niedziela', short: 'Nd', value: 0 },
];

export function WorkoutSchedule({ onStartWorkout }: WorkoutScheduleProps) {
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [selectedQuickTemplateId, setSelectedQuickTemplateId] = useState('');

  useEffect(() => {
    const allTemplates = getTemplates();
    setTemplates(allTemplates);
    if (allTemplates.length > 0) {
      setSelectedQuickTemplateId(allTemplates[0].id);
    }
  }, []);

  const todayNum = new Date().getDay(); // 0 = Sun, 1 = Mon, ...
  
  // Format current date in Polish: e.g. Środa, 10 czerwca 2026
  const currentDateStr = new Date().toLocaleDateString('pl-PL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Capitalize the first letter of date string
  const formattedDate = currentDateStr.charAt(0).toUpperCase() + currentDateStr.slice(1);

  // Find templates for today
  const todayTemplates = templates.filter((t) => t.scheduleDays.includes(todayNum));

  const handleStartTodayWorkout = () => {
    if (todayTemplates.length > 0) {
      onStartWorkout(todayTemplates[0]);
    }
  };

  const handleStartQuickWorkout = () => {
    const found = templates.find((t) => t.id === selectedQuickTemplateId);
    if (found) {
      onStartWorkout(found);
    }
  };

  return (
    <div className="flex-column gap-12">
      <h2>Harmonogram treningów</h2>
      
      {/* Current Date Card */}
      <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid var(--accent)' }}>
        <span className="text-muted" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Dzisiejsza data
        </span>
        <h3 style={{ fontSize: '18px', marginTop: '4px', fontWeight: '700' }}>{formattedDate}</h3>
      </div>

      {/* 7-Day Calendar Block */}
      <div className="card">
        <h3 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)' }}>
          Rozkład Tygodnia
        </h3>
        
        {/* Horizontal Calendar Icons */}
        <div className="week-grid">
          {WEEK_DAYS.map((day) => {
            const isToday = day.value === todayNum;
            const dayTemplates = templates.filter((t) => t.scheduleDays.includes(day.value));
            const hasWorkout = dayTemplates.length > 0;

            return (
              <div 
                key={day.value} 
                className={`week-day-cell ${isToday ? 'today' : ''} ${hasWorkout ? 'has-workout' : ''}`}
              >
                <span className="day-name">{day.short}</span>
                <div className="indicator-dot" />
              </div>
            );
          })}
        </div>

        {/* Detailed List mapping templates to days */}
        <div className="flex-column" style={{ marginTop: '12px', gap: '8px' }}>
          {WEEK_DAYS.map((day) => {
            const isToday = day.value === todayNum;
            const dayTemplates = templates.filter((t) => t.scheduleDays.includes(day.value));

            return (
              <div 
                key={day.value} 
                className="flex-row justify-between align-center" 
                style={{ 
                  padding: '8px 0', 
                  borderBottom: '1px solid rgba(45, 45, 45, 0.4)',
                  fontWeight: isToday ? '600' : 'normal',
                  color: isToday ? 'var(--text-primary)' : 'var(--text-secondary)'
                }}
              >
                <div className="flex-row">
                  <span>{day.label}</span>
                  {isToday && (
                    <span 
                      className="text-success" 
                      style={{ fontSize: '11px', background: 'rgba(0,255,135,0.1)', padding: '1px 6px', borderRadius: '4px', marginLeft: '4px' }}
                    >
                      Dziś
                    </span>
                  )}
                </div>
                
                <span style={{ fontSize: '13px', color: dayTemplates.length > 0 ? 'var(--accent)' : 'var(--text-secondary)' }}>
                  {dayTemplates.length > 0 
                    ? dayTemplates.map(t => t.name).join(', ') 
                    : 'Brak planu'
                  }
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Call To Action Card */}
      <div className="card" style={{ marginTop: '8px' }}>
        {todayTemplates.length > 0 ? (
          <div className="flex-column gap-12 text-center" style={{ padding: '8px 0' }}>
            <h3 style={{ fontSize: '16px' }}>Czas na dzisiejszy trening!</h3>
            <p className="text-muted">
              Masz dziś zaplanowany trening: <strong>{todayTemplates[0].name}</strong>.
            </p>
            <button 
              className="btn btn-success btn-full btn-large" 
              onClick={handleStartTodayWorkout}
              style={{ padding: '14px 20px', fontSize: '15px' }}
            >
              Rozpocznij dzisiejszy trening: {todayTemplates[0].name}
            </button>
          </div>
        ) : (
          <div className="flex-column gap-12">
            <div className="text-center" style={{ padding: '8px 0 0 0' }}>
              <h3 style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>Brak zaplanowanego treningu na dziś</h3>
              <p className="text-muted" style={{ fontSize: '13px', marginTop: '4px' }}>
                Wybierz inny szablon ze swojej biblioteki, aby rozpocząć trening.
              </p>
            </div>
            
            {templates.length === 0 ? (
              <div className="text-center" style={{ padding: '8px' }}>
                <p className="text-muted" style={{ fontSize: '13px', marginBottom: '12px' }}>
                  Nie masz jeszcze żadnych szablonów treningowych.
                </p>
                <div style={{ fontSize: '13px', color: 'var(--accent)' }}>
                  Przejdź do zakładki <strong>Szablony</strong>, aby stworzyć swój pierwszy plan.
                </div>
              </div>
            ) : (
              <div className="flex-column gap-8" style={{ marginTop: '4px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '11px' }}>Szybki start</label>
                  <select
                    className="input-text"
                    value={selectedQuickTemplateId}
                    onChange={(e) => setSelectedQuickTemplateId(e.target.value)}
                    style={{ appearance: 'none', backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23ffffff\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'><polyline points=\'6 9 12 15 18 9\'></polyline></svg>")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '16px' }}
                  >
                    {templates.map((t) => (
                      <option key={t.id} value={t.id} style={{ backgroundColor: 'var(--bg-surface)' }}>
                        {t.name} ({t.exercises.length} ćw.)
                      </option>
                    ))}
                  </select>
                </div>
                <button 
                  className="btn btn-primary btn-full" 
                  onClick={handleStartQuickWorkout}
                >
                  Rozpocznij wybrany trening
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
