# ADR 003: Mobile-First / Mobile-Only Design

## Status
Accepted

## Context
The "Boks" hardware is located outdoors (outside the home).
Users interact with the application almost exclusively via smartphones or tablets (estimated 99% of usage).
A desktop interface, while functional, is not the primary target and should not drive design decisions.

## Decision
1.  **Mobile-First UI**: All UI components must be optimized for touch targets, vertical scrolling, and small screens.
2.  **Testing Strategy**:
    *   End-to-End (E2E) tests (Cypress) must run in a mobile viewport (e.g., `iphone-x` or 375x812) by default to simulate real-world usage.
3.  **Performance**:
    *   Assets should be optimized for mobile networks (PWA offline capabilities are critical).

## Consequences
*   **Pros**:
    *   Better User Experience (UX) for the actual target audience.
    *   Simplified layout logic (focus on stack views rather than complex grids).
*   **Cons**:
    *   Debugging on desktop browsers might require toggling "Device Toolbar".
