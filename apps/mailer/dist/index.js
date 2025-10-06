import "dotenv/config";
import nodemailer from "nodemailer";
import { envSchema } from "@agents/core";
const env = envSchema.parse(process.env);
/**
 * Send email via HubSpot Conversations (if threadId provided) or SMTP
 */
export async function sendEmail(params) {
    const { to, subject, body, threadId } = params;
    if (threadId && env.HUBSPOT_ACCESS_TOKEN) {
        // Reply in HubSpot conversation thread
        await sendViaHubSpot(threadId, body);
    }
    else {
        // Fallback to SMTP
        await sendViaSMTP({ to, subject, body });
    }
}
async function sendViaHubSpot(threadId, body) {
    if (!env.HUBSPOT_ACCESS_TOKEN) {
        throw new Error("HUBSPOT_ACCESS_TOKEN not configured");
    }
    const response = await fetch(`https://api.hubapi.com/conversations/v3/conversations/threads/${threadId}/messages`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${env.HUBSPOT_ACCESS_TOKEN}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            type: "MESSAGE",
            text: body,
            senders: [
                {
                    actorId: "AGENT",
                    deliveryIdentifier: {
                        type: "HS_EMAIL_ADDRESS",
                        value: "support@elaway.com" // Configure your support email
                    }
                }
            ]
        })
    });
    if (!response.ok) {
        const error = await response.text();
        throw new Error(`HubSpot API error: ${response.status} ${error}`);
    }
    console.log(`✓ Sent via HubSpot thread ${threadId}`);
}
async function sendViaSMTP(params) {
    // Configure your SMTP provider (e.g., SendGrid, Mailgun, Gmail)
    // For development, use Ethereal (test account)
    const testAccount = await nodemailer.createTestAccount();
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || testAccount.smtp.host,
        port: parseInt(process.env.SMTP_PORT || String(testAccount.smtp.port)),
        secure: process.env.SMTP_SECURE === "true" || testAccount.smtp.secure,
        auth: {
            user: process.env.SMTP_USER || testAccount.user,
            pass: process.env.SMTP_PASS || testAccount.pass
        }
    });
    const info = await transporter.sendMail({
        from: process.env.SMTP_FROM || '"Elaway Support" <support@elaway.com>',
        to: params.to,
        subject: params.subject,
        text: params.body
    });
    console.log(`✓ Sent via SMTP: ${info.messageId}`);
    if (process.env.NODE_ENV !== "production") {
        console.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    }
}
// Example usage
if (import.meta.url === `file://${process.argv[1]}`) {
    sendEmail({
        to: "customer@example.com",
        subject: "Re: Subscription Cancellation",
        body: "Takk for din henvendelse. Oppsigelsen er registrert."
    })
        .then(() => console.log("✓ Email sent"))
        .catch(err => {
        console.error("✗ Error:", err);
        process.exit(1);
    });
}
