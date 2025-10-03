---
description: Rules for cancellation automation agent (classification, drafting, HITM, privacy)
globs: apps/**/*, packages/**/*, docs/**/*, infra/**/*, *.md
alwaysApply: true
---

- **Policies to enforce**
  - Redact PII before LLM calls
  - End-of-month cancellation policy; include app self-service
  - Norwegian default; fallback to English
- **Prompting DO**
  - Use `packages/prompts` templates; return JSON per extraction schema
- **Prompting DON'T**
  - Do not freeform extract fields without schema validation
- **Data**
  - Store tickets, drafts, human_reviews as specified
- **References**
  - See @prd.md, @prompts.md, @policies.md

