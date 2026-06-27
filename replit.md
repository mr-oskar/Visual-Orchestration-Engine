# Servioen — Visual Data Engineering IDE

A Visual Software Engineering IDE that transforms Python code into an interactive flow graph with bidirectional sync. Built for data engineers who need to visualize complex pipeline dependencies at a glance.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, served at `/api`)
- `pnpm --filter @workspace/servioen run dev` — run the frontend (served at `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Frontend: React + Vite, `@xyflow/react` for flow graph, VS Code dark theme

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for all API contracts)
- `lib/db/src/schema/` — Drizzle ORM table definitions (projects, graph_nodes, graph_edges, activity_events)
- `artifacts/api-server/src/routes/` — Express route handlers (projects.ts, graph.ts, health.ts)
- `artifacts/servioen/src/` — React frontend
  - `src/components/ide/canvas.tsx` — ReactFlow canvas with node/edge rendering
  - `src/components/ide/custom-nodes.tsx` — Custom ReactFlow node types (folder/file/class/function)
  - `src/components/ide/sidebar.tsx` — File explorer tree
  - `src/components/ide/properties.tsx` — Right panel: code + metadata
  - `src/pages/ide.tsx` — Main 3-panel IDE layout
  - `src/pages/projects.tsx` — Project list/management
  - `src/pages/project-stats.tsx` — Project statistics

## Architecture decisions

- **Backend-driven graph data**: All node/edge positions, types, and code content are stored in PostgreSQL. The frontend fetches from the API and renders via ReactFlow — no local state persistence.
- **VS Code dark theme only**: The app is always in dark mode. `dark` class is applied at root. CSS variables match VS Code color palette (#1e1e1e bg, #d4d4d4 text, #0078d4 primary).
- **ReactFlow handle strategy**: Function nodes have default `input`/`output` handles at 50% that all edges connect to. Additional typed handles are rendered per inputTypes/outputTypes array for visual port coloring.
- **inputTypes/outputTypes stored as JSON strings**: The `graph_nodes` table stores these arrays as `text` columns with JSON encoding, parsed in the API layer before returning to the client.
- **Hierarchical container nodes**: ReactFlow uses `parentId` + `extent: 'parent'` for nested containment (folder → file → class → function).

## Product

- Visual IDE for Python data engineering pipelines
- 3-panel layout: file explorer sidebar / ReactFlow canvas / code + properties panel
- Hierarchical node types: Folder (blue), File (yellow), Class (green), Function (orange)
- Data flow edges with animated bezier curves colored by data type
- Projects management page and statistics dashboard

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Always import `@xyflow/react/dist/style.css` BEFORE `index.css` in `main.tsx` — without it ReactFlow has no base styles
- Orval generates `<OperationId>Params` for any operation with query parameters, which collides with the generated TypeScript types barrel. Use path parameters only to avoid TS2308 collisions.
- `pnpm add` may add a package to `package.json` without linking `node_modules` in monorepo context — always run `pnpm install` afterward to ensure links are created.
- After schema changes to `lib/db`, run `pnpm --filter @workspace/db run push` then `pnpm run typecheck:libs` to refresh declarations.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
