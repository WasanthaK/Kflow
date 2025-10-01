# Kflow AI Roadmap Status

This checklist tracks incremental progress on the AI integration vision described in `docs/ai-integration-strategy.md`. It focuses on bite-sized deliverables so contributors can see what is ready, in progress, or still open.

## Legend
- `[x]` Done
- `[~]` In progress / partially complete
- `[ ]` Not started

## Immediate Visibility Wins
- [x] Surface AI vision in README and contributor docs
- [x] Instrument repository with AI telemetry scaffolding (`@kflow/language` exports analytics hooks)
- [x] Document BPMN export CLI and programmatic usage in manuals
- [ ] Create automated issue labels for AI tasks
- [x] Wire narrative insight extraction via AI-first pipeline (OpenAI helper ships with heuristic fallback; accuracy tracking in progress)
- [x] Ship AI diagnostics and escalation helper to surface confidence and warnings

## Phase 0 – Foundations
- [ ] Select transcription & LLM providers
- [ ] Design secure data pipelines
- [ ] Produce architecture diagram and security review
- [ ] Complete ingestion proof-of-concept

## Phase 1 – Capture & Transcribe
- [ ] Build audio upload pipeline
- [ ] Implement transcription dashboard
- [ ] Support document intake workflows (PDF, DOCX, email, chat)
- [ ] Add metadata tagging service for captured artefacts

## Phase 2 – Requirement Intelligence
- [~] Implement NLP extraction microservice (StoryFlow AI generator now calls OpenAI by default when configured and enriches outputs with actors, intents, and variables)
- [ ] Define ontology schema for Kflow concepts
- [ ] Build analyst clarification chat loops

## Phase 3 – Flow Generation
- [ ] Generate IR directly from AI-extracted requirements
- [ ] Surface confidence-rated Kflow snippets with rationales
- [ ] Provide diff explanations between AI suggestions and existing flows

## Phase 4 – Business Process Reengineering
- [ ] Model baseline vs. target state comparisons
- [ ] Integrate best-practice template library
- [ ] Produce ROI dashboards for recommendations

## Phase 5 – Governance & Scale
- [ ] Capture reviewer feedback for prompt tuning
- [ ] Instrument adoption, accuracy, and cycle-time telemetry
- [ ] Establish bias monitoring and audit-trail guardrails

---

To propose or claim one of these items, open an issue referencing the corresponding checkbox and link back to this roadmap status file.
