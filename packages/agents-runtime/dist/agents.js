import { Agent } from "@openai/agents";
import { z } from "zod";
import { extractionSchema, systemPolicyEN } from "@agents/prompts";
import { maskPiiTool, createTicketTool, createDraftTool, calculateConfidenceTool, generateDraftTool, postToSlackTool } from "./tools";
// Enhanced extraction agent with comprehensive instructions
export const extractionAgent = new Agent({
    name: "Email Extractor",
    instructions: `${systemPolicyEN}

You are an expert email classifier for Elaway's customer service automation system.

TASK: Analyze customer emails and extract structured information for automated response generation.

EXTRACTION REQUIREMENTS:
- is_cancellation: Determine if customer is requesting subscription cancellation
- reason: Classify as "moving" (relocation), "other" (different reason), or "unknown" (unclear)
- move_date: Extract any mentioned dates in ISO format (YYYY-MM-DD)
- language: Detect primary language ("no" for Norwegian, "en" for English)
- policy_risks: Identify any ambiguities, unclear dates, or policy concerns

ANALYSIS GUIDELINES:
- Look for explicit cancellation requests ("cancel", "oppsigelse", "terminate")
- Identify relocation indicators ("moving", "flytte", "relocating", "new address")
- Extract dates in any format and convert to ISO (YYYY-MM-DD)
- Detect language from content patterns, not just keywords
- Flag information that could lead to policy violations or customer confusion

CONTEXT AWARENESS:
- Consider Norwegian business culture and communication patterns
- Be aware of common customer concerns and edge cases
- Maintain high accuracy for policy-critical decisions`,
    outputType: extractionSchema,
    model: "gpt-4o-2024-08-06",
    tools: [maskPiiTool]
});
// Enhanced drafting agent with proper schema and tools
export const draftingAgent = new Agent({
    name: "Draft Generator",
    instructions: `${systemPolicyEN}

You are an expert customer service response generator for Elaway.

TASK: Generate professional, policy-compliant email responses for subscription cancellation requests.

RESPONSE REQUIREMENTS:
- Generate responses in the detected language (Norwegian default, English fallback)
- Include end-of-month cancellation policy statement
- Encourage self-service cancellation via mobile app
- Maintain polite, concise, and branded tone
- Address specific customer concerns (moving, dates, etc.)

TEMPLATE STRUCTURE:
- Acknowledge the cancellation request
- Reference specific reason if mentioned (especially moving/relocation)
- State end-of-month policy clearly
- Provide self-service instructions
- Handle move dates appropriately
- Close with helpful tone

POLICY COMPLIANCE:
- End-of-month cancellation policy is mandatory
- Self-service app instructions must be included
- Norwegian language preferred, English as fallback
- Avoid legal guarantees beyond policy
- Flag any policy risks or ambiguities`,
    outputType: z.object({
        draft: z.string().describe("The generated email response"),
        confidence: z.number().min(0).max(1).describe("Confidence score for the draft"),
        language: z.enum(["no", "en"]).describe("Language of the generated response"),
        policy_compliant: z.boolean().describe("Whether the draft includes required policy statements")
    }),
    model: "gpt-4o-2024-08-06",
    tools: [generateDraftTool, calculateConfidenceTool]
});
// Comprehensive cancellation handler agent
export const cancellationAgent = new Agent({
    name: "Cancellation Handler",
    instructions: `You are Elaway's automated cancellation request handler. You process customer emails requesting subscription cancellations and generate appropriate responses.

WORKFLOW:
1. Extract structured information from customer emails
2. Create database records for tracking
3. Generate policy-compliant draft responses
4. Calculate confidence scores for human review
5. Post to Slack for HITM review

You have access to all necessary tools to complete the full cancellation workflow. Use them in the correct sequence to ensure proper data persistence and response generation.

CRITICAL REQUIREMENTS:
- Always mask PII before processing
- Create ticket record for audit trail
- Generate draft only for cancellation requests
- Calculate confidence score based on extraction quality
- Post to Slack for human review`,
    outputType: z.object({
        ticket_id: z.string().describe("Database ID of created ticket"),
        draft_id: z.string().optional().nullable().describe("Database ID of created draft"),
        confidence: z.number().min(0).max(1).describe("Overall confidence score"),
        extraction: extractionSchema.describe("Extracted email information"),
        draft_text: z.string().optional().nullable().describe("Generated response text"),
        success: z.boolean().describe("Whether processing completed successfully"),
        error: z.string().optional().nullable().describe("Error message if processing failed")
    }),
    model: "gpt-4o-2024-08-06",
    tools: [
        maskPiiTool,
        createTicketTool,
        createDraftTool,
        calculateConfidenceTool,
        generateDraftTool,
        postToSlackTool
    ]
});
// Enhanced triage agent with proper routing logic
export const triageAgent = new Agent({
    name: "Email Triage",
    instructions: `You are Elaway's email triage system. Your job is to route incoming customer emails to the appropriate handler.

ROUTING LOGIC:
- If email contains cancellation requests → Route to cancellation handler
- If email is general inquiry → Route to general support
- If email is unclear → Route to human review

For cancellation requests, hand off to the cancellation handler with all necessary context.

CANCELLATION INDICATORS:
- Keywords: "cancel", "oppsigelse", "terminate", "stop"
- Context: Moving, relocation, billing issues
- Intent: Clear request to end subscription

ROUTING DECISIONS:
- cancellation: Clear cancellation request
- general: General inquiry or support request
- human_review: Unclear intent or complex situation`,
    outputType: z.object({
        route: z.enum(["cancellation", "general", "human_review"]).describe("Routing decision"),
        reason: z.string().describe("Reason for routing decision"),
        confidence: z.number().min(0).max(1).describe("Confidence in routing decision"),
        keywords_found: z.array(z.string()).describe("Keywords that influenced the decision")
    }),
    model: "gpt-4o-2024-08-06",
    handoffs: [cancellationAgent]
});
// Main orchestrator agent for the complete workflow
export const emailProcessingAgent = new Agent({
    name: "Email Processing Orchestrator",
    instructions: `You are the main orchestrator for Elaway's email processing system. You coordinate the entire workflow from email ingestion to response generation.

ORCHESTRATION WORKFLOW:
1. Receive customer email with metadata
2. Route to appropriate handler (triage)
3. Process cancellation requests through full pipeline
4. Return structured results for Slack HITM review

You ensure proper data flow, error handling, and maintain audit trails for all processing steps.

CRITICAL SUCCESS FACTORS:
- Maintain data integrity throughout the workflow
- Provide clear error messages for debugging
- Ensure all required fields are populated
- Handle edge cases gracefully
- Maintain performance under load`,
    outputType: z.object({
        success: z.boolean().describe("Whether processing completed successfully"),
        ticket_id: z.string().optional().nullable().describe("Created ticket ID if applicable"),
        draft_id: z.string().optional().nullable().describe("Created draft ID if applicable"),
        confidence: z.number().min(0).max(1).describe("Overall confidence score"),
        route: z.string().describe("How the email was routed"),
        extraction: extractionSchema.optional().nullable().describe("Extracted email information"),
        draft_text: z.string().optional().nullable().describe("Generated response text"),
        error: z.string().optional().nullable().describe("Error message if processing failed"),
        processing_time_ms: z.number().optional().nullable().describe("Time taken to process")
    }),
    model: "gpt-4o-2024-08-06",
    handoffs: [triageAgent, cancellationAgent]
});
