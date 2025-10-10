declare module "@agents/prompts" {
  import type { z } from "zod";

  export interface ExtractionResultEnhanced {
    is_cancellation: boolean;
    reason: "moving" | "payment_issue" | "other" | "unknown";
    move_date?: string | null;
    language: "no" | "en" | "sv";
    edge_case: "none" | "no_app_access" | "corporate_account" | "future_move_date" | "already_canceled" | "sameie_concern" | "payment_dispute";
    has_payment_issue: boolean;
    payment_concerns: string[];
    urgency: "immediate" | "future" | "unclear";
    customer_concerns: string[];
    policy_risks: string[];
    confidence_factors: {
      clear_intent: boolean;
      complete_information: boolean;
      standard_case: boolean;
    };
  }

  export const extractionSchemaEnhanced: z.ZodObject<Record<string, z.ZodTypeAny>>;

  export const systemPolicyNO_Enhanced: string;
  export const systemPolicyEN_Enhanced: string;
  export const extractionPromptEnhanced: (email: string) => string;

  export interface DraftParamsEnhanced {
    language: "no" | "en" | "sv";
    reason: "moving" | "payment_issue" | "other" | "unknown";
    moveDate?: string | null;
    customerName?: string;
    edgeCase?: "none" | "no_app_access" | "corporate_account" | "future_move_date" | "already_canceled" | "sameie_concern" | "payment_dispute";
    customerConcerns?: string[];
    hasPaymentIssue?: boolean;
    paymentConcerns?: string[];
    ragContext?: string[];
  }

  export function generateDraftEnhanced(params: DraftParamsEnhanced): string;
}
