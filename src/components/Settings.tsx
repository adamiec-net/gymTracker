import { useState, useEffect, useRef } from 'react';
import { exportData, importData, resetAllData, getSettings, saveSettings } from '../services/storage';
import type { BeforeInstallPromptEvent, AppSettings } from '../types';

export function Settings() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    window.deferredPrompt || null
  );
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [settings, setSettings] = useState<AppSettings>(() => getSettings());

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
            Waga użytkownika (kg):
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
