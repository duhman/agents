// JS version of webhook to avoid TS types and monorepo type resolution in Vercel
import { randomUUID } from "crypto";
import { waitUntil } from "@vercel/functions";
// @ts-expect-error - compiled output does not ship type definitions
import { processEmail } from "../apps/agent/dist/index.js";
// @ts-expect-error - compiled output does not ship type definitions
import { postReview } from "../apps/slack-bot/dist/index.js";
import { maskPII } from "@agents/core";
export const config = { runtime: "nodejs", regions: ["iad1"] };
const parseErrorMessage = (error) => error instanceof Error ? error.message : String(error);
const log = (level, message, data = {}) => {
    const payload = JSON.stringify({
        level,
        message,
        timestamp: new Date().toISOString(),
        ...data
    });
    if (level === "error") {
        console.error(payload);
    }
    else if (level === "warn") {
        console.warn(payload);
    }
    else {
        console.log(payload);
    }
};
const decodeBasicHtmlEntities = (value) => value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"');
const normalizeEmailBody = (raw) => {
    if (!raw) {
        return "";
    }
    const trimmed = raw.trim();
    if (!trimmed) {
        return "";
    }
    if (!/<[a-z][\s\S]*>/i.test(trimmed)) {
        return decodeBasicHtmlEntities(trimmed);
    }
    const withLineBreaks = trimmed
        .replace(/<\s*br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n\n")
        .replace(/<\/div>/gi, "\n")
        .replace(/<li>/gi, "\n• ")
        .replace(/<\/li>/gi, "")
        .replace(/<[^>]+>/g, "");
    return decodeBasicHtmlEntities(withLineBreaks)
        .replace(/\n{3,}/g, "\n\n")
        .trim();
};
const buildHubSpotTicketUrl = (ticketId) => {
    if (!ticketId) {
        log("debug", "buildHubSpotTicketUrl: no ticketId provided");
        return null;
    }
    const portalId = process.env.HUBSPOT_PORTAL_ID;
    const baseUrl = process.env.HUBSPOT_PORTAL_BASE_URL;
    if (!portalId || !baseUrl) {
        log("warn", "buildHubSpotTicketUrl: missing HubSpot config", {
            hasPortalId: !!portalId,
            hasBaseUrl: !!baseUrl,
            ticketId
        });
        return null;
    }
    const trimmedBase = baseUrl.replace(/\/+$/, "");
    const encodedTicketId = encodeURIComponent(ticketId);
    const generatedUrl = `${trimmedBase}/contacts/${portalId}/record/0-5/${encodedTicketId}`;
    log("debug", "buildHubSpotTicketUrl: URL constructed", {
        ticketId,
        baseUrl: trimmedBase,
        portalId,
        generatedUrl
    });
    return generatedUrl;
};
export default async function handler(req, res) {
    // Start timing for monitoring
    const startTime = Date.now();
    const requestId = randomUUID();
    log("info", "Webhook received", {
        method: req.method,
        url: req.url,
        ua: req.headers["user-agent"],
        requestId
    });
    if (req.method !== "POST") {
        log("warn", "Invalid HTTP method", { method: req.method, requestId });
        res.status(405).json({ error: "Method not allowed" });
        return;
    }
    try {
        // Minimal validation (avoid zod/types at edge)
        const rawPayload = typeof req.body === "string" ? JSON.parse(req.body) : req.body ?? {};
        const body = (rawPayload ?? {});
        const source = typeof body.source === "string" && body.source ? body.source : "hubspot";
        const customerEmail = typeof body.customerEmail === "string" && body.customerEmail
            ? body.customerEmail
            : "masked@example.com";
        // Validate required fields
        const subject = typeof body.subject === "string" ? body.subject : "";
        const rawEmailBody = typeof body.body === "string" && body.body.trim()
            ? body.body
            : typeof body.content === "string"
                ? body.content
                : "";
        const hubspotTicketId = typeof body.ticketID === "string" && body.ticketID.trim().length > 0
            ? body.ticketID.trim()
            : undefined;
        const bodyText = normalizeEmailBody(rawEmailBody);
        if (!subject && !bodyText) {
            res.status(400).json({
                error: "validation: subject and body are required",
                request_id: requestId
            });
            return;
        }
        // Construct rawEmail format for internal processing only
        const rawEmail = subject ? `Subject: ${subject}\n\n${bodyText}` : bodyText;
        log("info", "Request validation successful", {
            source,
            requestId,
            subjectLength: subject.length,
            bodyLength: bodyText.length,
            bodySource: typeof body.body === "string" && body.body.trim()
                ? "body"
                : typeof body.content === "string" && body.content.trim()
                    ? "content"
                    : "none",
            subjectPreview: subject.slice(0, 50),
            bodyPreview: bodyText.slice(0, 50),
            hasTicketId: !!hubspotTicketId,
            ticketId: hubspotTicketId
        });
        // Process email through hybrid processor
        log("info", "Processing email through hybrid processor", { requestId });
        const result = await processEmail({
            source,
            customerEmail,
            rawEmail
        });
        // If draft created, post to Slack for HITM review
        if (result.draft && result.ticket) {
            const slackChannel = process.env.SLACK_REVIEW_CHANNEL;
            if (slackChannel) {
                log("info", "Attempting to post draft to Slack", {
                    requestId,
                    channel: slackChannel,
                    ticketId: result.ticket.id,
                    draftId: result.draft.id,
                    confidence: result.confidence
                });
                // Fire and forget - don't await Slack posting to stay under 5s
                const extraction = typeof result.extraction === "object" && result.extraction !== null
                    ? result.extraction
                    : {};
                // Use original subject/body values directly for Slack display (no masking needed for display)
                const maskedRawEmail = maskPII(rawEmail);
                const displaySubject = subject;
                const displayBody = bodyText;
                const slackPayload = {
                    ticketId: result.ticket.id,
                    draftId: result.draft.id,
                    originalEmail: maskedRawEmail,
                    originalEmailSubject: displaySubject,
                    originalEmailBody: displayBody,
                    draftText: result.draft.draftText,
                    confidence: result.confidence,
                    extraction,
                    channel: slackChannel,
                    hubspotTicketUrl: buildHubSpotTicketUrl(hubspotTicketId) ?? undefined
                };
                log("info", "Slack posting to Slack", {
                    requestId,
                    channel: slackChannel,
                    ticketId: result.ticket.id,
                    draftId: result.draft.id,
                    hubspotTicketUrl: slackPayload.hubspotTicketUrl
                });
                const slackTask = postReview(slackPayload).catch((error) => {
                    log("error", "Slack posting failed", {
                        error: parseErrorMessage(error),
                        requestId,
                        channel: slackChannel,
                        ticketId: result.ticket?.id,
                        draftId: result.draft?.id
                    });
                });
                if (typeof waitUntil === "function") {
                    waitUntil(slackTask);
                }
                else {
                    // Non-Vercel environments: still fire-and-forget without blocking response
                    void slackTask;
                }
            }
            else {
                log("warn", "SLACK_REVIEW_CHANNEL not configured", { requestId });
            }
        }
        else {
            log("warn", "No draft or ticket created, skipping Slack posting", {
                requestId,
                hasDraft: !!result.draft,
                hasTicket: !!result.ticket,
                success: result.success
            });
        }
        const duration = Date.now() - startTime;
        log("info", "Webhook processing completed successfully", {
            duration,
            success: result.success,
            ticketId: result.ticket?.id,
            draftId: result.draft?.id,
            confidence: result.confidence,
            route: result.route,
            requestId
        });
        res.status(200).json({
            success: result.success,
            ticket_id: result.ticket?.id,
            draft_id: result.draft?.id,
            confidence: result.confidence,
            route: result.route,
            request_id: requestId,
            processing_time_ms: duration
        });
    }
    catch (error) {
        const duration = Date.now() - startTime;
        const message = parseErrorMessage(error);
        log("error", "Webhook processing failed", { duration, error: message, requestId });
        // Return appropriate status codes based on error type
        const normalized = message.toLowerCase();
        const statusCode = normalized.includes("quota")
            ? 402
            : normalized.includes("rate limit")
                ? 429
                : normalized.includes("timeout")
                    ? 504
                    : normalized.includes("validation")
                        ? 400
                        : 500;
        res.status(statusCode).json({
            error: message || "Internal server error",
            request_id: requestId,
            processing_time_ms: duration
        });
    }
}
