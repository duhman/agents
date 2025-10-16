import { db } from "./client.js";
import { tickets, drafts, humanReviews, agentWorkflows, agentExecutions, agentTriggers, agentApprovals } from "./schema.js";
import { eq, desc } from "drizzle-orm";
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
//# sourceMappingURL=repositories.js.map