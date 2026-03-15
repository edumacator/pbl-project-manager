# Decision Log

This file records durable architectural and product decisions that should remain stable across implementation cycles.

## Decision template
- **Decision title**:
- **Date**:
- **Status**: proposed | accepted | replaced
- **Context**:
- **Decision**:
- **Reasoning**:
- **Implications**:

---

## 1) Prioritize simplicity over enterprise complexity
- **Date**: 2026-03-15
- **Status**: accepted
- **Context**: Classroom users need fast onboarding and predictable workflows under time constraints.
- **Decision**: Keep core workflows simple and avoid enterprise-style configuration surfaces unless clearly necessary.
- **Reasoning**: Complexity increases student confusion, setup burden, and support overhead.
- **Implications**: Prefer opinionated defaults, narrow scope, and gradual feature exposure.

## 2) Teacher visibility supports coaching, not surveillance
- **Date**: 2026-03-15
- **Status**: accepted
- **Context**: Teachers need insight to support learners without creating a policing dynamic.
- **Decision**: Design teacher-facing analytics and activity views to enable intervention, facilitation, and coaching.
- **Reasoning**: Coaching improves learning outcomes; surveillance reduces trust and student agency.
- **Implications**: Emphasize actionable support signals, avoid punitive tracking patterns.

## 3) Cognitive scaffolding is a core product requirement
- **Date**: 2026-03-15
- **Status**: accepted
- **Context**: Many students need structured support to plan and complete long-horizon projects.
- **Decision**: Treat scaffolding features (checkpoints, sequencing, reflection, peer critique structure) as foundational, not optional add-ons.
- **Reasoning**: Scaffolding directly supports executive function and project completion quality.
- **Implications**: Preserve and strengthen scaffolded workflows when prioritizing roadmap work.
