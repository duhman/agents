import { getSlackRetryQueueStatus, processSlackRetryQueue } from "../apps/slack-bot/dist/index.js";
export const config = { runtime: "nodejs", regions: ["iad1"] };
async function checkSlackAPIHealth() {
    const startTime = Date.now();
    try {
        const token = process.env.SLACK_BOT_TOKEN;
        if (!token) {
            return {
                reachable: false,
                responseTime: Date.now() - startTime,
                error: "SLACK_BOT_TOKEN not configured",
                timestamp: Date.now()
            };
        }
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
export default async function handler(req, res) {
    if (req.method !== "GET") {
        res.status(405).json({ error: "Method not allowed" });
        return;
    }
    try {
        const [slackHealth, retryQueueStatus] = await Promise.all([
            checkSlackAPIHealth(),
            Promise.resolve(getSlackRetryQueueStatus())
        ]);
        // Process retry queue if there are items
        if (retryQueueStatus.count > 0) {
            try {
                await processSlackRetryQueue();
            }
            catch (error) {
                console.error("Error processing retry queue:", error);
            }
        }
        const health = {
            status: "healthy",
            timestamp: new Date().toISOString(),
            services: {
                slack: {
                    reachable: slackHealth.reachable,
                    responseTime: slackHealth.responseTime,
                    statusCode: slackHealth.statusCode,
                    error: slackHealth.error,
                    lastChecked: new Date(slackHealth.timestamp).toISOString()
                }
            },
            retryQueue: retryQueueStatus
        };
        res.status(200).json(health);
    }
    catch (error) {
        console.error("Health check error:", error);
        res.status(500).json({
            status: "unhealthy",
            timestamp: new Date().toISOString(),
            error: error?.message || String(error)
        });
    }
}
