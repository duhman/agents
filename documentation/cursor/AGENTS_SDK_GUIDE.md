# OpenAI Agents SDK Guide (TypeScript)

## Goals

- Use `@openai/agents` with typed outputs, tools, guardrails, and handoffs.
- Keep Slack HITM fast (ack <3s), treat side-effects as async.

## Agents

```ts
import { Agent, run } from "@openai/agents";
import { extractionSchema } from "@agents/prompts";

export const extractionAgent = new Agent({
  name: "Email Extractor",
  instructions: "Extract structured fields",
  outputType: extractionSchema,
  model: "gpt-4o-2024-08-06",
  temperature: 0,
  timeout: 30000
});

const result = await run(extractionAgent, maskedEmail);
```

## Tools

```ts
import { tool } from "@openai/agents";
import { z } from "zod";

export const createTicketTool = tool({
  name: "create_ticket",
  parameters: z.object({
    source: z.string(),
    customerEmail: z.string(),
    rawEmailMasked: z.string()
  }),
  execute: async p => (await createTicket(p)).id
});
```

## Guardrails

```ts
export const inputGuardrails = [
  async (input: string) => {
    if (/\S+@\S+/.test(input)) throw new Error("PII detected; mask first");
    return input;
  }
];

export const outputGuardrails = [
  async (output: string) => {
    if (!/(end of the month|utgangen av måneden)/i.test(output)) throw new Error("Missing policy");
    return output;
  }
];
```

## Handoffs

```ts
export const triageAgent = Agent.create({
  name: "Triage",
  instructions: "Route cancellation emails to specialist",
  handoffs: [cancellationAgent]
});
```

## Tracing

- `run(agent, input)` returns a result with optional `trace`.
- Log compact summary (agentPath, toolCalls count, duration, success).

## Feature Flag

- Use `USE_AGENTS_SDK=1` to enable SDK path (now default); legacy path maintained for emergency rollback.

## Best Practices

- Temperature 0; timeout 30s for deterministic, serverless reliability.
- Validate outputs with `outputType` (Zod schemas preferred).
- Keep webhooks quick; perform side-effects via tools or async tasks.
- Persist only validated, mapped results.

## References

- `packages/agents-runtime/`
- `.cursor/rules/agents-sdk.mdc`
- https://openai.github.io/openai-agents-js/
