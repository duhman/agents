import { db } from "./client.js";
import { tickets, drafts, humanReviews, agentWorkflows, agentExecutions, agentTriggers, agentApprovals, slackRetryQueue } from "./schema.js";
import { eq, desc, and, lte } from "drizzle-orm";
export async function createTicket(data) {
    const [ticket] = await db
        .insert(tickets)
        .values({
        ...data,
        moveDate: data.moveDate?.toISOString().split("T")[0] // Convert Date to YYYY-MM-DD string
    })
        .returning();
    return ticket;
}
export async function createDraft(data) {
    const [draft] = await db.insert(drafts).values(data).returning();
    return draft;
}
export async function createHumanReview(data) {
    const [review] = await db.insert(humanReviews).values(data).returning();
    return review;
}
export async function getTicketById(id) {
    return db.query.tickets.findFirst({
        where: eq(tickets.id, id)
    });
}
export async function getDraftById(id) {
    return db.query.drafts.findFirst({
        where: eq(drafts.id, id)
    });
}
export async function createWorkflow(data) {
    const [workflow] = await db
        .insert(agentWorkflows)
        .values({
        ...data,
        nodes: data.nodes || [],
        edges: data.edges || [],
        configuration: data.configuration || {}
    })
        .returning();
    return workflow;
}
export async function updateWorkflow(id, data) {
    const [workflow] = await db
        .update(agentWorkflows)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(agentWorkflows.id, id))
        .returning();
    return workflow;
}
export async function getWorkflowById(id) {
    return db.query.agentWorkflows.findFirst({
        where: eq(agentWorkflows.id, id)
    });
}
export async function listWorkflows() {
    return db.query.agentWorkflows.findMany({
        orderBy: [desc(agentWorkflows.updatedAt)]
    });
}
export async function deleteWorkflow(id) {
    await db.delete(agentWorkflows).where(eq(agentWorkflows.id, id));
}
export async function createExecution(data) {
    const [execution] = await db
        .insert(agentExecutions)
        .values({
        ...data,
        triggerData: data.triggerData || {},
        status: 'running'
    })
        .returning();
    return execution;
}
export async function updateExecution(id, data) {
    const [execution] = await db
        .update(agentExecutions)
        .set(data)
        .where(eq(agentExecutions.id, id))
        .returning();
    return execution;
}
export async function getExecutionById(id) {
    return db.query.agentExecutions.findFirst({
        where: eq(agentExecutions.id, id)
    });
}
export async function listExecutions(workflowId) {
    if (workflowId) {
        return db.query.agentExecutions.findMany({
            where: eq(agentExecutions.workflowId, workflowId),
            orderBy: [desc(agentExecutions.startTime)]
        });
    }
    return db.query.agentExecutions.findMany({
        orderBy: [desc(agentExecutions.startTime)]
    });
}
export async function createTrigger(data) {
    const [trigger] = await db
        .insert(agentTriggers)
        .values({
        ...data,
        configuration: data.configuration || {}
    })
        .returning();
    return trigger;
}
export async function updateTrigger(id, data) {
    const [trigger] = await db
        .update(agentTriggers)
        .set(data)
        .where(eq(agentTriggers.id, id))
        .returning();
    return trigger;
}
export async function getTriggerById(id) {
    return db.query.agentTriggers.findFirst({
        where: eq(agentTriggers.id, id)
    });
}
export async function listTriggers(workflowId) {
    return db.query.agentTriggers.findMany({
        where: eq(agentTriggers.workflowId, workflowId)
    });
}
export async function deleteTrigger(id) {
    await db.delete(agentTriggers).where(eq(agentTriggers.id, id));
}
export async function createApproval(data) {
    const [approval] = await db
        .insert(agentApprovals)
        .values({
        ...data,
        status: 'pending'
    })
        .returning();
    return approval;
}
export async function updateApproval(id, data) {
    const [approval] = await db
        .update(agentApprovals)
        .set(data)
        .where(eq(agentApprovals.id, id))
        .returning();
    return approval;
}
export async function getApprovalById(id) {
    return db.query.agentApprovals.findFirst({
        where: eq(agentApprovals.id, id)
    });
}
export async function listPendingApprovals() {
    return db.query.agentApprovals.findMany({
        where: eq(agentApprovals.status, 'pending'),
        orderBy: [desc(agentApprovals.createdAt)]
    });
}
// Slack Retry Queue Management
export async function createSlackRetryQueueItem(data) {
    const [item] = await db
        .insert(slackRetryQueue)
        .values({
        ...data,
        retryCount: data.retryCount || '0',
        status: 'pending'
    })
        .returning();
    return item;
}
export async function getSlackRetryQueueItemsToProcess(maxRetries = 3) {
    const now = new Date();
    return db.query.slackRetryQueue.findMany({
        where: and(eq(slackRetryQueue.status, 'pending'), lte(slackRetryQueue.nextRetryAt, now)),
        orderBy: [slackRetryQueue.nextRetryAt]
    }).then(items => items.filter(item => parseInt(item.retryCount.toString()) < maxRetries));
}
export async function claimSlackRetryQueueItem(id) {
    const [item] = await db
        .update(slackRetryQueue)
        .set({ status: 'processing', updatedAt: new Date() })
        .where(and(eq(slackRetryQueue.id, id), eq(slackRetryQueue.status, 'pending')))
        .returning();
    return item ?? null;
}
export async function updateSlackRetryQueueItem(id, data) {
    const [item] = await db
        .update(slackRetryQueue)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(slackRetryQueue.id, id))
        .returning();
    return item;
}
export async function deleteSlackRetryQueueItem(id) {
    await db.delete(slackRetryQueue).where(eq(slackRetryQueue.id, id));
}
export async function getSlackRetryQueueStats() {
    const items = await db.query.slackRetryQueue.findMany();
    const stats = {
        count: items.length,
        pending: items.filter(i => i.status === 'pending').length,
        processing: items.filter(i => i.status === 'processing').length,
        succeeded: items.filter(i => i.status === 'succeeded').length,
        failed: items.filter(i => i.status === 'failed').length,
        byRetryCount: {}
    };
    items.forEach(item => {
        const count = parseInt(item.retryCount.toString());
        stats.byRetryCount[count] = (stats.byRetryCount[count] || 0) + 1;
    });
    return stats;
}
//# sourceMappingURL=repositories.js.map