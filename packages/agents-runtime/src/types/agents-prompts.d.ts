declare module "@agents/prompts" {
  import type { z } from "zod";

  export interface ExtractionResult {
    is_cancellation: boolean;
    reason: "moving" | "other" | "unknown";
    move_date?: string | null;
    language: "no" | "en";
    policy_risks: string[];
  }

  export const extractionSchema: z.ZodObject<Record<string, z.ZodTypeAny>>;

  export const systemPolicyNO: string;
  export const systemPolicyEN: string;
  export const extractionPrompt: (email: string) => string;

  export interface DraftParams {
    language: "no" | "en";
    reason: string;
    moveDate?: string | null;
    customerName?: string;
  }

  export function generateDraft(params: DraftParams): string;
}
