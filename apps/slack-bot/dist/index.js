import "dotenv/config";
import { envSchema } from "@agents/core";
const SUBJECT_MAX_LENGTH = 250;
function getEnv() {
    // Parse lazily to avoid throwing during module import in serverless functions
    return envSchema.parse(process.env);
}
async function testSlackConnectivity(token) {
    const startTime = Date.now();
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const res = await fetch("https://slack.com/api/auth.test", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            signal: controller.signal
        });
        clearTimeout(timeout);
        const responseTime = Date.now() - startTime;
        const result = await res.json();
        return {
            reachable: result.ok === true,
            responseTime,
            statusCode: res.status,
            timestamp: Date.now(),
            error: result.ok ? undefined : result.error
        };
    }
    catch (error) {
        const responseTime = Date.now() - startTime;
        return {
            reachable: false,
            responseTime,
            timestamp: Date.now(),
            error: error?.message || String(error)
        };
    }
}
// Simple in-memory retry queue (in production, use Redis or database)
const slackRetryQueue = [];
async function queueSlackRetry(params) {
    const retryItem = {
        ...params,
        retryCount: 0,
        nextRetryAt: Date.now() + 5 * 60 * 1000, // 5 minutes from now
        createdAt: Date.now()
    };
    slackRetryQueue.push(retryItem);
    console.log(JSON.stringify({
        level: "info",
        message: "Queued Slack post for retry",
        timestamp: new Date().toISOString(),
        ticketId: params.ticketId,
        draftId: params.draftId,
        retryCount: retryItem.retryCount,
        nextRetryAt: new Date(retryItem.nextRetryAt).toISOString()
    }));
}
async function processRetryQueue() {
    const now = Date.now();
    const itemsToRetry = slackRetryQueue.filter(item => item.nextRetryAt <= now && item.retryCount < 3);
    for (const item of itemsToRetry) {
        try {
            console.log(JSON.stringify({
                level: "info",
                message: "Processing Slack retry queue item",
                timestamp: new Date().toISOString(),
                ticketId: item.ticketId,
                draftId: item.draftId,
                retryCount: item.retryCount
            }));
            // Test connectivity before retry
            const slackHealth = await testSlackConnectivity(process.env.SLACK_BOT_TOKEN || "");
            if (!slackHealth.reachable) {
                // Update retry time and continue
                item.retryCount++;
                item.nextRetryAt = Date.now() + (5 * 60 * 1000 * Math.pow(2, item.retryCount)); // Exponential backoff
                continue;
            }
            // Attempt to post to Slack
            const result = await postReview(item);
            if (result.ok) {
                // Remove from queue on success
                const index = slackRetryQueue.indexOf(item);
                if (index > -1) {
                    slackRetryQueue.splice(index, 1);
                }
                console.log(JSON.stringify({
                    level: "info",
                    message: "Slack retry successful - removed from queue",
                    timestamp: new Date().toISOString(),
                    ticketId: item.ticketId,
                    draftId: item.draftId,
                    retryCount: item.retryCount
                }));
            }
            else {
                // Increment retry count
                item.retryCount++;
                item.nextRetryAt = Date.now() + (5 * 60 * 1000 * Math.pow(2, item.retryCount));
            }
        }
        catch (error) {
            console.error(JSON.stringify({
                level: "error",
                message: "Slack retry failed",
                timestamp: new Date().toISOString(),
                ticketId: item.ticketId,
                draftId: item.draftId,
                retryCount: item.retryCount,
                error: error?.message || String(error)
            }));
            item.retryCount++;
            item.nextRetryAt = Date.now() + (5 * 60 * 1000 * Math.pow(2, item.retryCount));
        }
    }
    // Remove items that have exceeded max retries
    const maxRetries = 3;
    const itemsToRemove = slackRetryQueue.filter(item => item.retryCount >= maxRetries);
    for (const item of itemsToRemove) {
        const index = slackRetryQueue.indexOf(item);
        if (index > -1) {
            slackRetryQueue.splice(index, 1);
        }
        console.error(JSON.stringify({
            level: "error",
            message: "Slack retry exhausted - removed from queue",
            timestamp: new Date().toISOString(),
            ticketId: item.ticketId,
            draftId: item.draftId,
            finalRetryCount: item.retryCount
        }));
    }
}
export async function postReview(params) {
    const { ticketId, draftId, originalEmail, originalEmailSubject, originalEmailBody, draftText, confidence, extraction, channel, hubspotTicketUrl } = params;
    console.log(JSON.stringify({
        level: "debug",
        message: "postReview: Slack message construction started",
        timestamp: new Date().toISOString(),
        ticketId,
        draftId,
        channel,
        hasHubSpotUrl: !!hubspotTicketUrl,
        hubspotTicketUrl
    }));
    console.log(JSON.stringify({
        level: "info",
        message: "postReview called",
        timestamp: new Date().toISOString(),
        ticketId,
        draftId,
        channel,
        confidence,
        draftTextLength: draftText?.length || 0
    }));
    const env = getEnv();
    if (!env.SLACK_BOT_TOKEN) {
        throw new Error("SLACK_BOT_TOKEN is required");
    }
    // Test Slack connectivity first with detailed health check
    const slackHealth = await testSlackConnectivity(env.SLACK_BOT_TOKEN);
    console.log(JSON.stringify({
        level: "info",
        message: "Slack API health check",
        timestamp: new Date().toISOString(),
        ticketId,
        draftId,
        reachable: slackHealth.reachable,
        responseTime: slackHealth.responseTime,
        statusCode: slackHealth.statusCode,
        error: slackHealth.error
    }));
    if (!slackHealth.reachable) {
        console.error(JSON.stringify({
            level: "error",
            message: "Slack API is not reachable - queuing for retry",
            timestamp: new Date().toISOString(),
            ticketId,
            draftId,
            healthCheck: slackHealth
        }));
        // Queue for retry instead of failing immediately
        await queueSlackRetry(params);
        return { ok: true, error: "slack_unreachable_queued", ts: Date.now().toString() };
    }
    const maxAttempts = 2; // Reduced attempts to avoid long delays
    const baseDelayMs = 500; // Shorter delays
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 8000); // Reduced to 8 seconds
            const result = await fetch("https://slack.com/api/chat.postMessage", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json; charset=utf-8",
                    Authorization: `Bearer ${env.SLACK_BOT_TOKEN}`
                },
                body: JSON.stringify({
                    channel,
                    text: `Draft Review Required – ${(confidence * 100).toFixed(0)}% confidence, language: ${extraction.language || "unknown"}`,
                    blocks: [
                        {
                            type: "header",
                            text: {
                                type: "plain_text",
                                text: "🤖 Draft Review Required"
                            }
                        },
                        ...(hubspotTicketUrl
                            ? (console.log(JSON.stringify({
                                level: "debug",
                                message: "postReview: Including HubSpot ticket link block",
                                timestamp: new Date().toISOString(),
                                ticketId,
                                draftId,
                                url: hubspotTicketUrl
                            })), [
                                {
                                    type: "section",
                                    text: {
                                        type: "mrkdwn",
                                        text: `*HubSpot ticket:* <${hubspotTicketUrl}|HubSpot ticket>`
                                    }
                                }
                            ])
                            : (console.log(JSON.stringify({
                                level: "debug",
                                message: "postReview: Skipping HubSpot link - no URL provided",
                                timestamp: new Date().toISOString(),
                                ticketId,
                                draftId,
                                reason: "hubspotTicketUrl is falsy"
                            })), [])),
                        // Show payment concerns and customer concerns if they exist
                        ...(extraction.payment_concerns && extraction.payment_concerns.length > 0 ? [{
                                type: "section",
                                text: {
                                    type: "mrkdwn",
                                    text: `*💳 Payment Concerns:* ${extraction.payment_concerns.join(", ")}`
                                }
                            }] : []),
                        ...(extraction.customer_concerns && extraction.customer_concerns.length > 0 ? [{
                                type: "section",
                                text: {
                                    type: "mrkdwn",
                                    text: `*🤔 Customer Concerns:* ${extraction.customer_concerns.join(", ")}`
                                }
                            }] : []),
                        {
                            type: "section",
                            text: {
                                type: "mrkdwn",
                                text: `*Original Email – Subject:*\n${(originalEmailSubject ?? (originalEmail?.split("\n")[0] ?? "")).slice(0, SUBJECT_MAX_LENGTH)}`
                            }
                        },
                        {
                            type: "section",
                            text: {
                                type: "mrkdwn",
                                text: (() => {
                                    const body = originalEmailBody ?? originalEmail ?? "";
                                    const MAX = 2900;
                                    const safeBody = body.length > MAX ? body.slice(0, MAX) + "\n…[truncated]" : body;
                                    return `*Original Email – Body:*\n\`\`\`${safeBody}\`\`\``;
                                })()
                            }
                        },
                        {
                            type: "section",
                            text: {
                                type: "mrkdwn",
                                text: `*Draft Reply:*\n\`\`\`${draftText}\`\`\``
                            }
                        },
                        {
                            type: "actions",
                            block_id: "review_actions",
                            elements: [
                                {
                                    type: "button",
                                    text: {
                                        type: "plain_text",
                                        text: "✅ Approve"
                                    },
                                    style: "primary",
                                    action_id: "approve",
                                    value: JSON.stringify({ ticketId, draftId, draftText })
                                },
                                {
                                    type: "button",
                                    text: {
                                        type: "plain_text",
                                        text: "✏️ Edit"
                                    },
                                    action_id: "edit",
                                    value: JSON.stringify({ ticketId, draftId, draftText })
                                },
                                {
                                    type: "button",
                                    text: {
                                        type: "plain_text",
                                        text: "❌ Reject"
                                    },
                                    style: "danger",
                                    action_id: "reject",
                                    value: JSON.stringify({ ticketId, draftId })
                                }
                            ]
                        }
                    ]
                }),
                signal: controller.signal
            });
            clearTimeout(timeout);
            if (!result.ok) {
                const errorText = await result.text();
                throw new Error(`Slack API error: ${result.status} ${errorText}`);
            }
            const response = await result.json();
            if (!response.ok) {
                throw new Error(`Slack API error: ${response.error}`);
            }
            console.log(JSON.stringify({
                level: "info",
                message: "Slack postReview successful",
                timestamp: new Date().toISOString(),
                ticketId,
                draftId,
                channel,
                messageTs: response.ts,
                attempt,
                includedHubSpotLink: !!hubspotTicketUrl
            }));
            return response;
        }
        catch (e) {
            const msg = e?.data?.error || e?.message || String(e);
            const isAbort = e?.name === "AbortError" || msg.includes("aborted");
            const canRetry = isAbort || /fetch failed|ECONNRESET|ENOTFOUND|EAI_AGAIN|TLS|ETIMEDOUT/i.test(msg);
            console.error(JSON.stringify({
                level: "error",
                message: "Slack postReview attempt failed",
                timestamp: new Date().toISOString(),
                error: msg,
                ticketId,
                draftId,
                attempt,
                canRetry,
                isAbort
            }));
            if (canRetry && attempt < maxAttempts) {
                const delay = baseDelayMs * Math.pow(2, attempt - 1);
                console.log(JSON.stringify({
                    level: "info",
                    message: "Retrying Slack postReview",
                    timestamp: new Date().toISOString(),
                    ticketId,
                    draftId,
                    attempt: attempt + 1,
                    delayMs: delay
                }));
                await new Promise(r => setTimeout(r, delay));
                continue;
            }
            // If all retries failed, log the error but don't throw - this is non-critical
            console.error(JSON.stringify({
                level: "error",
                message: "Slack postReview failed after all retries - continuing without Slack notification",
                timestamp: new Date().toISOString(),
                error: msg,
                ticketId,
                draftId,
                finalAttempt: attempt
            }));
            // Return a mock success response to avoid breaking the webhook flow
            return { ok: true, error: "slack_timeout", ts: Date.now().toString() };
        }
    }
    // This should never be reached due to the return above, but just in case
    console.error(JSON.stringify({
        level: "error",
        message: "Slack postReview exhausted retries - continuing without Slack notification",
        timestamp: new Date().toISOString(),
        ticketId,
        draftId
    }));
    return { ok: true, error: "slack_timeout", ts: Date.now().toString() };
}
// Export function to process retry queue (call this periodically)
export async function processSlackRetryQueue() {
    await processRetryQueue();
}
// Export function to get retry queue status
export function getSlackRetryQueueStatus() {
    return {
        count: slackRetryQueue.length,
        items: slackRetryQueue.map(item => ({
            ticketId: item.ticketId,
            draftId: item.draftId,
            retryCount: item.retryCount,
            nextRetryAt: item.nextRetryAt
        }))
    };
}
