# Kflow Ontology Schema

Kflow’s AI pipeline translates unstructured narratives into structured workflow concepts. This ontology provides a shared vocabulary for those concepts so downstream tooling (generators, analytics, studio UI) can reason about actors, intents, variables, and systems in a consistent way.

## 1. Top-Level Structure

The schema is defined in `packages/language/src/templates/ontology-schema.ts` and exported as a JSON Schema–compatible document. It contains four core collections:

| Key | Description |
| --- | --- |
| `actors` | People or roles responsible for tasks within the workflow. |
| `intents` | Business outcomes the workflow strives to accomplish. |
| `entities` | Data objects manipulated throughout the process (documents, records, assets). |
| `signals` | External systems, events, or integrations that trigger or influence the workflow. |

Each collection item includes metadata describing how the element was derived from the source narrative.

## 2. Field Reference

### Actor Node

```json
{
  "name": "finance manager",
  "aliases": ["finance lead"],
  "sources": ["narrative", "llm"],
  "confidence": 0.78
}
```

- `name`: Canonical label used in generated StoryFlow.
- `aliases`: Raw text variants observed in the source material.
- `sources`: `narrative` (heuristic), `llm`, or `manual`.
- `confidence`: Normalised 0–1 score.

### Intent Node

```json
{
  "name": "approve high-value order",
  "description": "Ensure high-value orders receive financial review",
  "sources": ["llm"],
  "confidence": 0.71
}
```

### Entity Node

```json
{
  "name": "order_total",
  "kind": "numeric",
  "origins": ["input", "condition"],
  "description": "Total value of the customer order",
  "sources": ["narrative"],
  "confidence": 0.64
}
```

- `kind`: Categorises the entity (`numeric`, `text`, `date`, `boolean`, `system`).
- `origins`: Matches existing extractor hints (`input`, `condition`, `output`, `system`).

### Signal Node

```json
{
  "name": "warehouse system",
  "type": "system",
  "interaction": "pull",
  "sources": ["narrative"],
  "confidence": 0.52
}
```

- `type`: `system`, `event`, or `notification`.
- `interaction`: `push`, `pull`, or `bidirectional`.

## 3. JSON Schema Summary

The exported schema resembles the following (abridged for readability):

```ts
export const KFLOW_ONTOLOGY_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://kflow.ai/schemas/ontology.json',
  type: 'object',
  required: ['actors', 'intents', 'entities', 'signals'],
  properties: {
    actors: { type: 'array', items: { $ref: '#/$defs/actor' } },
    intents: { type: 'array', items: { $ref: '#/$defs/intent' } },
    entities: { type: 'array', items: { $ref: '#/$defs/entity' } },
    signals: { type: 'array', items: { $ref: '#/$defs/signal' } },
    metadata: { $ref: '#/$defs/metadata' }
  },
  $defs: { /* actor, intent, entity, signal, metadata definitions */ }
};
```

See the source file for the complete JSON Schema definition, including validation rules for confidence ranges, origin enumerations, and metadata timestamps.

## 4. Usage

1. **Narrative extraction** — `generateStoryFromNarrative` now returns a `clarifications` array (via `buildClarificationPrompts`) that maps missing ontology nodes to follow-up questions.
2. **Studio UI** — Upcoming work can read the schema to render review panels, ensuring analysts confirm every actor/entity before publishing.
3. **Telemetry** — The schema provides a standard shape for logging adoption metrics (`actors_confirmed`, `entities_missing`, etc.).

## 5. Contributing Updates

- Update `ontology-schema.ts` and this document together.
- Add regression tests under `packages/language/test/ontology-schema.test.ts` to guard against accidental breaking changes.
- Version the schema via the `$id` field when making backward-incompatible updates.
