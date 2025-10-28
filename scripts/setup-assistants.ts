import "dotenv/config";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

interface AssistantSetupConfig {
  name: string;
  model: string;
  temperature: number;
  instructions: string;
}

const extractionConfig: AssistantSetupConfig = {
  name: "Elaway Cancellation Extraction Assistant",
  model: "gpt-4.1",
  temperature: 0,
  instructions: `You are an expert email analyzer for Elaway's customer service automation system.

TASK: Extract structured information from subscription cancellation emails with high accuracy.

ALWAYS search the vector store first for similar customer cases to understand context and patterns.

REQUIRED EXTRACTION FIELDS:
- is_cancellation: true ONLY if customer is clearly requesting subscription cancellation
- reason: "moving" (relocating), "payment_issue" (billing/payment concerns), "other" (different reason), or "unknown" (unclear)
- move_date: ISO date (YYYY-MM-DD) if mentioned, null otherwise
- language: "no" (Norwegian), "en" (English), or "sv" (Swedish)
- edge_case: Identify special cases:
  * "none" - standard cancellation
  * "no_app_access" - customer cannot access app
  * "corporate_account" - business/company account
  * "future_move_date" - moving more than 2 months away
  * "already_canceled" - subscription already ended
  * "sameie_concern" - worried about canceling shared/building account
  * "payment_dispute" - payment disagreement
- urgency: "immediate" (canceling soon), "future" (later), or "unclear"
- customer_concerns: Array of specific customer concerns or questions mentioned
- policy_risks: Array of any ambiguities or compliance risks
- has_payment_issue: true if email mentions payment/billing problems, refunds, charges
- payment_concerns: Array of specific payment issues if applicable
- confidence_factors:
  * clear_intent: Is the cancellation request unambiguous?
  * complete_information: Is all necessary info provided?
  * standard_case: Falls into standard pattern without edge cases?

CLASSIFICATION RULES:
1. First check if this is NOT a cancellation (feedback, support request, general question)
2. Then check for cancellation intent (verbs like "cancel", "terminate", "end subscription")
3. If unclear, set is_cancellation to false and reason to "unknown"

QUALITY CHECKS:
- Search vector store for similar cases to calibrate your analysis
- Look for context clues in customer language and tone
- Identify any policy compliance risks
- Note incomplete information that should be flagged`
};

const responseConfig: AssistantSetupConfig = {
  name: "Elaway Customer Response Assistant",
  model: "gpt-4.1",
  temperature: 0.3,
  instructions: `You are Elaway's customer service assistant for subscription cancellations.

CRITICAL POLICY GUIDELINES:
1. Cancellations take effect at the end of the current month
2. Encourage self-service via the Elaway app: Menu → Manage Subscription → Cancel Subscription
3. Be polite, empathetic, and professional
4. Respond in the customer's language (Norwegian, English, or Swedish)
5. Address specific customer concerns with relevant information
6. For payment issues: acknowledge the concern, offer to investigate, reference any relevant policies
7. For app access issues: offer manual assistance and explain how to verify identity
8. For sameie concerns: clarify that canceling personal subscription only affects their account
9. Keep responses concise (70-120 words, 4-6 sentences) but ensure all policy points are covered
10. Never confirm addresses or personal details unless customer provided them first (GDPR)

ALWAYS search the vector store for:
- Similar customer cases and how they were successfully resolved
- Relevant policy information specific to edge cases
- Payment handling procedures if applicable
- Successful response examples in the customer's language
- Common concerns and best-practice responses

RESPONSE STRUCTURE:
1. Greeting (address customer's situation)
2. Acknowledge their specific concern (moving, payment issue, app problem, etc.)
3. Provide clear guidance:
   - For standard cases: direct app self-service instructions
   - For app access: offer manual help and next steps
   - For payment issues: explain investigation process
   - For edge cases: provide specific guidance from vector store examples
4. State cancellation policy: "Cancellation takes effect at the end of the current month"
5. Offer additional assistance if needed
6. Professional closing with company branding

TONE:
- Empathetic and understanding
- Professional but friendly
- Proactive in addressing concerns
- Avoid generic responses - personalize based on customer context

LANGUAGE REQUIREMENTS:
- Norwegian: Use formal "du" form, standard business Norwegian
- English: Professional business English
- Swedish: Use standard Swedish business tone

DO NOT:
- Commit to specific refunds or compensation without investigating
- Confirm addresses or personal details the customer didn't provide
- Make promises about timing beyond "end of current month"
- Include signature with personal name (use "Elaway Support")
- Use template phrases - customize each response based on customer context`
};

async function getOrCreateAssistant(
  config: AssistantSetupConfig,
  vectorStoreId: string,
  existingId?: string
): Promise<string> {
  // If ID provided, update existing assistant
  if (existingId) {
    console.log(`\nUpdating existing assistant: ${existingId}`);
    try {
      const updated = await openai.beta.assistants.update(existingId, {
        name: config.name,
        model: config.model,
        temperature: config.temperature,
        instructions: config.instructions,
        tools: [{ type: "file_search" }],
        tool_resources: {
          file_search: {
            vector_store_ids: [vectorStoreId]
          }
        }
      });
      console.log(`✓ Assistant updated: ${updated.id}`);
      return updated.id;
    } catch (error: any) {
      console.error(`✗ Failed to update assistant: ${error.message}`);
      throw error;
    }
  }

  // Check if assistant with same name already exists to prevent duplicates
  console.log(`\nChecking for existing assistant: ${config.name}`);
  try {
    const existingAssistants = await openai.beta.assistants.list();
    const duplicate = existingAssistants.data.find(a => a.name === config.name);
    
    if (duplicate) {
      console.log(`⚠ Found existing assistant with same name: ${duplicate.id}`);
      console.log(`\nTo update this assistant, set the environment variable:`);
      console.log(`export OPENAI_${config.name.toUpperCase().replace(/\s/g, '_')}_ASSISTANT_ID=${duplicate.id}`);
      console.log(`Then re-run this script.\n`);
      throw new Error(
        `Assistant "${config.name}" already exists with ID: ${duplicate.id}. ` +
        `To reuse it, set OPENAI_EXTRACTION_ASSISTANT_ID or OPENAI_RESPONSE_ASSISTANT_ID environment variable.`
      );
    }
  } catch (error: any) {
    if (error.message.includes("already exists")) {
      throw error;
    }
    // Continue if list fails (might be permission issue), proceed to create
    console.log(`⚠ Could not check existing assistants: ${error.message}`);
  }

  // Create new assistant
  console.log(`Creating assistant: ${config.name}`);
  try {
    const assistant = await openai.beta.assistants.create({
      name: config.name,
      model: config.model,
      temperature: config.temperature,
      instructions: config.instructions,
      tools: [{ type: "file_search" }],
      tool_resources: {
        file_search: {
          vector_store_ids: [vectorStoreId]
        }
      }
    });
    console.log(`✓ Assistant created: ${assistant.id}`);
    return assistant.id;
  } catch (error: any) {
    console.error(`✗ Failed to create assistant: ${error.message}`);
    throw error;
  }
}

async function main() {
  console.log("=".repeat(60));
  console.log("OpenAI Assistants Setup");
  console.log("=".repeat(60));
  console.log("\nThis script creates persistent assistants (one-time setup).");
  console.log("If assistants already exist, they will NOT be recreated.\n");

  // Validate environment variables
  const apiKey = process.env.OPENAI_API_KEY;
  const vectorStoreId = process.env.OPENAI_VECTOR_STORE_ID;

  if (!apiKey) {
    console.error("✗ OPENAI_API_KEY environment variable is required");
    process.exit(1);
  }

  if (!vectorStoreId) {
    console.error("✗ OPENAI_VECTOR_STORE_ID environment variable is required");
    process.exit(1);
  }

  // Check for existing assistant IDs (for updates)
  const existingExtractionId = process.env.OPENAI_EXTRACTION_ASSISTANT_ID;
  const existingResponseId = process.env.OPENAI_RESPONSE_ASSISTANT_ID;

  if (existingExtractionId || existingResponseId) {
    console.log("Found existing assistant IDs in environment:");
    if (existingExtractionId) console.log(`  - Extraction: ${existingExtractionId}`);
    if (existingResponseId) console.log(`  - Response: ${existingResponseId}`);
    console.log("These will be updated with new configurations.\n");
  }

  try {
    // Create/update extraction assistant
    const extractionId = await getOrCreateAssistant(
      extractionConfig,
      vectorStoreId,
      existingExtractionId
    );

    // Create/update response assistant
    const responseId = await getOrCreateAssistant(
      responseConfig,
      vectorStoreId,
      existingResponseId
    );

    console.log("\n" + "=".repeat(60));
    console.log("Setup Complete!");
    console.log("=".repeat(60));
    console.log("\nAdd these environment variables to your .env file:\n");
    console.log(`OPENAI_EXTRACTION_ASSISTANT_ID=${extractionId}`);
    console.log(`OPENAI_RESPONSE_ASSISTANT_ID=${responseId}`);
    console.log("\nFor production deployment, add to Vercel environment:\n");
    console.log("vercel env add OPENAI_EXTRACTION_ASSISTANT_ID");
    console.log("vercel env add OPENAI_RESPONSE_ASSISTANT_ID");
    console.log("\nDuplicate Prevention:");
    console.log("- These assistant IDs are persistent and reused forever");
    console.log("- Running this script again will UPDATE, not recreate assistants");
    console.log("- New assistants will NOT be created if these IDs are set");
    console.log("\n" + "=".repeat(60));
  } catch (error: any) {
    console.error("\n✗ Setup failed:", error.message);
    process.exit(1);
  }
}

main();
