import "dotenv/config";
import { run } from "@openai/agents";
import { maskPII, generateRequestId, logInfo, logError, logWarn, envSchema } from "@agents/core";
import { emailProcessingAgent, triageAgent, cancellationAgent, extractionAgent, draftingAgent } from "@agents/agents-runtime";
const env = envSchema.parse(process.env);
export async function processEmail(params) {
    const { source, customerEmail, rawEmail } = params;
    const requestId = generateRequestId();
    const startTime = Date.now();
    const logContext = { requestId };
    try {
        logInfo("Starting email processing with Agents SDK", logContext, {
            source,
            customerEmail: maskPII(customerEmail)
        });
        // 1. PII masking (REQUIRED FIRST)
        const maskedEmail = maskPII(rawEmail);
        const maskedCustomerEmail = maskPII(customerEmail);
        // 2. Prepare input for the main orchestrator agent
        const agentInput = `Process this email for Elaway customer service:

Source: ${source}
Customer Email: ${maskedCustomerEmail}
Email Content: ${maskedEmail}

Please extract information, create appropriate records, and generate a response if this is a cancellation request.`;
        // 3. Run the main orchestrator agent with 30s timeout for serverless constraints
        const abortController = new AbortController();
        const timeoutId = setTimeout(() => abortController.abort(), 30000);
        try {
            const result = await run(emailProcessingAgent, agentInput, {
                signal: abortController.signal
            });
            clearTimeout(timeoutId);
            if (!result.finalOutput) {
                throw new Error("Agent run completed but no final output received");
            }
            // 4. DETERMINISTIC FALLBACK: If agent identified cancellation but didn't create ticket/draft,
            // create them now using our deterministic templates and DB operations
            const out = result.finalOutput;
            if (out?.extraction?.is_cancellation && (!out.ticket_id || !out.draft_id)) {
                logWarn("Agent identified cancellation but didn't create ticket/draft - applying deterministic fallback", logContext, {
                    hasTicket: !!out.ticket_id,
                    hasDraft: !!out.draft_id,
                    extraction: out.extraction
                });
                const extraction = out.extraction;
                const { createTicket, createDraft } = await import("@agents/db");
                const { generateDraft } = await import("@agents/prompts");
                // Create ticket if missing
                let ticketId = out.ticket_id;
                if (!ticketId) {
                    const ticket = await createTicket({
                        source,
                        customerEmail: maskedCustomerEmail,
                        rawEmailMasked: maskedEmail,
                        reason: extraction.reason ?? undefined,
                        moveDate: extraction.move_date ? new Date(extraction.move_date) : undefined
                    });
                    ticketId = ticket.id;
                    logInfo("Created ticket via fallback", logContext, { ticketId });
                }
                // Generate and create draft if missing
                let draftId = out.draft_id;
                let draftText = out.draft_text;
                if (!draftId || !draftText) {
                    // Generate draft deterministically using templates
                    draftText = generateDraft({
                        language: extraction.language || "no",
                        reason: extraction.reason || "unknown",
                        moveDate: extraction.move_date ?? null
                    });
                    // Calculate confidence (consistent with rules)
                    let confidence = 0.5; // Base score
                    if (extraction.is_cancellation)
                        confidence += 0.3;
                    if (extraction.reason && extraction.reason !== "unknown")
                        confidence += 0.1;
                    if (extraction.move_date)
                        confidence += 0.1;
                    if ((extraction.policy_risks ?? []).length === 0)
                        confidence += 0.1;
                    confidence = Math.min(confidence, 1.0);
                    const draft = await createDraft({
                        ticketId,
                        language: extraction.language || "no",
                        draftText,
                        confidence: String(confidence),
                        model: "template-fallback"
                    });
                    draftId = draft.id;
                    out.confidence = confidence; // Update confidence
                    logInfo("Created draft via fallback", logContext, { draftId, confidence });
                }
                // Update output so Slack HITM will trigger
                out.ticket_id = ticketId;
                out.draft_id = draftId;
                out.draft_text = draftText;
            }
            const duration = Date.now() - startTime;
            logInfo("Email processing completed successfully", {
                ...logContext,
                duration
            }, {
                success: out.success,
                ticketId: out.ticket_id,
                draftId: out.draft_id,
                confidence: out.confidence,
                route: out.route
            });
            return {
                success: out.success,
                ticket: out.ticket_id ? { id: out.ticket_id } : null,
                draft: out.draft_id
                    ? {
                        id: out.draft_id,
                        draftText: out.draft_text || ""
                    }
                    : null,
                confidence: out.confidence,
                route: out.route,
                extraction: out.extraction,
                error: out.error ?? undefined
            };
        }
        catch (abortError) {
            clearTimeout(timeoutId);
            throw abortError;
        }
    }
    catch (error) {
        const duration = Date.now() - startTime;
        logError("Email processing failed", { ...logContext, duration }, error);
        return {
            success: false,
            ticket: null,
            draft: null,
            confidence: 0,
            route: "error",
            error: error.message || "Unknown error occurred"
        };
    }
}
/**
 * Simplified function for direct email triage
 * Useful for testing or when you only need routing decisions
 */
export async function triageEmail(email) {
    const requestId = generateRequestId();
    const logContext = { requestId };
    try {
        logInfo("Starting email triage", logContext);
        const result = await run(triageAgent, email);
        if (!result.finalOutput) {
            throw new Error("Triage agent run completed but no final output received");
        }
        logInfo("Email triage completed", logContext, {
            route: result.finalOutput.route,
            confidence: result.finalOutput.confidence,
            keywords: result.finalOutput.keywords_found
        });
        return result.finalOutput;
    }
    catch (error) {
        logError("Email triage failed", logContext, error);
        throw error;
    }
}
/**
 * Simplified function for direct cancellation handling
 * Useful when you already know it's a cancellation request
 */
export async function handleCancellation(params) {
    const requestId = generateRequestId();
    const logContext = { requestId };
    try {
        logInfo("Starting cancellation handling", logContext);
        const input = `Handle this cancellation request:

Source: ${params.source}
Customer Email: ${params.customerEmail}
Email Content: ${params.rawEmail}
${params.extraction ? `Extraction: ${JSON.stringify(params.extraction)}` : ""}

Please process this cancellation request and generate appropriate response.`;
        const result = await run(cancellationAgent, input);
        if (!result.finalOutput) {
            throw new Error("Cancellation agent run completed but no final output received");
        }
        logInfo("Cancellation handling completed", logContext, {
            success: result.finalOutput.success,
            ticketId: result.finalOutput.ticket_id,
            draftId: result.finalOutput.draft_id,
            confidence: result.finalOutput.confidence
        });
        return result.finalOutput;
    }
    catch (error) {
        logError("Cancellation handling failed", logContext, error);
        throw error;
    }
}
/**
 * Direct extraction function using the extraction agent
 * Useful for testing or when you only need structured data extraction
 */
export async function extractEmailData(email) {
    const requestId = generateRequestId();
    const logContext = { requestId };
    try {
        logInfo("Starting email data extraction", logContext);
        const result = await run(extractionAgent, email);
        if (!result.finalOutput) {
            throw new Error("Extraction agent run completed but no final output received");
        }
        logInfo("Email data extraction completed", logContext, {
            isCancellation: result.finalOutput.is_cancellation,
            reason: result.finalOutput.reason,
            language: result.finalOutput.language
        });
        return result.finalOutput;
    }
    catch (error) {
        logError("Email data extraction failed", logContext, error);
        throw error;
    }
}
/**
 * Direct draft generation function using the drafting agent
 * Useful for testing or when you only need draft generation
 */
export async function generateEmailDraft(params) {
    const requestId = generateRequestId();
    const logContext = { requestId };
    try {
        logInfo("Starting email draft generation", logContext);
        const input = `Generate a draft response for this cancellation request:

Language: ${params.language}
Reason: ${params.reason}
Move Date: ${params.moveDate || "Not specified"}
Customer Name: ${params.customerName || "Not provided"}

Please generate a professional, policy-compliant response.`;
        const result = await run(draftingAgent, input);
        if (!result.finalOutput) {
            throw new Error("Drafting agent run completed but no final output received");
        }
        logInfo("Email draft generation completed", logContext, {
            language: result.finalOutput.language,
            confidence: result.finalOutput.confidence,
            policyCompliant: result.finalOutput.policy_compliant
        });
        return result.finalOutput;
    }
    catch (error) {
        logError("Email draft generation failed", logContext, error);
        throw error;
    }
}
/**
 * Health check function to verify agent system is working
 */
export async function healthCheck() {
    const requestId = generateRequestId();
    const logContext = { requestId };
    try {
        logInfo("Starting health check", logContext);
        const agents = [
            "emailProcessingAgent",
            "triageAgent",
            "cancellationAgent",
            "extractionAgent",
            "draftingAgent"
        ];
        // Test with a simple email to verify agents are working
        const testResult = await run(triageAgent, "Test email for health check");
        if (!testResult.finalOutput) {
            throw new Error("Health check failed - no final output from triage agent");
        }
        logInfo("Health check completed successfully", logContext, {
            agentsCount: agents.length,
            testResult: testResult.finalOutput.route
        });
        return {
            status: "healthy",
            agents,
            timestamp: new Date().toISOString()
        };
    }
    catch (error) {
        logError("Health check failed", logContext, error);
        return {
            status: "unhealthy",
            agents: [],
            timestamp: new Date().toISOString(),
            error: error.message
        };
    }
}
// Example usage (for local testing)
if (import.meta.url === `file://${process.argv[1]}`) {
    const testEmail = `
Hei,

Jeg skal flytte til Oslo 15. mars og vil si opp abonnementet mitt.

Mvh,
Ole
  `;
    console.log("Testing Agents SDK implementation...");
    processEmail({
        source: "test",
        customerEmail: "test@example.com",
        rawEmail: testEmail
    })
        .then(result => {
        console.log("✓ Processed with Agents SDK:", {
            success: result.success,
            ticketId: result.ticket?.id,
            draftId: result.draft?.id,
            confidence: result.confidence,
            route: result.route
        });
    })
        .catch(err => {
        console.error("✗ Error:", err);
        process.exit(1);
    });
}
