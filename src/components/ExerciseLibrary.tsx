import { useState, useEffect, type FormEvent } from 'react';
import { getExercises, saveExercise } from '../services/storage';
import type { Exercise } from '../types';

const PRESETS = {
  CATEGORIES: ['Wszystkie', 'Klatka', 'Plecy', 'Nogi', 'Ramiona', 'Brzuch', 'Inne'],
  ADD_CATEGORIES: ['Klatka', 'Plecy', 'Nogi', 'Ramiona', 'Brzuch', 'Inne'],
};

export function ExerciseLibrary() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Wszystkie');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state for new exercise
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('Klatka');
  const [newNotes, setNewNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setExercises(getExercises());
  }, []);

  const handleAddExercise = (e: FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setError('Nazwa ćwiczenia jest wymagana.');
      return;
    }

    const newEx: Exercise = {
      id: 'custom-' + Date.now(),
      name: newName.trim(),
      category: newCategory,
      notes: newNotes.trim() ? newNotes.trim() : undefined,
    };

    const updated = saveExercise(newEx);
    setExercises(updated);
    
    // Reset form
    setNewName('');
    setNewCategory('Klatka');
    setNewNotes('');
    setError('');
    setIsModalOpen(false);
  };

  const filteredExercises = exercises.filter((ex) => {
    const matchesSearch = ex.name.toLowerCase().includes(search.toLowerCase());
    
    let matchesCategory = false;
    if (selectedCategory === 'Wszystkie') {
      matchesCategory = true;
    } else {
      const catLower = ex.category.toLowerCase();
      const filterLower = selectedCategory.toLowerCase();
      
      // Smart check: e.g. "klatka" in "klatka piersiowa" or exact match
      matchesCategory = catLower.includes(filterLower) || 
                        (filterLower === 'klatka' && catLower.includes('piersiowa')) ||
                        (filterLower === 'inne' && 
                          !['klatka', 'plecy', 'nogi', 'ramiona', 'brzuch'].some(c => catLower.includes(c))
                        );
    }

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex-column gap-12">
      <div className="flex-row justify-between align-center">
        <h2>Atlas ćwiczeń</h2>
        <button className="btn btn-primary btn-sm" onClick={() => setIsModalOpen(true)}>
          + Dodaj ćwiczenie
        </button>
      </div>
      
      <p className="text-muted">Przeglądaj bibliotekę ćwiczeń lub dodaj własne customowe ruchy.</p>

      {/* Search Bar */}
      <div className="form-group">
        <input 
          type="text" 
          className="input-text" 
          placeholder="Szukaj ćwiczenia..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Category Chips */}
      <div className="category-scroll-container">
        {PRESETS.CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`chip-btn ${selectedCategory === cat ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Exercise List */}
      <div className="flex-column gap-12" style={{ marginTop: '8px' }}>
        {filteredExercises.length === 0 ? (
          <div className="card text-center" style={{ padding: '24px 16px' }}>
            <p className="text-muted">Nie znaleziono ćwiczeń spełniających kryteria.</p>
          </div>
        ) : (
          filteredExercises.map((ex) => (
            <div key={ex.id} className="card">
              <div className="card-header">
                <h3 style={{ fontSize: '16px', fontWeight: '600' }}>{ex.name}</h3>
                <span className="category-badge">
                  {ex.category}
                </span>
              </div>
              {ex.notes && (
                <p style={{ fontSize: '13px', marginTop: '4px', color: 'var(--text-secondary)' }}>
                  {ex.notes}
                </p>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modern Overlay Modal */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content card">
            <div className="card-header">
              <h3>Nowe ćwiczenie</h3>
              <button 
                className="btn-close" 
                onClick={() => {
                  setIsModalOpen(false);
                  setError('');
                }}
                aria-label="Zamknij"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAddExercise} className="flex-column gap-12">
              {error && <div className="text-danger" style={{ fontSize: '13px' }}>{error}</div>}
              
              <div className="form-group">
                <label className="form-label">Nazwa ćwiczenia</label>
                <input
                  type="text"
                  className="input-text"
                  placeholder="np. Wyciskanie na ławce poziomej"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">Kategoria</label>
                <select
                  className="input-text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  style={{ appearance: 'none', backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23ffffff\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'><polyline points=\'6 9 12 15 18 9\'></polyline></svg>")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '16px' }}
                >
                  {PRESETS.ADD_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat} style={{ backgroundColor: 'var(--bg-surface)' }}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Notatki (opcjonalnie)</label>
                <textarea
                  className="input-text"
                  placeholder="np. Chwyt na szerokość barków, kontrolować opuszczanie"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  rows={3}
                  style={{ resize: 'none', fontFamily: 'inherit' }}
                />
              </div>

              <div className="flex-row justify-between" style={{ marginTop: '8px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setIsModalOpen(false);
                    setError('');
                  }}
                  style={{ flex: 1 }}
                >
                  Anuluj
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                >
                  Zapisz
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
