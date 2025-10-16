import { z } from "zod";
import { maskPII, logInfo, logError, type LogContext } from "@agents/core";
import { createTicket, createDraft } from "@agents/db";
import { generateDraftEnhanced } from "@agents/prompts";
import OpenAI from "openai";
import { emitArtifact } from "./observability/artifacts.js";

/**
 * Note: Tools are no longer needed with Vercel AI SDK migration.
 * The hybrid processor uses direct database calls and OpenAI API instead of agent tools.
 * These definitions are kept for backward compatibility but are not actively used.
 */

type ConfidenceFactors = {
  is_cancellation: boolean;
  reason_known: boolean;
  has_move_date: boolean;
  no_policy_risks: boolean;
};

/**
 * DEPRECATED: These tool definitions are no longer used with Vercel AI SDK.
 * The hybrid processor uses direct database calls and OpenAI API instead.
 * 
 * If you're seeing errors importing these tools, please migrate to:
 * - Import processEmailHybrid from '@agents/runtime/hybrid-processor' instead
 * - Use direct function calls from '@agents/db' and '@agents/prompts' packages
 */

function createDeprecatedTool(toolName: string) {
  return new Proxy({}, {
    get() {
      throw new Error(
        `${toolName} has been deprecated. The agents have been migrated to Vercel AI SDK. ` +
        `Please use processEmailHybrid() from '@agents/runtime/hybrid-processor' instead. ` +
        `See documentation for migration guide.`
      );
    }
  });
}

export const maskPiiTool = createDeprecatedTool('maskPiiTool');
export const createTicketTool = createDeprecatedTool('createTicketTool');
export const createDraftTool = createDeprecatedTool('createDraftTool');
export const calculateConfidenceTool = createDeprecatedTool('calculateConfidenceTool');
export const generateDraftTool = createDeprecatedTool('generateDraftTool');
export const postToSlackTool = createDeprecatedTool('postToSlackTool');
export const extractEmailDataTool = createDeprecatedTool('extractEmailDataTool');
export const validatePolicyComplianceTool = createDeprecatedTool('validatePolicyComplianceTool');
export const vectorStoreSearchTool = createDeprecatedTool('vectorStoreSearchTool');
