---
name: commands
---

# Command Guidance

## Package Manager
- Primary package manager: npm.
- Use `npm install`, `npm run <script>`, `npx <tool>`.

## Current App Commands (`alwayspcn/`)
- `npm run dev` (auto-runs `predev` -> `build:network`)
- `npm run build:network` (generate `public/data/network.json` from `../data/doc.kml`)
- `npm run lint`
- `npm run build` (auto-runs `prebuild` -> `build:network`)
- `npm run start`

## Discovery
- Inspect scripts with `npm run` in app directory.
- Use `grep`/`find` if `rg` is unavailable.

## Output Format
- Report command name, status (pass/fail/unavailable), and key error lines.
- Keep logs concise in summaries and link exact files changed.
