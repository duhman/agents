import "dotenv/config";
import { App } from "@slack/bolt";
import { envSchema } from "@agents/core";
import { createHumanReview } from "@agents/db";
const env = envSchema.parse(process.env);
if (!env.SLACK_BOT_TOKEN || !env.SLACK_SIGNING_SECRET) {
    throw new Error("SLACK_BOT_TOKEN and SLACK_SIGNING_SECRET are required");
}
const app = new App({
    token: env.SLACK_BOT_TOKEN,
    signingSecret: env.SLACK_SIGNING_SECRET
});
export async function postReview(params) {
    const { ticketId, draftId, originalEmail, draftText, confidence, extraction, channel } = params;
    const result = await app.client.chat.postMessage({
        channel,
        blocks: [
            {
                type: "header",
                text: {
                    type: "plain_text",
                    text: "🤖 Draft Review Required"
                }
            },
            {
                type: "section",
                fields: [
                    {
                        type: "mrkdwn",
                        text: `*Confidence:* ${(confidence * 100).toFixed(0)}%`
                    },
                    {
                        type: "mrkdwn",
                        text: `*Language:* ${extraction.language || "unknown"}`
                    },
                    {
                        type: "mrkdwn",
                        text: `*Reason:* ${extraction.reason || "unknown"}`
                    },
                    {
                        type: "mrkdwn",
                        text: `*Move Date:* ${extraction.move_date || "N/A"}`
                    }
                ]
            },
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `*Original Email (masked):*\n\`\`\`${originalEmail}\`\`\``
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
    });
    return result;
}
// Approve action
app.action("approve", async ({ ack, body, client }) => {
    await ack();
    const value = JSON.parse(body.actions[0].value);
    const { ticketId, draftId, draftText } = value;
    const userId = body.user.id;
    // Store human review
    await createHumanReview({
        ticketId,
        draftId,
        decision: "approve",
        finalText: draftText,
        reviewerSlackId: userId
    });
    // Update message
    await client.chat.update({
        channel: body.channel.id,
        ts: body.message.ts,
        text: "Draft approved",
        blocks: [
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `✅ *Approved* by <@${userId}>\n\nReply will be sent to customer.`
                }
            }
        ]
    });
    // TODO: trigger mailer to send
    console.log(`Approved: ticket=${ticketId}, draft=${draftId}`);
});
// Edit action (opens modal)
app.action("edit", async ({ ack, body, client }) => {
    await ack();
    const value = JSON.parse(body.actions[0].value);
    const { ticketId, draftId, draftText } = value;
    await client.views.open({
        trigger_id: body.trigger_id,
        view: {
            type: "modal",
            callback_id: "edit_modal",
            private_metadata: JSON.stringify({ ticketId, draftId, channelId: body.channel.id, messageTs: body.message.ts }),
            title: {
                type: "plain_text",
                text: "Edit Draft"
            },
            submit: {
                type: "plain_text",
                text: "Send"
            },
            close: {
                type: "plain_text",
                text: "Cancel"
            },
            blocks: [
                {
                    type: "input",
                    block_id: "final_text_block",
                    label: {
                        type: "plain_text",
                        text: "Final Reply"
                    },
                    element: {
                        type: "plain_text_input",
                        action_id: "final_text",
                        multiline: true,
                        initial_value: draftText
                    }
                }
            ]
        }
    });
});
// Modal submission
app.view("edit_modal", async ({ ack, body, view, client }) => {
    await ack();
    const metadata = JSON.parse(view.private_metadata);
    const { ticketId, draftId, channelId, messageTs } = metadata;
    const userId = body.user.id;
    const finalText = view.state.values.final_text_block.final_text.value || "";
    // Store human review
    await createHumanReview({
        ticketId,
        draftId,
        decision: "edit",
        finalText,
        reviewerSlackId: userId
    });
    // Update original message
    await client.chat.update({
        channel: channelId,
        ts: messageTs,
        text: "Draft edited and approved",
        blocks: [
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `✏️ *Edited* by <@${userId}>\n\nCustom reply will be sent.`
                }
            }
        ]
    });
    // TODO: trigger mailer to send edited version
    console.log(`Edited: ticket=${ticketId}, draft=${draftId}`);
});
// Reject action
app.action("reject", async ({ ack, body, client }) => {
    await ack();
    const value = JSON.parse(body.actions[0].value);
    const { ticketId, draftId } = value;
    const userId = body.user.id;
    // Store human review
    await createHumanReview({
        ticketId,
        draftId,
        decision: "reject",
        finalText: "",
        reviewerSlackId: userId
    });
    // Update message
    await client.chat.update({
        channel: body.channel.id,
        ts: body.message.ts,
        text: "Draft rejected",
        blocks: [
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `❌ *Rejected* by <@${userId}>\n\nNo automated reply will be sent.`
                }
            }
        ]
    });
    console.log(`Rejected: ticket=${ticketId}, draft=${draftId}`);
});
// Start server
const port = process.env.PORT || 3000;
await app.start(port);
console.log(`⚡️ Slack bot running on port ${port}`);
