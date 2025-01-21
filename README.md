# AutoPay für Lexoffice

Ein Tampermonkey-Skript, das den Workflow in Lexoffice optimiert, indem es Rechnungen mit nur einem Klick automatisch als bezahlt markiert.

## Beschreibung

Das Skript automatisiert den zeitaufwändigen Prozess des manuellen Markierens von Rechnungen als "bezahlt" in Lexoffice. Es fügt drei Hauptfunktionen hinzu:

- Alle Rechnungen auf einmal als bezahlt markieren
- Nur ausgewählte Rechnungen als bezahlt markieren
- Rechnungen eines bestimmten Monats als bezahlt markieren

## Installation

1. Installiere die [Tampermonkey-Erweiterung](https://www.tampermonkey.net/) für deinen Browser
2. Klicke auf das Tampermonkey-Icon und wähle "Neues Skript erstellen"
3. Lösche den vorhandenen Inhalt und kopiere den gesamten Code aus der `AutoPay.js` Datei
4. Speichere das Skript (Strg + S oder Datei -> Speichern)

## Verwendung

1. Gehe zu Lexoffice und navigiere zu einer der folgenden Seiten:
   - Offene Einnahmen
   - Offene Einnahmenminderungen
   - Offene Ausgaben
   - Offene Ausgabenminderungen

2. Das Skript fügt automatisch drei Buttons hinzu:
   - "🔄 Alle Rechnungen als bezahlt markieren": Markiert alle sichtbaren Rechnungen als bezahlt
   - "✓ Ausgewählte Rechnungen als bezahlt markieren": Markiert nur die von dir ausgewählten Rechnungen als bezahlt
   - "📅 Rechnungen eines Monats als bezahlt markieren": Zeigt ein Dropdown-Menü mit den letzten drei Monaten an

3. Wähle die gewünschte Aktion:
   - Für alle Rechnungen: Klicke einfach auf den ersten Button
   - Für ausgewählte Rechnungen: Wähle zuerst die gewünschten Rechnungen aus und klicke dann auf den zweiten Button
   - Für einen bestimmten Monat: Klicke auf den dritten Button und wähle den gewünschten Monat aus dem Dropdown


