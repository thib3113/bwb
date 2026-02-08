# ADR 001: Global Architecture & Stack

## Context

We need a lightweight, standalone web application to control Boks parcels. It must run on mobile browsers (Chrome Android, Bluefy iOS) and desktop.

## Decision

We choose a **Client-Side SPA (Single Page Application)** architecture deployed as a PWA.

### Stack Selection

- **Framework:** **React 19**. Migrated from Preact to leverage native hooks, improved performance, and better ecosystem compatibility (MUI, etc.).
- **Build Tool:** **Vite**. For speed and modern ES module support.
- **Language:** **TypeScript**. Strict typing is mandatory for handling binary protocols safely.
- **Routing:** `react-router-dom`. Standard routing solution for React applications.
- **UI Library:** **MUI (Material UI)**. Adheres to Material Design guidelines for a familiar mobile experience.

## Consequences

- **Pros:** Fast load times, offline capabilities via Service Worker (PWA), cheap hosting (GitHub Pages).
- **Cons:** No server-side logic means all BLE security and logic must be handled in the browser (JS).
