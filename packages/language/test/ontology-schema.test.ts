import { describe, it, expect } from 'vitest';
import { KFLOW_ONTOLOGY_SCHEMA } from '../src/templates/ontology-schema.js';

const requiredKeys = ['actors', 'intents', 'entities', 'signals'];

describe('KFLOW_ONTOLOGY_SCHEMA', () => {
  it('exposes required top-level collections', () => {
    expect(KFLOW_ONTOLOGY_SCHEMA.required).toEqual(requiredKeys);
  });

  it('restricts actors to string names and optional aliases', () => {
    const actorDef = KFLOW_ONTOLOGY_SCHEMA.$defs?.actor as Record<string, unknown>;
    expect(actorDef?.required).toContain('name');
    expect(actorDef?.properties).toHaveProperty('aliases');
    expect(actorDef?.properties).toHaveProperty('confidence');
  });

  it('enumerates allowed entity kinds and origins', () => {
    const entityDef = KFLOW_ONTOLOGY_SCHEMA.$defs?.entity as any;
    expect(entityDef?.properties?.kind?.enum).toContain('numeric');
    expect(entityDef?.properties?.origins?.items?.enum).toEqual([
      'input',
      'condition',
      'output',
      'system',
    ]);
  });

  it('pins schema metadata identifiers', () => {
    expect(KFLOW_ONTOLOGY_SCHEMA.$schema).toMatch('json-schema');
    expect(KFLOW_ONTOLOGY_SCHEMA.$id).toMatch('ontology');
  });
});
