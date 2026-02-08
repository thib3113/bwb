# ADR 002: CI/CD Strategy & Package Manager

## Status

Accepted

## Context

The project has been migrated to a new repository.

- The package manager used locally is `pnpm`, but previous CI configurations used `npm`.
- We need to deploy Pull Request previews to GitHub Pages to facilitate testing.
- The application uses a Service Worker (PWA), which poses challenges for caching in a subfolder deployment structure.

## Decision

1.  **Package Manager**:
    - We enforce **pnpm** for all environments (Local & CI).
    - Rationale: Faster installation, efficient disk space usage, and strict dependency handling.

2.  **Deployment Strategy (GitHub Pages)**:
    - **Main Branch**: Deploys to the root (`/`) of the `gh-pages` branch.
    - **Pull Requests**: Deploys to a subfolder (`/pr-{number}/`) on the `gh-pages` branch.
    - **Mechanism**: We will use the `gh-pages` branch as the source of truth.
      - _Note_: The repository settings must be configured to "Deploy from Branch: gh-pages".
    - **Cleanup**: A workflow will trigger on PR close to remove the specific subfolder.

3.  **Vite & Base Path**:
    - The application must support dynamic base paths.
    - Builds will accept `BASE_URL` environment variable.
    - The Service Worker must be configured to scope itself correctly to the base path to avoid cross-PR cache pollution.

## Consequences

- **Pros**:
  - Live previews for every PR.
  - Consistent environment (pnpm).
- **Cons**:
  - The `gh-pages` branch can grow large with many PR folders (mitigated by cleanup workflow).
  - Service Worker complexity increases (must handle dynamic scopes).
