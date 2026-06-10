# Lista Zadań - Zaawansowane Statystyki i Edycja Historyczna

- [x] **Zadanie 1: Aktualizacja modeli danych (`types.ts`)**
  - **Cel**: Dodać interfejs `WeightLog` oraz zaktualizować `BackupData` w celu wsparcia nowej struktury danych.
  - **Warunek ukończenia**: Kompilacja kodu w `src/types.ts` przechodzi bez błędów, a typy są poprawnie eksportowane.

- [x] **Zadanie 2: Implementacja logiki przechowywania danych wagi (`storage.ts`)**
  - **Cel**: Dodać klucz storage i funkcje pobierania, zapisywania, usuwania wagi oraz automatycznej synchronizacji wagi z treningami w `src/services/storage.ts`. Zaktualizować import/eksport danych.
  - **Warunek ukończenia**: Metody `getWeightHistory`, `saveWeightLog`, `deleteWeightLog` oraz `syncWeightFromWorkout` działają poprawnie, a eksport/import obsługuje historię wagi.

- [x] **Zadanie 3: Implementacja modala edycji historycznych treningów (`WorkoutHistory.tsx`)**
  - **Cel**: Dodać przycisk „Edytuj” do kart historii oraz stworzyć modal `EditWorkoutModal` pozwalający na pełną modyfikację treningu (nazwa, data, waga, ćwiczenia, serie) z automatyczną synchronizacją wagi.
  - **Warunek ukończenia**: Możliwość edycji dowolnego historycznego treningu w UI, zapisanie zmian aktualizuje listę treningów i bazę wagi.

- [x] **Zadanie 4: Statystyki Ćwiczeń z rozróżnieniem kalisteniki (`WorkoutStats.tsx` - Zakładka 1)**
  - **Cel**: Stworzyć zakładkę "Ćwiczenia". Dla ćwiczeń kalistenicznych wykluczyć wagę użytkownika z obciążeń i dodać metryki: Maks. powtórzenia, Suma powtórzeń, Maks. dodatkowy ciężar, Objętość dodatkowa. Dla pozostałych ćwiczeń wyświetlić: 1RM, Maks. ciężar, Objętość, Maks. powtórzenia.
  - **Warunek ukończenia**: Wykres SVG poprawnie reaguje na wybrane ćwiczenie kalisteniczne i standardowe oraz wybrane metryki.

- [x] **Zadanie 5: Dedykowane śledzenie wagi ciała (`WorkoutStats.tsx` - Zakładka 2)**
  - **Cel**: Stworzyć zakładkę "Waga Ciała" zawierającą wykres wagi w czasie, podsumowanie zmian (7 dni, 30 dni, min, max), szybkie dodawanie wagi oraz lista wpisów z możliwością edycji i usuwania.
  - **Warunek ukończenia**: Wykres wagi ciała rysuje się prawidłowo, dodawanie i usuwanie wpisów wagi odświeża wykres i listę w czasie rzeczywistym.

- `[ ]` **Zadanie 6: Wykres korelacji wagi z wynikami (`WorkoutStats.tsx` - Zakładka 3)**
  - **Cel**: Stworzyć zakładkę "Korelacja" z dwuosiowym wykresem SVG nakładającym zmiany wagi ciała na wyniki w wybranym ćwiczeniu kalistenicznym oraz dodać opis motywacyjny.
  - **Warunek ukończenia**: Wykres poprawnie wyświetla dwie linie (waga vs powtórzenia/ciężar dodatkowy) dla wybranego ćwiczenia kalistenicznego.

- `[ ]` **Zadanie 7: Weryfikacja końcowa i testy**
  - **Cel**: Sprawdzić działanie całej aplikacji w przeglądarce pod kątem błędów konsoli, poprawności RWD, działania offline/PWA oraz spójności importu/eksportu.
  - **Warunek ukończenia**: Brak błędów w konsoli, aplikacja buduje się produkcyjnie (`npm run build`), wszystkie przepływy synchronizacji działają bez zarzutu.
