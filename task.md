# Lista Zadań - Gym Tracker PWA

Poniższa lista zadań została przygotowana na podstawie [implementation_plan.md](file:///c:/source/gymTracker/implementation_plan.md). Każde zadanie zawiera cel oraz jasny warunek ukończenia (Definition of Done).

## Krok 1: Konfiguracja i PWA

- [x] **1.1. Inicjalizacja projektu React + Vite + TS**
  - **Cel:** Stworzenie podstawowej struktury aplikacji React z TypeScript i konfiguracją Vite.
  - **Warunek ukończenia:** Poprawne uruchomienie czystego szablonu deweloperskiego za pomocą `npm run dev`. Brak błędów kompilacji TS i lintera.
- [x] **1.2. Konfiguracja Manifestu PWA i ikony**
  - **Cel:** Stworzenie pliku manifestu aplikacji mobilnej, aby można ją było zainstalować na Androidzie.
  - **Warunek ukończenia:** Plik [manifest.json](file:///c:/source/gymTracker/public/manifest.json) jest dostępny pod ścieżką `/manifest.json`, zawiera poprawne dane aplikacji (nazwa, kolory, ikony, standalone). Narzędzia deweloperskie Chrome (DevTools -> Application -> Manifest) poprawnie go rozpoznają.
- [x] **1.3. Rejestracja Service Workera**
  - **Cel:** Stworzenie prostego Service Workera obsługującego cache'owanie plików statycznych w celu działania offline.
  - **Warunek ukończenia:** Plik [sw.js](file:///c:/source/gymTracker/public/sw.js) cache'uje niezbędne zasoby, a plik [registerServiceWorker.ts](file:///c:/source/gymTracker/src/registerServiceWorker.ts) rejestruje go podczas startu aplikacji. DevTools wykazuje status "Active and running" dla Service Workera.

## Krok 2: Typy danych i Warstwa Przechowywania (Storage)

- [x] **2.1. Definicja modeli i typów TypeScript**
  - **Cel:** Zdefiniowanie struktur danych dla ćwiczeń, szablonów, serii treningowych oraz historii treningów.
  - **Warunek ukończenia:** Plik [types.ts](file:///c:/source/gymTracker/src/types.ts) definiuje interfejsy: `Exercise`, `WorkoutSet`, `WorkoutExercise`, `WorkoutTemplate` oraz `LoggedWorkout`. Kod kompiluje się bez błędów typu.
- [x] **2.2. Implementacja serwisu Storage (`localStorage`)**
  - **Cel:** Stworzenie funkcji do odczytu i zapisu ćwiczeń, szablonów i historii treningów w `localStorage`, wraz z domyślną listą ćwiczeń (Pompki, Podciąganie nachwytem, Podciąganie podchwytem, Przysiady, Swing kettlem).
  - **Warunek ukończenia:** Plik [storage.ts](file:///c:/source/gymTracker/src/services/storage.ts) eksportuje funkcje: `getExercises`, `saveExercise`, `getTemplates`, `saveTemplate`, `getHistory`, `saveWorkout`, `exportData`, `importData`. Testy jednostkowe lub ręczne potwierdzają poprawność zapisu/odczytu.

## Krok 3: Stylizacja i System Projektowy (Design System)

- [x] **3.1. Konfiguracja stylów CSS (Modern Minimalist Dark Theme)**
  - **Cel:** Przygotowanie globalnego arkusza stylów CSS definiującego kolory, typografię, reset oraz zmienne CSS dla ciemnego motywu.
  - **Warunek ukończenia:** Plik [index.css](file:///c:/source/gymTracker/src/index.css) zawiera zmienne CSS (`--bg-primary`, `--bg-secondary`, `--text-primary`, `--accent-color`, itp.), minimalistyczny font (Inter/systemowy) oraz podstawowe reguły layoutu (np. pełny ekran mobilny bez przewijania poziomego).

## Krok 4: Nawigacja i Główny Układ Aplikacji

- [x] **4.1. Implementacja komponentu Navigation i Layout**
  - **Cel:** Stworzenie dolnego/bocznego paska nawigacji do przełączania się między widokami.
  - **Warunek ukończenia:** Komponent [Navigation.tsx](file:///c:/source/gymTracker/src/components/Navigation.tsx) poprawnie zmienia stan aktywnej zakładki w głównym komponencie [App.tsx](file:///c:/source/gymTracker/src/App.tsx). Pasek nawigacji jest responsywny i czytelny na telefonie komórkowym.

## Krok 5: Harmonogram i Szablony Treningowe

- [x] **5.1. Zarządzanie biblioteką ćwiczeń (Exercise Library)**
  - **Cel:** Stworzenie widoku pozwalającego na wyszukiwanie, przeglądanie i dodawanie nowych ćwiczeń.
  - **Warunek ukończenia:** Komponent [ExerciseLibrary.tsx](file:///c:/source/gymTracker/src/components/ExerciseLibrary.tsx) pozwala na:
    - Wyświetlenie domyślnych ćwiczeń.
    - Dodanie nowego ćwiczenia (np. "Wyciskanie na klatkę").
    - Filtrowanie listy po wpisaniu nazwy.
- [x] **5.2. Zarządzanie szablonami treningów (Workout Templates)**
  - **Cel:** Stworzenie widoku do tworzenia, edycji i usuwania planów treningowych (np. PUSH/PULL/LEGS) z określonymi dniami tygodnia.
  - **Warunek ukończenia:** Komponent [WorkoutTemplates.tsx](file:///c:/source/gymTracker/src/components/WorkoutTemplates.tsx) pozwala na stworzenie szablonu, dodanie do niego ćwiczeń z biblioteki, określenie liczby serii/powtórzeń, przypisanie dni treningowych (np. Poniedziałek, Środa) oraz zapisanie go w lokalnej bazie.
- [x] **5.3. Widok Harmonogramu (Workout Schedule)**
  - **Cel:** Wyświetlanie aktualnego dnia i tygodnia oraz planowanego na dziś treningu.
  - **Warunek ukończenia:** Komponent [WorkoutSchedule.tsx](file:///c:/source/gymTracker/src/components/WorkoutSchedule.tsx) poprawnie odczytuje dzisiejszy dzień tygodnia, dopasowuje przypisany szablon i wyświetla przycisk "Rozpocznij trening" dla dzisiejszego szablonu lub dowolnego innego.

## Krok 6: Aktywny Trening i Minutnik

- [ ] **6.1. Widok aktywnego treningu (Workout Active)**
  - **Cel:** Ekran śledzenia treningu w czasie rzeczywistym z odznaczaniem serii, zmianą powtórzeń/ciężaru i dodawaniem ćwiczeń.
  - **Warunek ukończenia:** Komponent [WorkoutActive.tsx](file:///c:/source/gymTracker/src/components/WorkoutActive.tsx) pozwala na:
    - Wyświetlenie ćwiczeń z szablonu.
    - Odznaczanie serii jako ukończone (checkbox zmienia stan).
    - Zmianę liczby powtórzeń i ciężaru w locie.
    - Dodanie nowego ćwiczenia "ad-hoc" w trakcie trwania sesji.
    - Zakończenie treningu (zapisuje dane z aktualnym czasem i przenosi do historii).
- [ ] **6.2. Komponent Minutnika Odpoczynku (Rest Timer)**
  - **Cel:** Odliczanie czasu odpoczynku między seriami z sygnałem dźwiękowym/wibracją.
  - **Warunek ukończenia:** Komponent [RestTimer.tsx](file:///c:/source/gymTracker/src/components/RestTimer.tsx) uruchamia się automatycznie po zaznaczeniu serii lub ręcznie, odlicza czas w dół, posiada przyciski pauzy/pomięcia/dodania czasu, oraz odtwarza krótki dźwięk po zakończeniu odliczania.

## Krok 7: Historia, Statystyki i Ustawienia

- [ ] **7.1. Widok Historii Treningów (Workout History)**
  - **Cel:** Przeglądanie i usuwanie archiwalnych treningów.
  - **Warunek ukończenia:** Komponent [WorkoutHistory.tsx](file:///c:/source/gymTracker/src/components/WorkoutHistory.tsx) wyświetla listę zakończonych treningów w kolejności chronologicznej wstecz, pokazuje szczegóły wykonanych serii i pozwala na usunięcie wpisu.
- [ ] **7.2. Statystyki i Wykresy Progresu (Workout Stats)**
  - **Cel:** Wizualizacja progresu siłowego/objętościowego dla wybranego ćwiczenia.
  - **Warunek ukończenia:** Komponent [WorkoutStats.tsx](file:///c:/source/gymTracker/src/components/WorkoutStats.tsx) rysuje minimalistyczny wykres (np. za pomocą czystego SVG lub prostej biblioteki) przedstawiający maksymalny ciężar lub szacowany 1RM w czasie dla wybranego ćwiczenia z historii.
- [ ] **7.3. Widok Ustawień (Settings) i Backup**
  - **Cel:** Zarządzanie kopią zapasową danych oraz instalacją PWA.
  - **Warunek ukończenia:** Komponent [Settings.tsx](file:///c:/source/gymTracker/src/components/Settings.tsx) poprawnie pobiera plik JSON z całą bazą danych (Export) oraz pozwala wgrać plik JSON, nadpisując/scalając dane (Import). Dostępna jest również opcja resetu danych z potwierdzeniem `confirm`.

## Krok 8: Integracja i Walidacja Końcowa

- [ ] **8.1. Integracja w App.tsx i walidacja PWA**
  - **Cel:** Połączenie wszystkich widoków w jedną spójną aplikację oraz testowanie zachowania offline.
  - **Warunek ukończenia:** Cała aplikacja działa poprawnie, przejścia między widokami są płynne. Narzędzie Lighthouse w przeglądarce potwierdza zgodność z wymaganiami PWA (aplikacja jest instalowalna i działa offline).
