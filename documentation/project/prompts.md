# Prompt templates overview

- System prompt enforces tone/policy (NO default, EN fallback)
- Extraction returns structured JSON (see `packages/prompts`)
- Drafting uses deterministic template slots (dates, instructions)

## Context Usage (Vector Store)

- When extraction indicates relocation/moving, the agent should query the configured OpenAI Vector Store for similar HubSpot tickets using `search_vector_store`.
- Use top results as context to enhance drafts (tone, common concerns, policy clarifications).
- Do not copy entire transcripts; summarize only helpful snippets.
- Continue to enforce end-of-month policy and app self-service in the final draft.
