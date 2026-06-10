# Walkthrough - Gym Tracker PWA

Kompletna progresywna aplikacja internetowa (PWA) do śledzenia treningów siłowych zbudowana przy użyciu **React + Vite + TypeScript + Vanilla CSS**, zaprojektowana w nowoczesnym, ciemnym motywie minimalistycznym premium. Aplikacja działa w 100% w przeglądarce, przechowuje dane w `localStorage`, działa w pełni offline dzięki Service Workerowi i jest możliwa do zainstalowania na urządzeniach mobilnych oraz desktopowych.

---

## Technical Stack & Architecture

- **Frontend Core**: React 18, Vite 8, TypeScript.
- **Styling**: Vanilla CSS (`src/index.css`) wykorzystujący zmienne CSS do tworzenia motywu ciemnego, płynnych przejść i animacji mikrointerakcji.
- **PWA Capabilities**: Standalone manifest (`public/manifest.json`), Service Worker (`public/sw.js`) z cache stale-while-revalidate oraz w pełni offline'owy licznik odpoczynku generujący dźwięki za pomocą **Web Audio API** (bez pobierania zewnętrznych plików audio).
- **Database/Storage**: `src/services/storage.ts` zarządzający lokalnym stanem w `localStorage`, importem/eksportem kopii zapasowych JSON oraz ujednoliconą bazą ćwiczeń.

---

## Key Features Implemented (Advanced Module & Stats Refactoring)

Wprowadziliśmy znaczące uproszczenie logiki ćwiczeń oraz przeprowadziliśmy pełną rewolucję w module statystyk i analizy wagi ciała użytkownika:

### 1. Uproszczenie Ćwiczeń (Usunięcie flagi własnej masy ciała)
- **Usunięcie podziału**: Całkowicie wyeliminowaliśmy flagę `isBodyweight` z definicji ćwiczeń. Wszystkie ćwiczenia są teraz traktowane w ten sam zunifikowany sposób. Użytkownik loguje bezpośrednio ciężar wpisany na treningu.
- **Aktualizacja Atlasu**: W komponencie [ExerciseLibrary.tsx](file:///c:/source/gymTracker/src/components/ExerciseLibrary.tsx) usunięto checkbox „Ćwiczenie z ciężarem własnego ciała”, stan `newIsBodyweight` oraz ikonkę `👤` na liście ćwiczeń.
- **Domyślna baza**: Wyczyszczono właściwość `isBodyweight` w domyślnie predefiniowanych ćwiczeniach w [storage.ts](file:///c:/source/gymTracker/src/services/storage.ts).

### 2. Zintegrowane Wykresy i Statystyki z Korelacją Wagi Ciała
Zastąpiliśmy stary system statystyk i korelacji (złożony z 3 osobnych zakładek) jednym prostym i eleganckim widokiem w [WorkoutStats.tsx](file:///c:/source/gymTracker/src/components/WorkoutStats.tsx):
- **Brak zakładek**: Użytkownik wybiera z dropdownu dowolne ćwiczenie z biblioteki i od razu ma dostęp do pełnych statystyk.
- **Dwa połączone widoki wykresów**:
  1. **Maks. Ciężar + Maks. Powtórzenia**: Dwuosiowy wykres pokazujący na jednym polu maksymalny podniesiony ciężar (lewa oś Y) oraz maksymalną liczbę powtórzeń w serii (prawy trend, znormalizowany), z nałożoną linią wagi ciała użytkownika (prawa oś Y) w celu natychmiastowej oceny korelacji.
  2. **Suma Powtórzeń + Objętość**: Wykres pokazujący trend objętości treningowej (lewa oś Y) oraz sumy powtórzeń (prawy trend, znormalizowany), z nałożoną linią wagi ciała użytkownika (prawa oś Y).
- **Zintegrowany panel szczegółów**: Kliknięcie dowolnego punktu na wykresie wyświetla kompletne informacje z danej sesji treningowej (Data, waga ciała w tej sesji oraz odpowiednie dwie metryki ćwiczenia).
- **Rekordy i Osiągnięcia**: Zunifikowane podsumowanie osiągnięć pod wykresem wyświetlające: Całkowitą liczbę sesji, Rekordowy ciężar (Max), Najlepszy szacowany 1RM (wzór Epleya), Maks. powtórzenia w serii oraz Sumę wszystkich powtórzeń.
- **Dynamiczny Trener Korelacji**: Pod wykresem wyświetla się automatycznie generowana analiza trendu w języku polskim, porównująca zmiany wagi ciała ze zmianami siły/objętości pomiędzy pierwszym a ostatnim treningiem.

### 3. Moduł Zarządzania Wagą Ciała Przeniesiony do Ustawień
Aby odciążyć widok statystyk, całe zarządzanie historią wagi ciała zostało przeniesione do [Settings.tsx](file:///c:/source/gymTracker/src/components/Settings.tsx):
- **Wykres Trendu Wagi**: Czysty chronologiczny wykres SVG prezentujący wagę użytkownika na przestrzeni czasu z interaktywnymi punktami.
- **Statystyki Zmian**: Karty pokazujące aktualną wagę, najniższą/najwyższą oraz wyliczone różnice wagi z ostatnich **7 dni** oraz **30 dni**.
- **Logowanie Wagi**: Szybki formularz do ręcznego dodawania pomiarów wagi na wybraną datę.
- **Lista Historyczna**: Pełna lista pomiarów wagi ciała (posortowana malejąco) ze wskaźnikami źródła (wpis ręczny / wpis z treningu) oraz możliwością **usuwania** i **szybkiej edycji inline**.

---

## File Directory Structure

- [src/types.ts](file:///c:/source/gymTracker/src/types.ts): Definicje typów danych, w tym opcjonalne pole `isBodyweight` w `Exercise`.
- [src/services/storage.ts](file:///c:/source/gymTracker/src/services/storage.ts): Logika zapisu w `localStorage`, import/eksport danych, resetowanie bazy oraz zaktualizowana domyślna lista ćwiczeń.
- [src/components/ExerciseLibrary.tsx](file:///c:/source/gymTracker/src/components/ExerciseLibrary.tsx): Atlas ćwiczeń pozbawiony checkboxa oraz wskaźników masy ciała.
- [src/components/Settings.tsx](file:///c:/source/gymTracker/src/components/Settings.tsx): Ustawienia aplikacji rozszerzone o kompletny moduł wagi ciała (wykres, podsumowania, formularz, edytowalna lista).
- [src/components/WorkoutStats.tsx](file:///c:/source/gymTracker/src/components/WorkoutStats.tsx): Nowy uproszczony i zintegrowany widok dwuosiowych statystyk i korelacji.

---

## Verification Results

1. **Kompakcja i Typowanie**: Projekt buduje się w 100% poprawnie poleceniem `npm run build`. Kompilator TypeScript nie zgłasza żadnych błędów ani ostrzeżeń.
2. **Import i Eksport**: Przetestowano integralność eksportu i importu danych JSON (zarówno z nowymi danymi wagi, jak i starszymi kopiami zapasowymi).
3. **Funkcjonalność Wykresów**: Sprawdzono, czy wykresy SVG renderują się prawidłowo zarówno przy 1 sesji treningowej (wyświetlanie punktu centralnego), jak i przy wielu sesjach (renderowanie linii i obszarów).

---

## How to Run the App

1. Zainstaluj zależności:
   ```bash
   npm install
   ```
2. Uruchom serwer deweloperski Vite:
   ```bash
   npm run dev
   ```
3. Zbuduj wersję produkcyjną i uruchom lokalny podgląd (do testów PWA):
   ```bash
   npm run build
   npm run preview
   ```
