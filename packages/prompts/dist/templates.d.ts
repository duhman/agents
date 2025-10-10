import { z } from "zod";
export { detectCancellationIntent, detectPaymentIssue, detectLanguage, extractCustomerConcerns, calculateConfidenceFactors, detectEdgeCase as detectEdgeCaseFromPatterns } from "./patterns.js";
export declare const extractionSchema: z.ZodObject<{
    is_cancellation: z.ZodBoolean;
    reason: z.ZodEnum<["moving", "other", "unknown"]>;
    move_date: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    language: z.ZodEnum<["no", "en"]>;
    policy_risks: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    is_cancellation: boolean;
    reason: "moving" | "unknown" | "other";
    language: "no" | "en";
    policy_risks: string[];
    move_date?: string | null | undefined;
}, {
    is_cancellation: boolean;
    reason: "moving" | "unknown" | "other";
    language: "no" | "en";
    move_date?: string | null | undefined;
    policy_risks?: string[] | undefined;
}>;
export type ExtractionResult = z.infer<typeof extractionSchema>;
export declare const systemPolicyNO = "Du er en kundeservicer\u00E5dgiver for Elaway. F\u00F8lg selskapets policy:\n- Oppsigelser trer i kraft ved utgangen av m\u00E5neden.\n- Oppfordre til selvbetjent oppsigelse i appen n\u00E5r mulig.\n- V\u00E6r h\u00F8flig, konsis, og merk eventuelle manglende detaljer.";
export declare const systemPolicyEN = "You are a customer service advisor for Elaway. Follow company policy:\n- Cancellations take effect at the end of the month.\n- Encourage self-service cancellation via the app when possible.\n- Be polite, concise, and note any missing details.";
export declare const extractionPrompt: (email: string) => string;
export interface DraftParams {
    language: "no" | "en";
    reason: string;
    moveDate?: string | null;
    customerName?: string;
}
export declare function generateDraft(params: DraftParams): string;
//# sourceMappingURL=templates.d.ts.map