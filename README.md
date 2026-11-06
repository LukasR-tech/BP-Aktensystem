# Bundespolizei-RP-Aktensystem – gemeinsame Datenbank

## Was diese Version kann
- Akten, Personen und Beweismittel werden zentral in Supabase gespeichert.
- Alle Nutzer sehen dieselben Daten, egal auf welchem Gerät sie die Website öffnen.
- Beim Zugang geben Nutzer das gemeinsame Passwort und ihren RP-Namen ein.
- Bei Akten wird dieser Name als Ersteller gespeichert. Die Oberfläche blendet Bearbeiten/Löschen für andere Namen aus.
- Darkmode bleibt lokal pro Browser gespeichert.

## Einrichtung
1. Erstelle ein Projekt unter https://supabase.com/.
2. Öffne **SQL Editor** und führe den Inhalt von `supabase_setup.sql` aus.
3. Öffne **Project Settings → API** und kopiere Project URL und den `anon`/`publishable` public key.
4. Öffne `config.js` und trage beide Werte ein. **Niemals den `service_role` key in die Website eintragen.**
5. Lade `index.html`, `style.css`, `script.js`, `config.js`, `supabase_setup.sql` und `README.md` in dein GitHub-Repository hoch. Aktiviere GitHub Pages wie bisher.
6. Öffne die Website neu (Strg+F5) und teste das Anlegen einer fiktiven Akte in zwei verschiedenen Browsern/Geräten.

## Wichtige Einschränkungen
Diese Ausführung ist eine einfache RP-Demo, keine sichere Fallverwaltung. Weil alle dasselbe Passwort nutzen und der RP-Name frei eingegeben wird, kann niemand technisch zuverlässig beweisen, dass er wirklich der genannte Ersteller ist. Die Bearbeitungsbeschränkung ist in dieser Version eine UI-Regel und kann von technisch versierten Nutzern umgangen werden. Die SQL-Richtlinien erlauben dem anonymen Website-Client Zugriff auf den gemeinsamen Datensatz, damit die Demo ohne individuelle Konten funktioniert.

**Nur fiktive RP-Daten verwenden.** Keine echten personenbezogenen, vertraulichen oder dienstlichen Daten eintragen. Wenn du echte technische Erstellerrechte willst, brauchst du individuelle Konten oder eine serverseitige Identitätsprüfung.

## Konflikte bei gleichzeitigem Speichern
Diese einfache Version speichert den Gesamtzustand als einen Datensatz. Wenn mehrere Nutzer exakt gleichzeitig Änderungen speichern, kann eine Änderung die andere überschreiben. Für größere Nutzung sollte man einzelne Akten/Personen/Beweismittel als eigene Datenbankzeilen speichern.
