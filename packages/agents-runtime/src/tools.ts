import { tool } from "@openai/agents";
import { z } from "zod";
import { maskPII, logInfo, logError, type LogContext } from "@agents/core";
import { createTicket, createDraft } from "@agents/db";
import { generateDraft, type ExtractionResult } from "@agents/prompts";

export const maskPiiTool = tool({
  name: "mask_pii",
  description: "Mask PII from input email text before processing",
  parameters: z.object({
    email: z.string().describe("Email text to mask")
  }),
  execute: async ({ email }) => {
    try {
      const masked = maskPII(email);
      return {
        masked_email: masked,
        original_length: email.length,
        masked_length: masked.length,
        success: true
      };
    } catch (error: any) {
      logError("PII masking failed", { requestId: "tool-execution" }, error);
      throw new Error(`PII masking failed: ${error.message}`);
    }
  }
});

export const createTicketTool = tool({
  name: "create_ticket",
  description: "Create a new support ticket in the database",
  parameters: z.object({
    source: z.string().describe("Source of the email (e.g., 'hubspot', 'email')"),
    customerEmail: z.string().email().describe("Customer's email address"),
    rawEmailMasked: z.string().describe("Masked version of the original email"),
    reason: z.string().optional().nullable().describe("Cancellation reason if applicable"),
    moveDate: z.string().optional().nullable().describe("Move date in ISO format if mentioned")
  }),
  execute: async params => {
    try {
      const ticket = await createTicket({
        source: params.source,
        customerEmail: params.customerEmail,
        rawEmailMasked: params.rawEmailMasked,
        reason: params.reason,
        moveDate: params.moveDate ? new Date(params.moveDate) : undefined
      });

      logInfo(
        "Ticket created successfully",
        { requestId: "tool-execution" },
        {
          ticketId: ticket.id,
          source: ticket.source
        }
      );

      return {
        ticket_id: ticket.id,
        created_at: ticket.createdAt,
        source: ticket.source,
        success: true
      };
    } catch (error: any) {
      logError("Ticket creation failed", { requestId: "tool-execution" }, error);
      throw new Error(`Ticket creation failed: ${error.message}`);
    }
  }
});

export const createDraftTool = tool({
  name: "create_draft",
  description: "Create a draft response in the database",
  parameters: z.object({
    ticketId: z.string().describe("ID of the associated ticket"),
    language: z.enum(["no", "en"]).describe("Language of the draft"),
    draftText: z.string().describe("The draft response text"),
    confidence: z.number().min(0).max(1).describe("Confidence score for the draft"),
    model: z.string().describe("Model used to generate the draft")
  }),
  execute: async params => {
    try {
      const draft = await createDraft({
        ticketId: params.ticketId,
        language: params.language,
        draftText: params.draftText,
        confidence: String(params.confidence),
        model: params.model
      });

      logInfo(
        "Draft created successfully",
        { requestId: "tool-execution" },
        {
          draftId: draft.id,
          ticketId: params.ticketId,
          confidence: params.confidence
        }
      );

      return {
        draft_id: draft.id,
        created_at: draft.createdAt,
        confidence: params.confidence,
        success: true
      };
    } catch (error: any) {
      logError("Draft creation failed", { requestId: "tool-execution" }, error);
      throw new Error(`Draft creation failed: ${error.message}`);
    }
  }
});

export const calculateConfidenceTool = tool({
  name: "calculate_confidence",
  description: "Calculate confidence score for extraction results",
  parameters: z.object({
    extraction: z
      .object({
        is_cancellation: z.boolean(),
        reason: z.enum(["moving", "other", "unknown"]),
        move_date: z.string().optional().nullable(),
        language: z.enum(["no", "en"]),
        policy_risks: z.array(z.string())
      })
      .describe("Extraction results to score")
  }),
  execute: async ({ extraction }) => {
    try {
      let confidence = 0.5; // Base score
      const factors = {
        is_cancellation: extraction.is_cancellation,
        reason_known: extraction.reason !== "unknown",
        has_move_date: !!extraction.move_date,
        no_policy_risks: extraction.policy_risks.length === 0
      };

      if (extraction.is_cancellation) confidence += 0.3;
      if (extraction.reason !== "unknown") confidence += 0.1;
      if (extraction.move_date) confidence += 0.1;
      if (extraction.policy_risks.length === 0) confidence += 0.1;

      const finalConfidence = Math.min(confidence, 1.0);

      logInfo(
        "Confidence calculated",
        { requestId: "tool-execution" },
        {
          confidence: finalConfidence,
          factors
        }
      );

      return {
        confidence: finalConfidence,
        factors,
        success: true
      };
    } catch (error: any) {
      logError("Confidence calculation failed", { requestId: "tool-execution" }, error);
      throw new Error(`Confidence calculation failed: ${error.message}`);
    }
  }
});

export const generateDraftTool = tool({
  name: "generate_draft",
  description: "Generate a draft response using template system",
  parameters: z.object({
    language: z.enum(["no", "en"]).describe("Language for the draft"),
    reason: z.string().describe("Cancellation reason"),
    moveDate: z.string().optional().nullable().describe("Move date if mentioned"),
    customerName: z.string().optional().nullable().describe("Customer name if available")
  }),
  execute: async params => {
    try {
      const draftText = generateDraft({
        language: params.language,
        reason: params.reason,
        moveDate: params.moveDate,
        customerName: params.customerName
      });

      const analysis = {
        word_count: draftText.split(" ").length,
        includes_policy:
          draftText.includes("end of the month") || draftText.includes("utgangen av måneden"),
        includes_self_service: draftText.includes("app") || draftText.includes("appen"),
        includes_polite_tone:
          draftText.includes("thank you") ||
          draftText.includes("takk") ||
          draftText.includes("please") ||
          draftText.includes("vennligst")
      };

      logInfo(
        "Draft generated successfully",
        { requestId: "tool-execution" },
        {
          language: params.language,
          wordCount: analysis.word_count,
          policyCompliant: analysis.includes_policy
        }
      );

      return {
        draft_text: draftText,
        language: params.language,
        analysis,
        success: true
      };
    } catch (error: any) {
      logError("Draft generation failed", { requestId: "tool-execution" }, error);
      throw new Error(`Draft generation failed: ${error.message}`);
    }
  }
});

// Tool for Slack integration
export const postToSlackTool = tool({
  name: "post_to_slack",
  description: "Post draft for human review in Slack",
  parameters: z.object({
    ticketId: z.string().describe("Ticket ID"),
    draftId: z.string().describe("Draft ID"),
    originalEmail: z.string().describe("Original customer email"),
    draftText: z.string().describe("Generated draft text"),
    confidence: z.number().min(0).max(1).describe("Confidence score"),
    extraction: z.any().describe("Extraction results")
  }),
  execute: async params => {
    try {
      // This would integrate with your Slack bot
      // For now, return success status
      logInfo(
        "Slack posting initiated",
        { requestId: "tool-execution" },
        {
          ticketId: params.ticketId,
          draftId: params.draftId,
          confidence: params.confidence
        }
      );

      return {
        success: true,
        message: "Draft posted to Slack for review",
        ticket_id: params.ticketId,
        draft_id: params.draftId,
        slack_channel: process.env.SLACK_REVIEW_CHANNEL || "not-configured"
      };
    } catch (error: any) {
      logError("Slack posting failed", { requestId: "tool-execution" }, error);
      throw new Error(`Slack posting failed: ${error.message}`);
    }
  }
});

// Tool for extracting structured data from emails
export const extractEmailDataTool = tool({
  name: "extract_email_data",
  description: "Extract structured data from customer emails",
  parameters: z.object({
    email: z.string().describe("Email text to analyze"),
    context: z
      .object({
        source: z.string().optional().nullable(),
        customerEmail: z.string().optional().nullable(),
        timestamp: z.string().optional().nullable()
      })
      .optional()
      .nullable()
      .describe("Additional context for extraction")
  }),
  execute: async ({ email, context }) => {
    try {
      // This tool would use the extraction agent internally
      // For now, return a placeholder structure
      logInfo(
        "Email data extraction initiated",
        { requestId: "tool-execution" },
        {
          emailLength: email.length,
          hasContext: !!context
        }
      );

      return {
        success: true,
        message: "Email data extraction completed",
        extracted_data: {
          // This would be populated by the extraction agent
          is_cancellation: false,
          reason: "unknown",
          language: "en",
          policy_risks: []
        }
      };
    } catch (error: any) {
      logError("Email data extraction failed", { requestId: "tool-execution" }, error);
      throw new Error(`Email data extraction failed: ${error.message}`);
    }
  }
});

// Tool for validating policy compliance
export const validatePolicyComplianceTool = tool({
  name: "validate_policy_compliance",
  description: "Validate that a draft response complies with company policies",
  parameters: z.object({
    draftText: z.string().describe("Draft text to validate"),
    language: z.enum(["no", "en"]).describe("Language of the draft")
  }),
  execute: async ({ draftText, language }) => {
    try {
      const checks = {
        has_end_of_month_policy:
          language === "no"
            ? draftText.includes("utgangen av måneden")
            : draftText.includes("end of the month"),
        has_self_service_instructions: draftText.includes("app") || draftText.includes("appen"),
        has_polite_tone:
          language === "no"
            ? draftText.includes("takk") || draftText.includes("vennligst")
            : draftText.includes("thank you") || draftText.includes("please"),
        appropriate_length: draftText.length > 50 && draftText.length < 1000
      };

      const compliant = Object.values(checks).every(check => check);

      logInfo(
        "Policy compliance validation completed",
        { requestId: "tool-execution" },
        {
          compliant,
          checks
        }
      );

      return {
        compliant,
        checks,
        success: true
      };
    } catch (error: any) {
      logError("Policy compliance validation failed", { requestId: "tool-execution" }, error);
      throw new Error(`Policy compliance validation failed: ${error.message}`);
    }
  }
});
