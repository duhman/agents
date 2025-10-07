# Project Documentation

This directory contains core project documentation including requirements, technical plans, and policies.

## 📚 Files

### Core Documents

- **[`prd.md`](prd.md)** - Product Requirements Document
  - Background and context
  - Goals and objectives
  - Success metrics (KPIs)
  - Project scope
  - User stories
  - Functional requirements
  - Technical architecture
  - Non-functional requirements
  - Risks and mitigations
  - Roadmap and phases

- **[`plan.md`](plan.md)** - Technical Implementation Plan
  - Tech stack details
  - Repository layout
  - Data model
  - Runtime flow
  - OpenAI integration patterns
  - HubSpot scope
  - Security and privacy
  - Deployment strategy
  - Testing and evaluation
  - Implementation notes

### Policies & Guidelines

- **[`policies.md`](policies.md)** - Business Policies
  - Tone and language guidelines
  - Norwegian default; English fallback
  - End-of-month cancellation policy
  - App self-service encouragement
  - Communication standards

- **[`prompts.md`](prompts.md)** - Prompt Engineering Overview
  - System prompt patterns
  - Extraction prompt structure
  - Drafting template approach
  - Temperature and model settings

### Data & Integration

- **[`datasets.md`](datasets.md)** - Dataset Contract
  - External HubSpot training data format
  - S3 location and structure
  - JSONL format specification
  - PII redaction requirements
  - Provenance tracking

## 🎯 Quick Reference

### For Product Managers

1. [`prd.md`](prd.md) - Understand goals, KPIs, and requirements
2. [`policies.md`](policies.md) - Review business policies
3. [`plan.md`](plan.md) - Technical architecture overview

### For Developers

1. [`plan.md`](plan.md) - Technical implementation details
2. [`prompts.md`](prompts.md) - Prompt engineering patterns
3. [`datasets.md`](datasets.md) - Training data format

### For Data/ML Engineers

1. [`datasets.md`](datasets.md) - Data pipeline contract
2. [`prompts.md`](prompts.md) - Prompt structure
3. [`prd.md`](prd.md) - Fine-tuning requirements

## 📊 Project Overview

### Goals

- Automate subscription cancellation email responses
- 95%+ policy compliance accuracy
- <15 minute response time (from ~51 hours)
- 70%+ deflection rate without human edits

### Tech Stack

- **AI/LLM**: OpenAI Agents SDK (`@openai/agents`) with gpt-4o-2024-08-06, structured outputs, fine-tuning
- **RAG**: OpenAI Vector Store for contextual retrieval from HubSpot tickets (`OPENAI_VECTOR_STORE_ID`)
- **Runtime**: Node.js 20, TypeScript
- **Database**: PostgreSQL (Drizzle ORM)
- **Validation**: Zod schemas
- **Integrations**: Slack Bolt (HITM), HubSpot Conversations (optional)
- **Deployment**: Vercel Functions + Cron

### Data Flow

```
Email → PII Mask → Agents SDK Orchestration → (if relocation) Vector Store Search → Draft → Slack HITM →
Approve/Edit → Send Reply → Store Feedback → Export → Fine-tune
```

### Success Metrics

- **Response time**: <15 minutes (goal: <2s for classification)
- **Accuracy**: ≥95% policy compliance
- **Deflection**: ≥70% handled without human edits post-FT
- **CSAT**: Maintain or improve customer satisfaction

## 🔄 Process Flows

### Email Processing

1. Inbound email received (webhook or polling)
2. PII masking (emails, phones, addresses)
3. Agents SDK orchestration (emailProcessingAgent → triageAgent → cancellationAgent)
4. Structured extraction with tools (maskPiiTool, vectorStoreSearchTool, createTicketTool)
5. Draft generation (deterministic templates via generateDraftTool)
6. Confidence scoring (calculateConfidenceTool)
7. Store ticket and draft (createDraftTool)

### HITM Review

1. Post draft to Slack with context (postToSlackTool)
2. Show: original (masked), extraction, draft, confidence
3. Agent reviews: Approve / Edit / Reject
4. Store human decision (createHumanReview)
5. Send final reply to customer
6. Log for fine-tuning

### Fine-Tuning Loop

1. Export approved reviews (≥500 examples)
2. Generate JSONL training data
3. Upload to OpenAI
4. Create fine-tuning job
5. Monitor training
6. Update model ID in config
7. Deploy to production

## 📋 Key Policies

### Language

- **Default**: Norwegian (NO)
- **Fallback**: English (EN)
- Auto-detect from customer email

### Cancellation

- **Policy**: End-of-month cancellation
- **Self-service**: Encourage app cancellation when possible
- **Tone**: Polite, concise, branded

### Privacy

- **PII Masking**: Before any LLM calls
- **Storage**: Masked versions only
- **Logging**: No raw customer data
- **Compliance**: GDPR-compliant

## 🔗 Related Documentation

- [Deployment Documentation](../deployment/) - Setup and deployment guides
- [Cursor Documentation](../cursor/) - IDE configuration
- [Codebase](../../) - Source code and implementation

### Implementation Files

- Prompts: `packages/prompts/src/templates.ts`
- Agent: `apps/agent/src/index.ts`
- Slack HITM: `apps/slack-bot/src/index.ts`
- Database: `packages/db/src/schema.ts`
- Evaluation: `ops/scripts/eval.ts`

---

**Last Updated:** January 2025  
**Maintained by:** Development Team
