import { z } from "zod";
// Re-export pattern functions
export { detectCancellationIntent, detectPaymentIssue, detectLanguage, extractCustomerConcerns, calculateConfidenceFactors, detectEdgeCase as detectEdgeCaseFromPatterns } from "./patterns.js";
// Legacy schema for backward compatibility
export const extractionSchema = z.object({
    is_cancellation: z.boolean(),
    reason: z.enum(["moving", "other", "unknown"]),
    move_date: z.string().date().optional().nullable(),
    language: z.enum(["no", "en"]),
    policy_risks: z.array(z.string()).default([])
});
// Legacy system prompts for backward compatibility
export const systemPolicyNO = `Du er en kundeservicerådgiver for Elaway. Følg selskapets policy:
- Oppsigelser trer i kraft ved utgangen av måneden.
- Oppfordre til selvbetjent oppsigelse i appen når mulig.
- Vær høflig, konsis, og merk eventuelle manglende detaljer.`;
export const systemPolicyEN = `You are a customer service advisor for Elaway. Follow company policy:
- Cancellations take effect at the end of the month.
- Encourage self-service cancellation via the app when possible.
- Be polite, concise, and note any missing details.`;
// Legacy extraction prompt for backward compatibility
export const extractionPrompt = (email) => `Analyze this customer email and extract:
- is_cancellation: true if the customer is requesting to cancel their subscription
- reason: "moving" if relocating/moving, "other" if different reason, "unknown" if unclear
- move_date: ISO date (YYYY-MM-DD) if mentioned, null otherwise
- language: "no" for Norwegian, "en" for English
- policy_risks: list any ambiguities (dates, unclear intent, etc.)

Email:
${email}`;
export function generateDraft(params) {
    const { language, reason, moveDate } = params;
    if (language === "no") {
        let body = `Takk for din henvendelse angående oppsigelse av abonnementet ditt.`;
        if (reason === "moving") {
            body += `\n\nVi forstår at du skal flytte.`;
        }
        body += `\n\nOppsigelsen trer i kraft ved utgangen av den måneden vi mottar beskjeden. Du kan enkelt si opp abonnementet ditt via appen.`;
        if (moveDate) {
            body += `\n\nDu nevnte flyttedato ${moveDate}. Vær oppmerksom på at oppsigelsen gjelder fra månedens slutt.`;
        }
        body += `\n\nHvis du har spørsmål, er du velkommen til å kontakte oss igjen.`;
        return body;
    }
    else {
        let body = `Thank you for contacting us about canceling your subscription.`;
        if (reason === "moving") {
            body += `\n\nWe understand you are relocating.`;
        }
        body += `\n\nThe cancellation takes effect at the end of the month we receive your notice. You can easily cancel your subscription via the app.`;
        if (moveDate) {
            body += `\n\nYou mentioned a move date of ${moveDate}. Please note that the cancellation applies from the end of the month.`;
        }
        body += `\n\nIf you have any questions, feel free to contact us again.`;
        return body;
    }
}
//# sourceMappingURL=templates.js.map