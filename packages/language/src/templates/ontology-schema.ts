export const KFLOW_ONTOLOGY_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://kflow.ai/schemas/ontology.json',
  title: 'Kflow Ontology',
  description: 'Canonical structure for actors, intents, entities, and signals derived from workflow narratives.',
  type: 'object',
  required: ['actors', 'intents', 'entities', 'signals'],
  additionalProperties: false,
  properties: {
    metadata: {
      type: 'object',
      description: 'Optional metadata describing provenance for the ontology snapshot.',
      additionalProperties: false,
      properties: {
        generatedAt: { type: 'string', format: 'date-time' },
        narrativeHash: { type: 'string', description: 'Hash of the source narrative text.' },
        provider: { type: 'string', description: 'LLM or heuristic provider used to generate the ontology.' },
        version: { type: 'string', description: 'Semantic version of the ontology schema consumer.' },
      },
    },
    actors: {
      type: 'array',
      items: { $ref: '#/$defs/actor' },
      description: 'People or roles responsible for workflow tasks.',
      default: [],
    },
    intents: {
      type: 'array',
      items: { $ref: '#/$defs/intent' },
      description: 'Business outcomes the workflow aims to achieve.',
      default: [],
    },
    entities: {
      type: 'array',
      items: { $ref: '#/$defs/entity' },
      description: 'Data objects referenced in the workflow.',
      default: [],
    },
    signals: {
      type: 'array',
      items: { $ref: '#/$defs/signal' },
      description: 'External systems or events interacting with the workflow.',
      default: [],
    },
  },
  $defs: {
    confidence: {
      type: 'number',
      minimum: 0,
      maximum: 1,
    },
    source: {
      type: 'string',
      enum: ['narrative', 'llm', 'manual'],
    },
    actor: {
      type: 'object',
      required: ['name'],
      additionalProperties: false,
      properties: {
        name: { type: 'string', minLength: 1 },
        aliases: {
          type: 'array',
          items: { type: 'string', minLength: 1 },
          uniqueItems: true,
          default: [],
        },
        sources: {
          type: 'array',
          items: { $ref: '#/$defs/source' },
          uniqueItems: true,
          default: [],
        },
        confidence: { $ref: '#/$defs/confidence' },
      },
    },
    intent: {
      type: 'object',
      required: ['name'],
      additionalProperties: false,
      properties: {
        name: { type: 'string', minLength: 1 },
        description: { type: 'string' },
        sources: {
          type: 'array',
          items: { $ref: '#/$defs/source' },
          uniqueItems: true,
          default: [],
        },
        confidence: { $ref: '#/$defs/confidence' },
      },
    },
    entity: {
      type: 'object',
      required: ['name'],
      additionalProperties: false,
      properties: {
        name: { type: 'string', minLength: 1 },
        kind: {
          type: 'string',
          enum: ['text', 'numeric', 'boolean', 'date', 'system', 'unknown'],
          default: 'unknown',
        },
        description: { type: 'string' },
        origins: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['input', 'condition', 'output', 'system'],
          },
          uniqueItems: true,
          default: [],
        },
        sources: {
          type: 'array',
          items: { $ref: '#/$defs/source' },
          uniqueItems: true,
          default: [],
        },
        confidence: { $ref: '#/$defs/confidence' },
      },
    },
    signal: {
      type: 'object',
      required: ['name'],
      additionalProperties: false,
      properties: {
        name: { type: 'string', minLength: 1 },
        type: {
          type: 'string',
          enum: ['system', 'event', 'notification'],
          default: 'system',
        },
        interaction: {
          type: 'string',
          enum: ['push', 'pull', 'bidirectional'],
          default: 'push',
        },
        description: { type: 'string' },
        sources: {
          type: 'array',
          items: { $ref: '#/$defs/source' },
          uniqueItems: true,
          default: [],
        },
        confidence: { $ref: '#/$defs/confidence' },
      },
    },
  },
} as const;

export type KflowOntologySchema = typeof KFLOW_ONTOLOGY_SCHEMA;
