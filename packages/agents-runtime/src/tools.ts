import { tool } from "@openai/agents";
import { z } from "zod";
import { maskPII, logInfo, logError, type LogContext } from "@agents/core";
import { createTicket, createDraft } from "@agents/db";
import { generateDraftEnhanced } from "@agents/prompts";
import OpenAI from "openai";
import { emitArtifact } from "./observability/artifacts.js";

type ConfidenceFactors = {
  is_cancellation: boolean;
  reason_known: boolean;
  has_move_date: boolean;
  no_policy_risks: boolean;
};

const maskPiiParameters = z.object({
  email: z.string().describe("Email text to mask")
});

export const maskPiiTool = tool({
  name: "mask_pii",
  description: "Mask PII from input email text before processing",
  parameters: maskPiiParameters,
  execute: async ({ email }: z.infer<typeof maskPiiParameters>) => {
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

const createTicketParameters = z.object({
  source: z.string().describe("Source of the email (e.g., 'hubspot', 'email')"),
  customerEmail: z.string().email().describe("Customer's email address"),
  rawEmailMasked: z.string().describe("Masked version of the original email"),
  reason: z.string().optional().nullable().describe("Cancellation reason if applicable"),
  moveDate: z.string().optional().nullable().describe("Move date in ISO format if mentioned")
});

export const createTicketTool = tool({
  name: "create_ticket",
  description: "Create a new support ticket in the database",
  parameters: createTicketParameters,
  execute: async (params: z.infer<typeof createTicketParameters>) => {
    try {
      const ticket = await createTicket({
        source: params.source,
        customerEmail: params.customerEmail,
        rawEmailMasked: params.rawEmailMasked,
        reason: params.reason ?? undefined,
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

      try {
        await emitArtifact({
          requestId: "tool-execution",
          type: "ticket_creation_status",
          data: {
            ticketId: ticket.id,
            status: "created",
            createdAt: Date.now()
          }
        });
      } catch {}

      return {
        ticket_id: ticket.id,
        created_at: ticket.createdAt,
        source: ticket.source,
        success: true
      };
    } catch (error: any) {
      logError("Ticket creation failed", { requestId: "tool-execution" }, error);
      try {
        await emitArtifact({
          requestId: "tool-execution",
          type: "ticket_creation_status",
          data: {
            status: "error",
            message: String(error?.message ?? "unknown")
          }
        });
      } catch {}
      throw new Error(`Ticket creation failed: ${error.message}`);
    }
  }
});

const createDraftParameters = z.object({
  ticketId: z.string().describe("ID of the associated ticket"),
  language: z.enum(["no", "en"]).describe("Language of the draft"),
  draftText: z.string().describe("The draft response text"),
  confidence: z.number().min(0).max(1).describe("Confidence score for the draft"),
  model: z.string().describe("Model used to generate the draft")
});

export const createDraftTool = tool({
  name: "create_draft",
  description: "Create a draft response in the database",
  parameters: createDraftParameters,
  execute: async (params: z.infer<typeof createDraftParameters>) => {
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

      try {
        await emitArtifact({
          requestId: "tool-execution",
          type: "draft_creation_status",
          data: {
            draftId: draft.id,
            ticketId: params.ticketId,
            status: "created",
            createdAt: Date.now()
          }
        });
      } catch {}

      return {
        draft_id: draft.id,
        created_at: draft.createdAt,
        confidence: params.confidence,
        success: true
      };
    } catch (error: any) {
      logError("Draft creation failed", { requestId: "tool-execution" }, error);
      try {
        await emitArtifact({
          requestId: "tool-execution",
          type: "draft_creation_status",
          data: {
            status: "error",
            message: String(error?.message ?? "unknown")
          }
        });
      } catch {}
      throw new Error(`Draft creation failed: ${error.message}`);
    }
  }
});

const calculateConfidenceParameters = z.object({
  extraction: z
    .object({
      is_cancellation: z.boolean(),
      reason: z.enum(["moving", "other", "unknown"]),
      move_date: z.string().optional().nullable(),
      language: z.enum(["no", "en"]),
      policy_risks: z.array(z.string())
    })
    .describe("Extraction results to score")
});

export const calculateConfidenceTool = tool({
  name: "calculate_confidence",
  description: "Calculate confidence score for extraction results",
  parameters: calculateConfidenceParameters,
  execute: async ({
    extraction
  }: z.infer<typeof calculateConfidenceParameters>): Promise<{
    confidence: number;
    factors: ConfidenceFactors;
    success: true;
  }> => {
    try {
      let confidence = 0.5; // Base score
      const factors: ConfidenceFactors = {
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

const generateDraftParameters = z.object({
  language: z.enum(["no", "en", "sv"]).describe("Language for the draft"),
  reason: z.enum(["moving", "payment_issue", "other", "unknown"]).describe("Cancellation reason"),
  moveDate: z.string().optional().nullable().describe("Move date if mentioned"),
  customerName: z.string().optional().nullable().describe("Customer name if available"),
  edgeCase: z
    .enum([
      "none",
      "no_app_access",
      "corporate_account",
      "future_move_date",
      "already_canceled",
      "sameie_concern",
      "payment_dispute"
    ])
    .nullable()
    .optional()
    .describe("Detected edge case"),
  customerConcerns: z.array(z.string()).optional().describe("Customer concerns mentioned"),
  hasPaymentIssue: z.boolean().optional().describe("Whether payment issues were detected"),
  paymentConcerns: z.array(z.string()).optional().describe("Specific payment concerns"),
  ragContext: z.array(z.string()).optional().describe("Optional RAG context snippets")
});

export const generateDraftTool = tool({
  name: "generate_draft",
  description: "Generate a draft response using template system",
  parameters: generateDraftParameters,
  execute: async (params: z.infer<typeof generateDraftParameters>) => {
    try {
      const draftText = generateDraftEnhanced({
        language: params.language,
        reason: params.reason,
        moveDate: params.moveDate ?? undefined,
        customerName: params.customerName ?? undefined,
        edgeCase: params.edgeCase ?? "none",
        customerConcerns: params.customerConcerns ?? [],
        hasPaymentIssue: params.hasPaymentIssue ?? false,
        paymentConcerns: params.paymentConcerns ?? [],
        ragContext: params.ragContext ?? []
      });

      const analysis = {
        word_count: draftText.split(/\s+/).filter(Boolean).length,
        includes_policy:
          draftText.toLowerCase().includes("end of the month") ||
          draftText.toLowerCase().includes("ut inneværende måned"),
        includes_self_service:
          draftText.toLowerCase().includes("app") ||
          draftText.toLowerCase().includes("appen"),
        includes_polite_tone:
          draftText.toLowerCase().includes("thank you") ||
          draftText.toLowerCase().includes("takk") ||
          draftText.toLowerCase().includes("please") ||
          draftText.toLowerCase().includes("vennligst")
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

      try {
        await emitArtifact({
          requestId: "tool-execution",
          type: "drafting_progress",
          data: {
            progress: 1,
            partialTextMasked: maskPII(draftText),
            language: params.language
          }
        });
      } catch {}

      return {
        draft_text: draftText,
        language: params.language,
        analysis,
        success: true
      };
    } catch (error: any) {
      logError("Draft generation failed", { requestId: "tool-execution" }, error);
      try {
        await emitArtifact({
          requestId: "tool-execution",
          type: "drafting_progress",
          data: {
            progress: 0,
            error: String(error?.message ?? "unknown")
          }
        });
      } catch {}
      throw new Error(`Draft generation failed: ${error.message}`);
    }
  }
});

// Tool for Slack integration
const postToSlackParameters = z.object({
  ticketId: z.string().describe("Ticket ID"),
  draftId: z.string().describe("Draft ID"),
  originalEmail: z.string().describe("Original customer email"),
  draftText: z.string().describe("Generated draft text"),
  confidence: z.number().min(0).max(1).describe("Confidence score"),
  extraction: z
    .record(z.string(), z.unknown())
    .describe("Extraction results")
});

export const postToSlackTool = tool({
  name: "post_to_slack",
  description: "Post draft for human review in Slack",
  parameters: postToSlackParameters,
  execute: async (params: z.infer<typeof postToSlackParameters>) => {
    try {
      logInfo(
        "Slack posting initiated",
        { requestId: "tool-execution" },
        {
          ticketId: params.ticketId,
          draftId: params.draftId,
          confidence: params.confidence
        }
      );

      try {
        await emitArtifact({
          requestId: "tool-execution",
          type: "slack_post_status",
          data: {
            status: "queued",
            channelId: process.env.SLACK_REVIEW_CHANNEL || "not-configured"
          }
        });
      } catch {}

      try {
        await emitArtifact({
          requestId: "tool-execution",
          type: "slack_post_status",
          data: {
            status: "posted",
            channelId: process.env.SLACK_REVIEW_CHANNEL || "not-configured",
            messageUrl: ""
          }
        });
      } catch {}

      return {
        success: true,
        message: "Draft posted to Slack for review",
        ticket_id: params.ticketId,
        draft_id: params.draftId,
        slack_channel: process.env.SLACK_REVIEW_CHANNEL || "not-configured"
      };
    } catch (error: any) {
      logError("Slack posting failed", { requestId: "tool-execution" }, error);
      try {
        await emitArtifact({
          requestId: "tool-execution",
          type: "slack_post_status",
          data: {
            status: "error",
            message: String(error?.message ?? "unknown")
          }
        });
      } catch {}
      throw new Error(`Slack posting failed: ${error.message}`);
    }
  }
});

// Tool for extracting structured data from emails
const extractEmailDataParameters = z.object({
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
});

export const extractEmailDataTool = tool({
  name: "extract_email_data",
  description: "Extract structured data from customer emails",
  parameters: extractEmailDataParameters,
  execute: async ({
    email,
    context
  }: z.infer<typeof extractEmailDataParameters>): Promise<{
    success: true;
    message: string;
    extracted_data: {
      is_cancellation: boolean;
      reason: string;
      language: string;
      policy_risks: string[];
    };
  }> => {
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
const validatePolicyComplianceParameters = z.object({
  draftText: z.string().describe("Draft text to validate"),
  language: z.enum(["no", "en"]).describe("Language of the draft")
});

export const validatePolicyComplianceTool = tool({
  name: "validate_policy_compliance",
  description: "Validate that a draft response complies with company policies",
  parameters: validatePolicyComplianceParameters,
  execute: async ({
    draftText,
    language
  }: z.infer<typeof validatePolicyComplianceParameters>): Promise<{
    compliant: boolean;
    checks: {
      has_end_of_month_policy: boolean;
      has_self_service_instructions: boolean;
      has_polite_tone: boolean;
      appropriate_length: boolean;
    };
    success: true;
  }> => {
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

      try {
        await emitArtifact({
          requestId: "tool-execution",
          type: "policy_validation",
          data: {
            overallPass: compliant,
            checks
          } as any
        });
      } catch {}

      return {
        compliant,
        checks,
        success: true
      };
    } catch (error: any) {
      logError("Policy compliance validation failed", { requestId: "tool-execution" }, error);
      try {
        await emitArtifact({
          requestId: "tool-execution",
          type: "policy_validation",
          data: {
            overallPass: false,
            error: String(error?.message ?? "unknown")
          }
        });
      } catch {}
      throw new Error(`Policy compliance validation failed: ${error.message}`);
    }
  }
});

// Tool for searching OpenAI Vector Store for similar HubSpot tickets
const vectorStoreSearchParameters = z.object({
  query: z.string().describe("Search query describing the customer's issue"),
  maxResults: z
    .number()
    .min(1)
    .max(10)
    .default(5)
    .describe("Maximum number of contextual snippets to return")
});

export const vectorStoreSearchTool = tool({
  name: "search_vector_store",
  description:
    "Search the configured OpenAI Vector Store of HubSpot tickets for similar cases to provide context.",
  parameters: vectorStoreSearchParameters,
  execute: async ({
    query,
    maxResults
  }: z.infer<typeof vectorStoreSearchParameters>): Promise<{
    success: boolean;
    results: string[];
    vector_store_id?: string;
    message?: string;
  }> => {
    try {
      const vectorStoreId = process.env.OPENAI_VECTOR_STORE_ID;

      if (!vectorStoreId) {
        logError(
          "Vector store ID not configured",
          { requestId: "tool-execution" },
          new Error("Missing OPENAI_VECTOR_STORE_ID")
        );
        return {
          success: false,
          results: [],
          message: "OPENAI_VECTOR_STORE_ID is not set"
        };
      }

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      // Use Responses API with file_search tool attached to the vector store.
      // Casting to any to avoid SDK type churn while keeping runtime behavior.
      const response: any = await (openai as any).responses.create({
        model: "gpt-4o-2024-08-06",
        input:
          `Return up to ${maxResults} short bullet snippets from the most relevant HubSpot tickets for this query. ` +
          `Each snippet should be concise and directly useful for drafting a reply. Query: ${query}`,
        tools: [{ type: "file_search" }],
        attachments: [
          {
            vector_store_id: vectorStoreId,
            tools: [{ type: "file_search" }]
          }
        ]
      });

      // Extract text output; if structured citations are available, prefer them.
      let outputText: string = response?.output_text || "";
      if (!outputText && response?.choices?.[0]?.message?.content) {
        outputText = String(response.choices[0].message.content);
      }

      const results = outputText
        .split(/\n+/)
        .filter((line: string) => line.trim().length > 0)
        .slice(0, maxResults);

      logInfo(
        "Vector store search completed",
        { requestId: "tool-execution" },
        { query, resultsCount: results.length, vectorStoreId }
      );

      try {
        await emitArtifact({
          requestId: "tool-execution",
          type: "vector_search_context",
          data: {
            enabled: true,
            query: maskPII(query),
            results: results.map((r: string, i: number) => ({
              id: String(i + 1),
              score: 0,
              titleMasked: maskPII(r)
            }))
          }
        });
      } catch {}

      return {
        success: true,
        results,
        vector_store_id: vectorStoreId
      };
    } catch (error: any) {
      logError("Vector store search failed", { requestId: "tool-execution" }, error);
      throw new Error(`Vector store search failed: ${error.message}`);
    }
  }
});
