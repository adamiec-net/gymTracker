import { useState, useEffect } from 'react';

interface RestTimerProps {
  duration?: number; // duration in seconds
  onClose: () => void;
}

const playBeep = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const audioCtx = new AudioContextClass();
    
    const beep = (time: number, freq: number, duration: number) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.2, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration - 0.05);
      osc.start(time);
      osc.stop(time + duration);
    };

    const now = audioCtx.currentTime;
    beep(now, 880, 0.15);
    beep(now + 0.25, 880, 0.25);
  } catch (err) {
    console.error('Failed to play audio beep:', err);
  }
};

export function RestTimer({ duration = 90, onClose }: RestTimerProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(duration);
  const [totalSeconds, setTotalSeconds] = useState(duration);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isActive && secondsRemaining > 0) {
      interval = setInterval(() => {
        setSecondsRemaining((prev) => prev - 1);
      }, 1000);
    } else if (secondsRemaining === 0) {
      playBeep();
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }
      // Set isActive asynchronously to avoid eslint react-hooks/set-state-in-effect
      setTimeout(() => {
        setIsActive(false);
      }, 0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, secondsRemaining]);

  const handleToggleActive = () => {
    setIsActive((prev) => !prev);
  };

  const handleAdjustTime = (amount: number) => {
    setSecondsRemaining((prev) => {
      const newSecs = Math.max(0, prev + amount);
      setTotalSeconds((t) => {
        if (amount > 0) {
          return Math.max(t, newSecs);
        }
        return t;
      });
      return newSecs;
    });
    if (amount > 0 && secondsRemaining === 0) {
      setIsActive(true);
    }
  };

  const formatTime = (secs: number) => {
    const minutes = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${minutes}:${remaining.toString().padStart(2, '0')}`;
  };

  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = totalSeconds > 0 
    ? circumference - (secondsRemaining / totalSeconds) * circumference 
    : circumference;

  return (
    <div className="modal-backdrop">
      <div className="modal-content text-center">
        <div className="flex-row justify-between align-center" style={{ marginBottom: '12px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Odpoczynek</h3>
          <button className="btn-close" onClick={onClose} aria-label="Zamknij">
            &times;
          </button>
        </div>

        <div className="timer-container">
          <div className="timer-circle-wrap">
            <svg className="timer-svg" viewBox="0 0 160 160">
              <circle className="timer-circle-bg" cx="80" cy="80" r="70" />
              <circle
                className="timer-circle-progress"
                cx="80"
                cy="80"
                r="70"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
              />
            </svg>
            <div className="timer-text">
              {secondsRemaining > 0 ? formatTime(secondsRemaining) : 'Gotowe!'}
            </div>
          </div>

          <div className="flex-row gap-12" style={{ width: '100%', marginTop: '8px' }}>
            {secondsRemaining > 0 ? (
              <button 
                type="button" 
                className={`btn btn-secondary ${isActive ? '' : 'btn-primary'}`} 
                onClick={handleToggleActive}
                style={{ flex: 1 }}
              >
                {isActive ? 'Pauza' : 'Wznów'}
              </button>
            ) : (
              <button 
                type="button" 
                className="btn btn-success" 
                onClick={onClose}
                style={{ flex: 1 }}
              >
                Gotowe
              </button>
            )}

            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => handleAdjustTime(-15)}
              style={{ flex: 1 }}
              disabled={secondsRemaining <= 0}
            >
              -15s
            </button>

            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => handleAdjustTime(15)}
              style={{ flex: 1 }}
            >
              +15s
            </button>

            <button 
              type="button" 
              className="btn btn-danger" 
              onClick={onClose}
              style={{ flex: 1 }}
            >
              Pomiń
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
