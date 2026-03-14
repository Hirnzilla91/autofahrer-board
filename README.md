# Autofahrer Board — Kennzeichen-Brett

Deutschlands satirisches Fahrer-Register. Ein schwarzes Brett für deutsche Autokennzeichen, auf dem Fahrer bewertet werden können.

## Features

- **Kennzeichen registrieren** — Nur gültige deutsche Kennzeichen (500+ Stadtcodes)
- **Bewertungen abgeben** — Note 1-6 mit Kommentar (max. 120 Zeichen)
- **Top 10 Rankings** — Beste und schlechteste Fahrer auf der Startseite
- **Suche** — Kennzeichen suchen
- **Dark/Light Mode** — Automatisch oder manuell
- **Mobile-first** — Optimiert für Smartphones

## Tech Stack

- **Frontend:** React + Vite + Tailwind CSS + shadcn/ui
- **Backend:** Express.js + Drizzle ORM
- **Datenbank:** PostgreSQL
- **Font:** General Sans (Fontshare)

## Lokale Entwicklung

```bash
# Abhängigkeiten installieren
npm install

# Datenbank-URL setzen
export DATABASE_URL="postgresql://user:password@localhost:5432/kennzeichen"

# Tabellen erstellen & Seed-Daten einfügen
npx tsx server/db-setup.ts

# Entwicklungsserver starten
npm run dev
```

## Deployment auf Railway

1. Repository auf GitHub pushen
2. Auf [railway.app](https://railway.app) neues Projekt erstellen
3. "Deploy from GitHub" wählen und dieses Repo verbinden
4. PostgreSQL-Datenbank hinzufügen (Add Plugin → PostgreSQL)
5. Die `DATABASE_URL` wird automatisch gesetzt
6. Build Command: `npm run build`
7. Start Command: `node dist/index.cjs`
8. Nach dem ersten Deploy: DB-Setup ausführen via Railway CLI:
   ```bash
   railway run npx tsx server/db-setup.ts
   ```

## Umgebungsvariablen

| Variable | Beschreibung |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL Connection String |
| `PORT` | Server Port (Default: 5000) |
| `NODE_ENV` | `production` für Produktivbetrieb |

## Satire-Hinweis

Dieses Projekt ist ein Satire-Projekt. Alle Einträge dienen der Unterhaltung.
