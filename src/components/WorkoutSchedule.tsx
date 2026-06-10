import { useState } from 'react';
import { getTemplates, getSettings, saveSettings, getHistory } from '../services/storage';
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
  const [templates] = useState<WorkoutTemplate[]>(() => getTemplates());
  const [settings, setSettings] = useState(() => getSettings());
  const [history] = useState(() => getHistory());
  const [selectedQuickTemplateId, setSelectedQuickTemplateId] = useState(() => {
    const allTemplates = getTemplates();
    return allTemplates.length > 0 ? allTemplates[0].id : '';
  });

  const handleScheduleTypeChange = (type: 'weekly' | 'rotational') => {
    const updated = { ...settings, scheduleType: type };
    setSettings(updated);
    saveSettings(updated);
  };

  const toggleRotationTemplate = (id: string) => {
    const current = settings.rotationTemplates || [];
    let updated: string[];
    if (current.includes(id)) {
      updated = current.filter(tId => tId !== id);
    } else {
      updated = [...current, id];
    }
    const newSettings = { ...settings, rotationTemplates: updated };
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const handleTargetChange = (target: number) => {
    const newSettings = { ...settings, weeklyWorkoutTarget: target };
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const getWeeklyWorkoutCount = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    monday.setHours(0, 0, 0, 0);

    return history.filter(w => new Date(w.startTime).getTime() >= monday.getTime()).length;
  };

  const getNextSuggestedTemplate = () => {
    const queue = settings.rotationTemplates || [];
    if (queue.length === 0) return null;

    const lastRotationWorkout = history.find(w => w.templateId && queue.includes(w.templateId));
    
    if (!lastRotationWorkout || !lastRotationWorkout.templateId) {
      return templates.find(t => t.id === queue[0]) || null;
    }

    const lastIdx = queue.indexOf(lastRotationWorkout.templateId);
    if (lastIdx === -1) {
      return templates.find(t => t.id === queue[0]) || null;
    }
    const nextIdx = (lastIdx + 1) % queue.length;
    const nextId = queue[nextIdx];

    return templates.find(t => t.id === nextId) || null;
  };

  const weeklyCount = getWeeklyWorkoutCount();
  const target = settings.weeklyWorkoutTarget || 3;
  const nextSuggested = getNextSuggestedTemplate();
  const progressPercent = Math.min(100, (weeklyCount / target) * 100);

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
      <div className="flex-row justify-between align-center">
        <h2>Harmonogram treningów</h2>
      </div>

      {/* Schedule Type Segmented Control */}
      <div className="flex-row" style={{ gap: '8px', background: 'rgba(255,255,255,0.02)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border)' }}>
        <button
          type="button"
          className={`chip-btn ${settings.scheduleType === 'weekly' ? 'active' : ''}`}
          onClick={() => handleScheduleTypeChange('weekly')}
          style={{ flex: 1, textAlign: 'center', padding: '8px 0', border: 'none', background: settings.scheduleType === 'weekly' ? 'var(--accent)' : 'transparent', color: settings.scheduleType === 'weekly' ? 'var(--bg-primary)' : 'var(--text-secondary)', fontWeight: '600', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s ease' }}
        >
          📅 Plan Tygodniowy
        </button>
        <button
          type="button"
          className={`chip-btn ${settings.scheduleType === 'rotational' ? 'active' : ''}`}
          onClick={() => handleScheduleTypeChange('rotational')}
          style={{ flex: 1, textAlign: 'center', padding: '8px 0', border: 'none', background: settings.scheduleType === 'rotational' ? 'var(--accent)' : 'transparent', color: settings.scheduleType === 'rotational' ? 'var(--bg-primary)' : 'var(--text-secondary)', fontWeight: '600', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s ease' }}
        >
          🔄 Pętla Rotacyjna
        </button>
      </div>

      {/* Current Date Card */}
      <div className="card" style={{ padding: '12px 16px', borderLeft: '4px solid var(--accent)' }}>
        <span className="text-muted" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Dzisiejsza data
        </span>
        <h3 style={{ fontSize: '16px', marginTop: '2px', fontWeight: '700' }}>{formattedDate}</h3>
      </div>

      {settings.scheduleType === 'weekly' ? (
        <>
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
        </>
      ) : (
        <>
          {/* Target and Progress Card */}
          <div className="card flex-column gap-8">
            <div className="flex-row justify-between align-center">
              <span className="text-muted" style={{ fontSize: '13px' }}>Cel tygodniowy:</span>
              <div className="flex-row align-center gap-8">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleTargetChange(Math.max(1, target - 1))}
                  style={{ width: '28px', height: '28px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 0 }}
                >
                  -
                </button>
                <strong style={{ fontSize: '15px' }}>{target}</strong>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleTargetChange(Math.min(7, target + 1))}
                  style={{ width: '28px', height: '28px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 0 }}
                >
                  +
                </button>
              </div>
            </div>
            
            <div className="flex-row justify-between align-end" style={{ marginTop: '4px' }}>
              <span style={{ fontSize: '14px', fontWeight: '600' }}>Ukończono w tym tygodniu:</span>
              <span style={{ fontSize: '16px', fontWeight: '700', color: 'var(--accent-success)' }}>
                {weeklyCount} z {target}
              </span>
            </div>

            <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden', marginTop: '4px' }}>
              <div style={{ width: `${progressPercent}%`, height: '100%', background: 'var(--accent-success)', transition: 'width 0.3s ease' }} />
            </div>
          </div>

          {/* Next Suggested Workout */}
          <div className="card flex-column gap-12" style={{ borderLeft: '4px solid var(--accent-success)', padding: '16px' }}>
            <span className="text-success" style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Sugerowany kolejny trening
            </span>
            {nextSuggested ? (
              <div className="flex-column gap-12">
                <div className="flex-column" style={{ gap: '2px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '700' }}>{nextSuggested.name}</h3>
                  <p className="text-muted" style={{ fontSize: '13px' }}>
                    Szablon zawiera {nextSuggested.exercises.length} ćwiczeń.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-success btn-full btn-large"
                  onClick={() => onStartWorkout(nextSuggested)}
                  style={{ padding: '12px 20px', fontSize: '14px' }}
                >
                  Rozpocznij sugerowany: {nextSuggested.name}
                </button>
              </div>
            ) : (
              <div className="text-center" style={{ padding: '8px 0' }}>
                <p className="text-muted" style={{ fontSize: '13px' }}>
                  Włącz szablony do rotacji poniżej, aby aktywować podpowiedzi.
                </p>
              </div>
            )}
          </div>

          {/* Rotation Setup List */}
          <div className="card flex-column gap-12">
            <h3>Konfiguracja rotacji</h3>
            <p className="text-muted" style={{ fontSize: '13px', lineHeight: '1.4' }}>
              Wybierz szablony, które mają pojawiać się kolejno po sobie. Numer oznacza kolejność w pętli.
            </p>

            <div className="flex-column gap-8" style={{ marginTop: '4px' }}>
              {templates.length === 0 ? (
                <p className="text-muted text-center" style={{ padding: '12px', fontSize: '13px' }}>
                  Brak dostępnych szablonów. Stwórz je w zakładce Szablony.
                </p>
              ) : (
                templates.map((t) => {
                  const rotationIdx = (settings.rotationTemplates || []).indexOf(t.id);
                  const inRotation = rotationIdx !== -1;

                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggleRotationTemplate(t.id)}
                      className="flex-row justify-between align-center"
                      style={{
                        padding: '10px 12px',
                        background: inRotation ? 'rgba(255, 0, 127, 0.05)' : 'rgba(255,255,255,0.01)',
                        border: inRotation ? '1px solid rgba(255, 0, 127, 0.25)' : '1px solid var(--border)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        width: '100%',
                        textAlign: 'left',
                        color: 'inherit',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div className="flex-column" style={{ gap: '2px' }}>
                        <span style={{ fontWeight: '600', fontSize: '14px', color: inRotation ? 'var(--accent)' : 'var(--text-primary)' }}>
                          {t.name}
                        </span>
                        <span className="text-muted" style={{ fontSize: '12px' }}>
                          {t.exercises.length} ćw.
                        </span>
                      </div>

                      {inRotation ? (
                        <span
                          className="chip-btn active"
                          style={{
                            fontSize: '11px',
                            background: 'var(--accent)',
                            color: 'var(--bg-primary)',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontWeight: 'bold'
                          }}
                        >
                          Krok #{rotationIdx + 1}
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: '11px',
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--border)',
                            padding: '2px 8px',
                            borderRadius: '4px'
                          }}
                        >
                          Nieaktywny
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
          
          {/* Quick Start dropdown fallback inside rotation */}
          {templates.length > 0 && (
            <div className="card flex-column gap-12">
              <h3>Uruchom dowolny trening</h3>
              <div className="flex-column gap-8">
                <div className="form-group">
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
            </div>
          )}
        </>
      )}
    </div>
  );
}
