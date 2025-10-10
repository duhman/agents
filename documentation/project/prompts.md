# Prompt templates overview

- System prompt enforces tone/policy (NO default, EN fallback, SV support)
- Extraction returns structured JSON with enhanced schema (see `packages/prompts`)
- Drafting uses deterministic template slots (dates, instructions) with RAG context enhancement

## Enhanced Extraction Schema

The agent now supports:
- **Payment issue detection**: Identifies billing problems, refund requests, double charges
- **Edge case handling**: No app access, corporate accounts, future move dates, sameie concerns
- **Multi-language support**: Norwegian (default), English, Swedish
- **Confidence factors**: Clear intent, complete information, standard case detection

## RAG Context Usage (Vector Store) - IMPLEMENTED

✅ **Status**: RAG integration is now fully implemented and operational.

### How it works:
1. **Smart Querying**: Only queries vector store for edge cases, payment issues, or unclear scenarios
2. **Context Retrieval**: Uses 727 real cancellation tickets for contextual guidance
3. **Draft Enhancement**: Enhances templates with real support conversation patterns
4. **Graceful Fallback**: Continues with templates if vector store is unavailable

### Query Strategy:
- **Standard cancellations**: Use templates (no vector store query)
- **Edge cases**: Query for similar scenarios (sameie concerns, app access issues)
- **Payment issues**: Query for billing/refund guidance
- **Unclear intent**: Query for clarification examples

### Context Enhancement:
- **Payment guidance**: Extracts refund, double-charge, billing error patterns
- **Tone adaptation**: Learns from empathetic, apologetic, urgent responses
- **Policy compliance**: Maintains end-of-month policy and app self-service instructions

### Performance:
- **Query time**: ~500-1000ms for vector store queries
- **Total processing**: <5s (within Vercel limits)
- **Cost**: ~$0.001 per query (much cheaper than fine-tuning)
- **Fallback**: Always works if vector store fails

### Environment Setup:
```bash
OPENAI_VECTOR_STORE_ID=vs_...  # Required for RAG functionality
```

### Metrics Tracking:
- RAG query usage rate
- Context retrieval success rate
- Payment issue handling rate
- Average context count per query
