import { useState, useEffect, useRef } from 'react';
import { exportData, importData, resetAllData, getSettings, saveSettings, getWeightHistory, saveWeightLog, deleteWeightLog, getHistory } from '../services/storage';
import type { BeforeInstallPromptEvent, AppSettings, WeightLog, LoggedWorkout } from '../types';

export function Settings() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    window.deferredPrompt || null
  );
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [settings, setSettings] = useState<AppSettings>(() => getSettings());

  const [weightLogs, setWeightLogs] = useState<WeightLog[]>(() => getWeightHistory());
  const [activeWeightPointIdx, setActiveWeightPointIdx] = useState<number | null>(null);
  const [history] = useState<LoggedWorkout[]>(() => getHistory());

  const getTodayDateStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [newWeightDate, setNewWeightDate] = useState<string>(getTodayDateStr());
  const [newWeightVal, setNewWeightVal] = useState<string>(() => {
    const logs = getWeightHistory();
    return logs.length > 0 ? logs[logs.length - 1].weight.toString() : '80';
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingWeight, setEditingWeight] = useState<string>('');

  // Sync default input weight with latest log
  useEffect(() => {
    if (weightLogs.length > 0) {
      setNewWeightVal(weightLogs[weightLogs.length - 1].weight.toString());
    } else {
      setNewWeightVal('80');
    }
  }, [weightLogs]);

  const handleTimerDurationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const duration = parseInt(e.target.value, 10) || 90;
    const updatedSettings = { ...settings, defaultTimerDuration: duration };
    setSettings(updatedSettings);
    saveSettings(updatedSettings);
  };

  const handleUserWeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    const updatedSettings = { ...settings, userWeight: isNaN(val) ? undefined : val };
    setSettings(updatedSettings);
    saveSettings(updatedSettings);
  };

  useEffect(() => {
    const handleInstallable = (e: Event) => {
      const customEvent = e as CustomEvent<BeforeInstallPromptEvent>;
      setDeferredPrompt(customEvent.detail);
    };
    window.addEventListener('pwa-installable', handleInstallable as EventListener);
    return () => {
      window.removeEventListener('pwa-installable', handleInstallable as EventListener);
    };
  }, []);

  const handleExport = () => {
    try {
      const dataStr = exportData();
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gym_tracker_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Błąd podczas eksportowania danych: ${msg}`);
    }
  };

  const handleImportClick = () => {
    setImportError(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) {
          throw new Error('Plik jest pusty');
        }

        const success = importData(text);
        if (success) {
          alert('Dane zostały pomyślnie zaimportowane. Aplikacja zostanie przeładowana.');
          window.location.reload();
        } else {
          throw new Error('Import zwrócił niepowodzenie');
        }
      } catch (err: unknown) {
        console.error(err);
        const msg = err instanceof Error ? err.message : 'Niepoprawny format pliku JSON.';
        setImportError(msg);
      }
    };
    reader.onerror = () => {
      setImportError('Wystąpił błąd podczas odczytu pliku.');
    };
    reader.readAsText(file);
  };

  const handleReset = () => {
    const confirmed = window.confirm(
      'CZY NA PEWNO chcesz usunąć wszystkie dane? Wszystkie zapisane treningi, szablony i własne ćwiczenia zostaną bezpowrotnie usunięte. Ta operacja przywróci domyślną bazę ćwiczeń.'
    );
    if (confirmed) {
      resetAllData();
      window.location.reload();
    }
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    // Show the install prompt
    await deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    
    // We've used the prompt, and can't use it again, clear it
    window.deferredPrompt = null;
    setDeferredPrompt(null);
  };

  return (
    <div className="flex-column gap-16" style={{ paddingBottom: '32px' }}>
      <div>
        <h2>Ustawienia Aplikacji</h2>
        <p className="text-muted" style={{ fontSize: '13px', marginTop: '2px' }}>
          Zarządzaj swoimi danymi lokalnymi oraz instalacją aplikacji jako PWA.
        </p>
      </div>

      {/* PWA Installation Section */}
      {deferredPrompt && (
        <div className="card flex-column gap-12" style={{ borderLeft: '4px solid var(--accent)' }}>
          <h3>Zainstaluj Aplikację</h3>
          <p style={{ fontSize: '13px' }}>
            Zainstaluj Gym Tracker na swoim urządzeniu, aby mieć łatwy dostęp bezpośrednio z ekranu głównego i korzystać z aplikacji bez przeszkód offline.
          </p>
          <button className="btn btn-primary btn-full" onClick={handleInstall}>
            Zainstaluj aplikację
          </button>
        </div>
      )}

      {/* Workout Settings */}
      <div className="card flex-column gap-12">
        <h3>Ustawienia Treningu</h3>
        <div className="form-group flex-column gap-4">
          <label className="form-label" style={{ fontSize: '13px' }}>
            Domyślny czas odpoczynku:
          </label>
          <select
            className="input-text"
            value={settings.defaultTimerDuration}
            onChange={handleTimerDurationChange}
            style={{ 
              appearance: 'none', 
              backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23ffffff\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'><polyline points=\'6 9 12 15 18 9\'></polyline></svg>")', 
              backgroundRepeat: 'no-repeat', 
              backgroundPosition: 'right 12px center', 
              backgroundSize: '16px' 
            }}
          >
            <option value={30} style={{ backgroundColor: 'var(--bg-surface)' }}>30 sekund</option>
            <option value={45} style={{ backgroundColor: 'var(--bg-surface)' }}>45 sekund</option>
            <option value={60} style={{ backgroundColor: 'var(--bg-surface)' }}>1 minuta (60s)</option>
            <option value={90} style={{ backgroundColor: 'var(--bg-surface)' }}>1.5 minuty (90s)</option>
            <option value={120} style={{ backgroundColor: 'var(--bg-surface)' }}>2 minuty (120s)</option>
            <option value={180} style={{ backgroundColor: 'var(--bg-surface)' }}>3 minuty (180s)</option>
          </select>
        </div>
        <div className="form-group flex-column gap-4">
          <label className="form-label" style={{ fontSize: '13px' }}>
            Domyślna waga użytkownika (kg):
          </label>
          <input
            type="number"
            className="input-text"
            value={settings.userWeight || ''}
            onChange={handleUserWeightChange}
            placeholder="np. 80"
            step="0.1"
            min="0"
          />
        </div>
      </div>

      {/* Historia pomiarów wagi ciała */}
      <div className="card flex-column gap-12">
        <h3>Historia Wagi Ciała</h3>
        
        {/* Weight Summary Stats */}
        {(() => {
          const latestWeight = weightLogs.length > 0 ? weightLogs[weightLogs.length - 1].weight : null;
          const weights = weightLogs.map((l) => l.weight);
          const minWeightVal = weights.length > 0 ? Math.min(...weights) : null;
          const maxWeightVal = weights.length > 0 ? Math.max(...weights) : null;

          const getChangeForDays = (days: number) => {
            if (weightLogs.length < 2) return 'Brak danych';
            const latestLog = weightLogs[weightLogs.length - 1];
            const latestTime = new Date(latestLog.date).getTime();
            const targetTime = latestTime - days * 24 * 60 * 60 * 1000;

            let closestLog: WeightLog | null = null;
            let minDiff = Infinity;

            for (let i = 0; i < weightLogs.length - 1; i++) {
              const log = weightLogs[i];
              const logTime = new Date(log.date).getTime();
              const diff = Math.abs(logTime - targetTime);
              if (diff < minDiff) {
                minDiff = diff;
                closestLog = log;
              }
            }

            if (!closestLog) return 'Brak danych';

            const actualDiffDays = (latestTime - new Date(closestLog.date).getTime()) / (24 * 60 * 60 * 1000);
            if (days === 7 && actualDiffDays < 4) return 'Brak danych';
            if (days === 30 && actualDiffDays < 15) return 'Brak danych';

            const diff = latestLog.weight - closestLog.weight;
            const sign = diff > 0 ? '+' : '';
            return `${sign}${diff.toFixed(1)} kg`;
          };

          const change7d = getChangeForDays(7);
          const change30d = getChangeForDays(30);

          return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              <div className="card text-center" style={{ padding: '12px', gap: '4px', background: 'var(--bg-surface)' }}>
                <span className="text-muted" style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold' }}>Aktualna waga</span>
                <strong style={{ fontSize: '20px', color: 'var(--accent)' }}>
                  {latestWeight !== null ? `${latestWeight} kg` : 'Brak danych'}
                </strong>
              </div>
              <div className="card text-center" style={{ padding: '12px', gap: '4px', background: 'var(--bg-surface)' }}>
                <span className="text-muted" style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold' }}>Najniższa / Najwyższa</span>
                <strong style={{ fontSize: '15px' }}>
                  {minWeightVal !== null ? `${minWeightVal} kg` : '-'} / {maxWeightVal !== null ? `${maxWeightVal} kg` : '-'}
                </strong>
              </div>
              <div className="card text-center" style={{ padding: '12px', gap: '4px', background: 'var(--bg-surface)' }}>
                <span className="text-muted" style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold' }}>Zmiana (7 dni)</span>
                <strong style={{ fontSize: '16px', color: change7d.startsWith('-') ? 'var(--accent-success)' : change7d.startsWith('+') ? 'var(--accent-danger)' : 'var(--text-secondary)' }}>
                  {change7d}
                </strong>
              </div>
              <div className="card text-center" style={{ padding: '12px', gap: '4px', background: 'var(--bg-surface)' }}>
                <span className="text-muted" style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold' }}>Zmiana (30 dni)</span>
                <strong style={{ fontSize: '16px', color: change30d.startsWith('-') ? 'var(--accent-success)' : change30d.startsWith('+') ? 'var(--accent-danger)' : 'var(--text-secondary)' }}>
                  {change30d}
                </strong>
              </div>
            </div>
          );
        })()}

        {/* SVG Weight Chart */}
        {(() => {
          if (weightLogs.length < 2) {
            return (
              <div className="card text-center" style={{ padding: '32px 16px', background: 'var(--bg-surface)' }}>
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--text-secondary)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ margin: '0 auto 16px auto', opacity: 0.5 }}
                >
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
                <p className="text-muted">Brak wystarczającej ilości danych do wygenerowania wykresu wagi.</p>
              </div>
            );
          }

          const weights = weightLogs.map((l) => l.weight);
          let minWeight = Math.min(...weights);
          let maxWeight = Math.max(...weights);

          if (minWeight === maxWeight) {
            minWeight = Math.max(0, minWeight - 5);
            maxWeight = maxWeight + 5;
          } else {
            const range = maxWeight - minWeight;
            minWeight = Math.max(0, minWeight - range * 0.15);
            maxWeight = maxWeight + range * 0.15;
          }

          minWeight = Math.floor(minWeight);
          maxWeight = Math.ceil(maxWeight);

          const wWidth = 500;
          const wHeight = 260;
          const wPadding = { top: 30, right: 30, bottom: 50, left: 50 };
          const wChartWidth = wWidth - wPadding.left - wPadding.right;
          const wChartHeight = wHeight - wPadding.top - wPadding.bottom;

          const weightPoints = weightLogs.map((log, idx) => {
            const x = wPadding.left + (weightLogs.length > 1 ? (idx / (weightLogs.length - 1)) * wChartWidth : wChartWidth / 2);
            const y = wPadding.top + wChartHeight - ((log.weight - minWeight) / (maxWeight - minWeight)) * wChartHeight;
            const dateObj = new Date(log.date);
            const dateStr = dateObj.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' });
            const fullDateStr = dateObj.toLocaleDateString('pl-PL', {
              weekday: 'long',
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            });
            return {
              x,
              y,
              val: log.weight,
              dateStr,
              fullDateStr,
              log
            };
          });

          const wLineD = `M ${weightPoints.map((p) => `${p.x} ${p.y}`).join(' L ')}`;
          const wAreaD = `${wLineD} L ${weightPoints[weightPoints.length - 1].x} ${wPadding.top + wChartHeight} L ${weightPoints[0].x} ${wPadding.top + wChartHeight} Z`;

          const wGridCount = 4;
          const wGridLines = Array.from({ length: wGridCount }).map((_, idx) => {
            const val = minWeight + (idx / (wGridCount - 1)) * (maxWeight - minWeight);
            const y = wPadding.top + wChartHeight - (idx / (wGridCount - 1)) * wChartHeight;
            return { y, val: val.toFixed(1) };
          });

          const displayPoint = activeWeightPointIdx !== null && activeWeightPointIdx < weightPoints.length
            ? weightPoints[activeWeightPointIdx]
            : weightPoints[weightPoints.length - 1];

          return (
            <div className="flex-column gap-12" style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '12px' }}>
              {displayPoint && (
                <div
                  className="flex-row justify-between align-center"
                  style={{
                    borderLeft: '4px solid var(--accent)',
                    padding: '8px 12px',
                    background: 'var(--bg-secondary)',
                    borderRadius: '4px'
                  }}
                >
                  <div className="flex-column" style={{ gap: '4px' }}>
                    <span className="text-muted" style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }}>
                      Wpis z {displayPoint.fullDateStr}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Źródło: <strong>{displayPoint.log.source === 'workout' ? 'Trening' : 'Ręczny'}</strong>
                    </span>
                  </div>
                  <div className="text-center">
                    <span className="text-muted" style={{ fontSize: '10px', textTransform: 'uppercase' }}>
                      Waga
                    </span>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--accent)' }}>
                      {displayPoint.val} kg
                    </div>
                  </div>
                </div>
              )}

              <div style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
                <svg
                  width="100%"
                  height="100%"
                  viewBox={`0 0 ${wWidth} ${wHeight}`}
                  style={{ overflow: 'visible', display: 'block' }}
                >
                  <defs>
                    <linearGradient id="weight-chart-gradient-settings" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Gridlines */}
                  {wGridLines.map((line, idx) => (
                    <g key={idx}>
                      <line
                        x1={wPadding.left}
                        y1={line.y}
                        x2={wWidth - wPadding.right}
                        y2={line.y}
                        stroke="var(--border)"
                        strokeWidth="1"
                        strokeDasharray="4 4"
                      />
                      <text
                        x={wPadding.left - 10}
                        y={line.y + 4}
                        fill="var(--text-secondary)"
                        fontSize="11"
                        textAnchor="end"
                        fontWeight="500"
                      >
                        {line.val}
                      </text>
                    </g>
                  ))}

                  {/* Axis lines */}
                  <line
                    x1={wPadding.left}
                    y1={wPadding.top}
                    x2={wPadding.left}
                    y2={wPadding.top + wChartHeight}
                    stroke="var(--border)"
                    strokeWidth="1"
                  />
                  <line
                    x1={wPadding.left}
                    y1={wPadding.top + wChartHeight}
                    x2={wWidth - wPadding.right}
                    y2={wPadding.top + wChartHeight}
                    stroke="var(--border)"
                    strokeWidth="1"
                  />

                  {/* Chart paths */}
                  <path d={wAreaD} fill="url(#weight-chart-gradient-settings)" />
                  <path
                    d={wLineD}
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Interactive Circles */}
                  {weightPoints.map((p, idx) => {
                    const isActive =
                      activeWeightPointIdx === idx || (activeWeightPointIdx === null && idx === weightPoints.length - 1);
                    return (
                      <g key={idx}>
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r="14"
                          fill="transparent"
                          style={{ cursor: 'pointer' }}
                          onClick={() => setActiveWeightPointIdx(idx)}
                        />
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={isActive ? '6' : '4'}
                          fill={isActive ? 'var(--accent)' : 'var(--bg-primary)'}
                          stroke="var(--accent)"
                          strokeWidth="2"
                          style={{ transition: 'all 0.1s ease', cursor: 'pointer' }}
                          onClick={() => setActiveWeightPointIdx(idx)}
                        />
                        {(() => {
                          const total = weightPoints.length;
                          const shouldShow =
                            total <= 6 ||
                            idx === 0 ||
                            idx === total - 1 ||
                            (total > 6 && total <= 12 && idx % 2 === 0) ||
                            (total > 12 && idx % Math.floor(total / 4) === 0);

                          if (!shouldShow) return null;

                          return (
                            <text
                              x={p.x}
                              y={wPadding.top + wChartHeight + 20}
                              fill={isActive ? 'var(--accent)' : 'var(--text-secondary)'}
                              fontSize="10"
                              fontWeight={isActive ? '600' : 'normal'}
                              textAnchor="middle"
                            >
                              {p.dateStr}
                            </text>
                          );
                        })()}
                      </g>
                    );
                  })}
                </svg>
              </div>
              <p className="text-center text-muted" style={{ fontSize: '11px', margin: '4px 0 0 0' }}>
                Wskazówka: Dotknij punktu na wykresie, aby zobaczyć szczegóły.
              </p>
            </div>
          );
        })()}

        {/* Quick Weight Add Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const parsedWeight = parseFloat(newWeightVal);
            if (isNaN(parsedWeight) || parsedWeight <= 0) return;

            const newLog: WeightLog = {
              id: typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
                ? crypto.randomUUID()
                : 'weight-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
              date: new Date(newWeightDate + 'T12:00:00').toISOString(),
              weight: parsedWeight,
              source: 'manual',
            };

            const updated = saveWeightLog(newLog);
            setWeightLogs(updated);
            setNewWeightDate(getTodayDateStr());
          }}
          className="flex-column gap-12"
          style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '4px' }}
        >
          <h4 style={{ fontSize: '14px', margin: 0 }}>Dodaj pomiar wagi</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="new-weight-date" style={{ fontSize: '11px' }}>Data</label>
              <input
                id="new-weight-date"
                type="date"
                className="input-text"
                value={newWeightDate}
                onChange={(e) => setNewWeightDate(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="new-weight-val" style={{ fontSize: '11px' }}>Waga (kg)</label>
              <input
                id="new-weight-val"
                type="number"
                step="0.1"
                className="input-text"
                value={newWeightVal}
                onChange={(e) => setNewWeightVal(e.target.value)}
                required
              />
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-full" style={{ padding: '8px 16px' }}>
            + Dodaj wagę
          </button>
        </form>

        {/* Weight History List */}
        <div className="flex-column gap-12" style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '4px' }}>
          <h4 style={{ fontSize: '14px', margin: 0 }}>Historia pomiarów</h4>
          {weightLogs.length === 0 ? (
            <p className="text-center text-muted" style={{ padding: '8px 0', fontSize: '13px' }}>Brak pomiarów w bazie.</p>
          ) : (
            <div className="flex-column" style={{ gap: '8px', maxHeight: '250px', overflowY: 'auto', paddingRight: '4px' }}>
              {[...weightLogs].reverse().map((log) => {
                const isEditing = editingId === log.id;
                const formattedDate = new Date(log.date).toLocaleDateString('pl-PL', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                });

                let sourceText = 'Ręczny';
                if (log.source === 'workout') {
                  const matchedWorkout = history.find((w) => w.id === log.workoutId);
                  sourceText = matchedWorkout ? matchedWorkout.name : 'Trening';
                }

                const badgeStyle = {
                  fontSize: '10px',
                  fontWeight: '600' as const,
                  padding: '2px 6px',
                  borderRadius: '4px',
                  color: log.source === 'workout' ? 'var(--accent)' : 'var(--text-secondary)',
                  background: log.source === 'workout' ? 'rgba(0, 210, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                };

                return (
                  <div
                    key={log.id}
                    className="flex-row justify-between align-center"
                    style={{
                      padding: '8px 10px',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      backgroundColor: 'var(--bg-surface)',
                    }}
                  >
                    <div className="flex-column" style={{ gap: '2px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '500' }}>{formattedDate}</span>
                      <div className="flex-row" style={{ gap: '6px' }}>
                        <span style={badgeStyle}>{sourceText}</span>
                      </div>
                    </div>

                    <div className="flex-row align-center" style={{ gap: '8px' }}>
                      {isEditing ? (
                        <>
                          <input
                            type="number"
                            step="0.1"
                            className="input-text"
                            style={{ width: '70px', padding: '4px', fontSize: '12px', textAlign: 'center' }}
                            value={editingWeight}
                            onChange={(e) => setEditingWeight(e.target.value)}
                            autoFocus
                          />
                          <div className="flex-row" style={{ gap: '2px' }}>
                            <button
                              type="button"
                              className="btn btn-success btn-sm"
                              onClick={() => {
                                const parsed = parseFloat(editingWeight);
                                if (isNaN(parsed) || parsed <= 0) return;
                                const updatedLog = { ...log, weight: parsed };
                                const updated = saveWeightLog(updatedLog);
                                setWeightLogs(updated);
                                setEditingId(null);
                              }}
                              style={{ padding: '4px 6px', fontSize: '11px' }}
                            >
                              Tak
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => setEditingId(null)}
                              style={{ padding: '4px 6px', fontSize: '11px' }}
                            >
                              Nie
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--accent)' }}>
                            {log.weight} kg
                          </span>
                          <div className="flex-row" style={{ gap: '4px' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => {
                                setEditingId(log.id);
                                setEditingWeight(log.weight.toString());
                              }}
                              style={{ padding: '4px 8px', fontSize: '11px' }}
                            >
                              Edytuj
                            </button>
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              onClick={() => {
                                if (window.confirm('Czy na pewno chcesz usunąć ten wpis wagi?')) {
                                  const updated = deleteWeightLog(log.id);
                                  setWeightLogs(updated);
                                  setActiveWeightPointIdx(null);
                                }
                              }}
                              style={{ padding: '4px 8px', fontSize: '11px' }}
                            >
                              Usuń
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Backup and Restore */}
      <div className="card flex-column gap-12">
        <h3>Kopia Zapasowa (Backup)</h3>
        <p style={{ fontSize: '13px' }}>
          Wszystkie Twoje dane są przechowywane lokalnie w pamięci przeglądarki. Wyeksportuj je, aby zabezpieczyć historię swoich treningów przed wyczyszczeniem danych przeglądarki.
        </p>
        
        <div className="flex-column gap-8">
          <button className="btn btn-secondary btn-full" onClick={handleExport}>
            💾 Eksportuj dane
          </button>
          
          <button className="btn btn-secondary btn-full" onClick={handleImportClick}>
            📂 Importuj dane
          </button>
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            style={{ display: 'none' }}
          />

          {importError && (
            <div
              className="text-danger text-center"
              style={{
                fontSize: '12px',
                padding: '8px',
                background: 'rgba(255, 0, 127, 0.1)',
                borderRadius: '6px',
                border: '1px solid rgba(255, 0, 127, 0.2)',
                marginTop: '4px',
              }}
            >
              Błąd importu: {importError}
            </div>
          )}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="card flex-column gap-12" style={{ borderLeft: '4px solid var(--accent-danger)' }}>
        <h3 className="text-danger">Strefa Niebezpieczna</h3>
        <p style={{ fontSize: '13px' }}>
          Ta operacja trwale wyczyści Twoją historię treningów, zdefiniowane szablony oraz dodane ćwiczenia. Zostaną przywrócone domyślne ustawienia.
        </p>
        
        <button className="btn btn-danger btn-full" onClick={handleReset}>
          ⚠️ Resetuj dane
        </button>
      </div>

      {/* Info Panel */}
      <div className="card text-center" style={{ padding: '24px 16px', background: 'rgba(255, 255, 255, 0.01)' }}>
        <h3 style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>O aplikacji</h3>
        <p style={{ marginTop: '8px', fontSize: '13px', fontWeight: 'bold' }}>Gym Tracker PWA v1.0.0</p>
        <span className="text-success" style={{ fontSize: '12px', display: 'block', marginTop: '6px' }}>
          Gotowy do pracy offline
        </span>
      </div>
    </div>
  );
}
