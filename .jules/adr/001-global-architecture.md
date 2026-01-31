# ADR 001: Global Architecture & Stack

## Context
We need a lightweight, standalone web application to control Boks parcels. It must run on mobile browsers (Chrome Android, Bluefy iOS) and desktop.

## Decision
We choose a **Client-Side SPA (Single Page Application)** architecture deployed as a PWA.

### Stack Selection
*   **Framework:** **Preact**. Selected for its tiny footprint (3kb) compared to React, ideal for mobile performance on low-end devices.
*   **Build Tool:** **Vite**. For speed and modern ES module support.
*   **Language:** **TypeScript**. Strict typing is mandatory for handling binary protocols safely.
*   **Routing:** `react-router-dom` (compatible via `preact/compat`).
*   **UI Library:** `preact-material-components` / MUI. Adheres to Material Design guidelines for a familiar mobile experience.

## Consequences
*   **Pros:** Fast load times, offline capabilities via Service Worker (PWA), cheap hosting (GitHub Pages).
*   **Cons:** No server-side logic means all BLE security and logic must be handled in the browser (JS).
