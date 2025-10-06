import { Agent } from "@openai/agents";
import { extractionSchema, systemPolicyEN } from "@agents/prompts";
import { maskPiiTool, createTicketTool, createDraftTool } from "./tools";
export const extractionAgent = new Agent({
    name: "Email Extractor",
    instructions: systemPolicyEN,
    outputType: extractionSchema,
    model: "gpt-4o-2024-08-06",
    tools: [maskPiiTool]
});
export const draftingAgent = new Agent({
    name: "Draft Generator",
    instructions: "Generate a compliant draft email based on structured extraction.",
    // Use a minimal schema by proxying through function return type
    outputType: { draft: "string" },
    model: "gpt-4o-2024-08-06",
    tools: []
});
export const cancellationAgent = new Agent({
    name: "Cancellation Handler",
    instructions: "Extract details and generate a compliant cancellation draft.",
    outputType: { draft: "string", confidence: "number" },
    model: "gpt-4o-2024-08-06",
    tools: [maskPiiTool, createTicketTool, createDraftTool]
});
export const triageAgent = new Agent({
    name: "Email Triage",
    instructions: "Route cancellation emails to the cancellation handler agent.",
    handoffs: [cancellationAgent]
});
