# Kflow — Open Source Workflow Language

Human-first, AI-assisted workflow language. Author in **StoryFlow** (plain speak) → compile to **SimpleScript** (friendly YAML) → internal **IR** → export to BPMN/ASL/etc. Includes Codex/Copilot prompt recipes.

## Packages

- `packages/language`: parsers, schemas, lints, exporters, simulator.
- `packages/studio`: web editor + AI assist + simulator UI.
- `packages/vscode-ext`: VS Code extension for syntax highlighting, validation, and quick-fixes.

## Getting Started

```bash
pnpm install
pnpm -w -r build
pnpm --filter studio dev
```

## License

Apache-2.0
