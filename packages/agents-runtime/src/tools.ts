import { tool } from "@openai/agents";
import { z } from "zod";
import { maskPII } from "@agents/core";
import { createTicket, createDraft } from "@agents/db";

export const maskPiiTool = tool({
  name: "mask_pii",
  description: "Mask PII from input email text",
  parameters: z.object({ email: z.string() }),
  execute: async ({ email }) => maskPII(email)
});

export const createTicketTool = tool({
  name: "create_ticket",
  description: "Persist ticket in database and return id",
  parameters: z.object({
    source: z.string(),
    customerEmail: z.string(),
    rawEmailMasked: z.string(),
    reason: z.string().optional(),
    moveDate: z.string().optional()
  }),
  execute: async (p) => {
    const ticket = await createTicket({
      source: p.source,
      customerEmail: p.customerEmail,
      rawEmailMasked: p.rawEmailMasked,
      reason: p.reason,
      moveDate: p.moveDate ? new Date(p.moveDate) : undefined
    });
    return { id: ticket.id };
  }
});

export const createDraftTool = tool({
  name: "create_draft",
  description: "Persist draft for ticket and return id",
  parameters: z.object({
    ticketId: z.string(),
    language: z.string(),
    draftText: z.string(),
    confidence: z.number(),
    model: z.string()
  }),
  execute: async (p) => {
    const draft = await createDraft({
      ticketId: p.ticketId,
      language: p.language,
      draftText: p.draftText,
      confidence: String(p.confidence),
      model: p.model
    });
    return { id: draft.id };
  }
});


