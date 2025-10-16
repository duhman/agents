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
 * All tool functions have been simplified to regular async functions
 * These are no longer used by the Vercel AI SDK-based agents
 */

// Export empty placeholder functions for backward compatibility
export const maskPiiTool = {};
export const createTicketTool = {};
export const createDraftTool = {};
export const calculateConfidenceTool = {};
export const generateDraftTool = {};
export const postToSlackTool = {};
export const extractEmailDataTool = {};
export const validatePolicyComplianceTool = {};
export const vectorStoreSearchTool = {};
