# Zaawansowane Statystyki i Panel Treningowy (Dashboard)

Wprowadzenie dedykowanego śledzenia wagi, korelacji wagi z siłą/wydolnością w ćwiczeniach kalistenicznych oraz możliwości pełnej edycji historycznych treningów i wagi ciała.

## Informacje i Podsumowanie ustaleń z wywiadu
- **Rozdzielenie wagi od ćwiczeń kalistenicznych**: Ćwiczenia z masą ciała nie będą automatycznie dodawać wagi użytkownika do obciążeń. Zamiast tego będą śledzone za pomocą dedykowanych metryk: Maksymalne powtórzenia, Suma powtórzeń, Maksymalny dodatkowy ciężar oraz Objętość dodatkowego ciężaru.
- **Dedykowany moduł wagi**: Dodanie osobnej zakładki dla wagi ciała z wykresem trendu, listą wpisów historycznych (z możliwością dodawania, edycji i usuwania) oraz statystykami.
- **Pełna synchronizacja wagi**: Waga wpisana podczas rozpoczęcia treningu będzie synchronizowana z historią wagi na dany dzień. Edycje wagi w treningu lub w panelu wagi będą się automatycznie propagować.
- **Korelacja postępów**: Dedykowany wykres korelacyjny porównujący wagę użytkownika (np. na osi lewej) ze wskaźnikami wydolności w wybranym ćwiczeniu kalistenicznym (np. maks. powtórzenia podciągania na osi prawej).
- **Edycja historii treningów**: Każdy trening w zakładce historia otrzyma przycisk "Edytuj", otwierający modal pozwalający na modyfikację nazwy, daty, wagi oraz serii (dodawanie/usuwanie, powtórzenia, ciężar, status wykonania).

## Proponowane Zmiany

---

### Typy i Model Danych

#### [MODIFY] [types.ts](file:///c:/source/gymTracker/src/types.ts)
- Dodanie typu `WeightLog` przechowującego wpisy o wadze:
  ```typescript
  export interface WeightLog {
    id: string;
    date: string; // ISO String (data wpisu)
    weight: number;
    source: 'manual' | 'workout';
    workoutId?: string; // ID treningu, jeśli waga pochodzi z treningu
  }
  ```
- Zaktualizowanie `BackupData` w celu wsparcia importu i eksportu historii wagi:
  ```typescript
  export interface BackupData {
    exercises: Exercise[];
    templates: WorkoutTemplate[];
    history: LoggedWorkout[];
    weightHistory?: WeightLog[]; // Opcjonalne pole dla kompatybilności wstecznej
  }
  ```

---

### Logika Aplikacji i Storage

#### [MODIFY] [storage.ts](file:///c:/source/gymTracker/src/services/storage.ts)
- Dodanie klucza `STORAGE_KEYS.WEIGHT_HISTORY = 'gym_tracker_weight_history'`.
- Implementacja metod pomocniczych:
  - `getWeightHistory()`: Pobieranie posortowanej chronologicznie historii wagi.
  - `saveWeightLog(log: WeightLog)`: Zapis/aktualizacja wpisu wagi.
  - `deleteWeightLog(id: string)`: Usunięcie wpisu wagi.
  - `syncWeightFromWorkout(workout: LoggedWorkout)`: Automatyczne tworzenie/aktualizacja wpisu wagi skojarzonego z treningiem.
- Modyfikacja `saveWorkout()` i `deleteWorkout()` w celu wywoływania automatycznej synchronizacji wagi.
- Zaktualizowanie funkcji `importData()` oraz `exportData()` o klucz `weightHistory`, dbając o zachowanie kompatibiności wstecznej.
- Dodanie czyszczenia wagi do `resetAllData()`.

---

### Komponenty Interfejsu

#### [MODIFY] [WorkoutStats.tsx](file:///c:/source/gymTracker/src/components/WorkoutStats.tsx)
Przebudowanie widoku statystyk na interfejs z 3 zakładkami:
1. **Ćwiczenia**:
   - Wybór ćwiczenia z dropdownu.
   - Dla standardowych ćwiczeń metryki: Szacowany 1RM, Maksymalny Ciężar, Suma Objętości (ciężar × powtórzenia), Maksymalne Powtórzenia.
   - Dla ćwiczeń kalistenicznych (`isBodyweight: true`): Maksymalne Powtórzenia w serii, Suma Powtórzeń, Maksymalny Dodatkowy Ciężar, Objętość (tylko dodatkowy ciężar).
   - Wykres SVG dostosowany do wybranej metryki.
2. **Waga Ciała**:
   - Wykres SVG przedstawiający wagę użytkownika na przestrzeni czasu.
   - Szybkie podsumowanie: Aktualna waga, najniższa/najwyższa waga, zmiana w 7 i 30 dniach.
   - Formularz szybkiego dodawania wagi dla wybranego dnia.
   - Lista historycznych wpisów wagi z przyciskami Edycji (inline lub modal) oraz Usuwania.
3. **Korelacja**:
   - Analiza wpływu wagi ciała na wydolność w ćwiczeniach kalistenicznych.
   - Wykres dwuosiowy (Dual-axis / Dwa wykresy na jednym polu) pokazujący np. wagę ciała (linia przerywana) oraz maks. powtórzenia podciągania (linia ciągła).
   - Motywacyjny opis wskazujący, jak zmiana wagi ułatwia/utrudnia wykonywanie ćwiczeń kalistenicznych.

#### [MODIFY] [WorkoutHistory.tsx](file:///c:/source/gymTracker/src/components/WorkoutHistory.tsx)
- Dodanie przycisku „Edytuj” przy każdym wpisie treningu w historii.
- Implementacja modala do edycji treningu (`EditWorkoutModal`), który pozwala na:
  - Zmianę nazwy treningu.
  - Zmianę daty wykonania (input daty i godziny).
  - Zmianę zalogowanej wagi ciała użytkownika.
  - Pełną modyfikację listy ćwiczeń i serii (edycja liczby powtórzeń, ciężaru, dodawanie nowych serii, usuwanie istniejących serii, przełączanie checkboxa ukończenia).
  - Zapisanie zmian: aktualizuje `LoggedWorkout` w historii, aktualizuje zsynchronizowany wpis wagi w historii wagi, odświeża widok.

## Plan Weryfikacji

### Weryfikacja Ręczna
1. **Uruchomienie serwera deweloperskiego**: `npm run dev` i sprawdzenie poprawności kompilacji kodu.
2. **Testy synchronizacji wagi**:
   - Rozpoczęcie i zakończenie treningu z podaną wagą (np. 82 kg). Sprawdzenie, czy w zakładce "Waga Ciała" pojawił się wpis z tą wagą i datą treningu.
   - Dodanie wagi ręcznie w zakładce "Waga Ciała" (np. 81.5 kg) na dzisiaj. Sprawdzenie, czy wykres wagi i lista historii wagi zaktualizowały się poprawnie.
   - Usunięcie/edycja wpisu wagi z listy i sprawdzenie, czy wykres się odświeżył.
3. **Testy edycji treningów historycznych**:
   - Kliknięcie przycisku "Edytuj" na starym treningu.
   - Zmiana wagi ciała w treningu z 82 na 80 kg. Zapisanie. Zweryfikowanie, czy waga zmieniła się zarówno w treningu, jak i w ogólnej historii wagi na ten dzień.
   - Dodanie serii, zmiana powtórzeń w ćwiczeniu podciągania, zapisanie i sprawdzenie poprawności wyświetlania w historii.
4. **Testy wykresów**:
   - Wybranie podciągania i sprawdzenie, czy w zakładce "Ćwiczenia" waga ciała użytkownika nie jest doliczana do ciężaru (np. jeśli podciągamy się bez ciężaru, powinno pokazywać 0 kg dodatkowego ciężaru, a postęp ma być widoczny w powtórzeniach).
   - Sprawdzenie poprawności działania nowo dodanych metryk (Suma powtórzeń, Maks. powtórzenia).
   - Zweryfikowanie wykresu korelacji w trzeciej zakładce.
