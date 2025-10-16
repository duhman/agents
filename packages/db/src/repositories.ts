import { db } from "./client.js";
import { tickets, drafts, humanReviews, agentWorkflows, agentExecutions, agentTriggers, agentApprovals } from "./schema.js";
import { eq, desc } from "drizzle-orm";

export async function createTicket(data: {
  source: string;
  customerEmail: string;
  rawEmailMasked: string;
  reason?: string;
  moveDate?: Date;
}) {
  const [ticket] = await db
    .insert(tickets)
    .values({
      ...data,
      moveDate: data.moveDate?.toISOString().split("T")[0] // Convert Date to YYYY-MM-DD string
    })
    .returning();
  return ticket;
}

export async function createDraft(data: {
  ticketId: string;
  language: string;
  draftText: string;
  confidence: string;
  model: string;
}) {
  const [draft] = await db.insert(drafts).values(data).returning();
  return draft;
}

export async function createHumanReview(data: {
  ticketId: string;
  draftId: string;
  decision: string;
  finalText: string;
  reviewerSlackId: string;
}) {
  const [review] = await db.insert(humanReviews).values(data).returning();
  return review;
}

export async function getTicketById(id: string) {
  return db.query.tickets.findFirst({
    where: eq(tickets.id, id)
  });
}

export async function getDraftById(id: string) {
  return db.query.drafts.findFirst({
    where: eq(drafts.id, id)
  });
}

export async function createWorkflow(data: {
  name: string;
  description?: string;
  nodes?: any;
  edges?: any;
  configuration?: any;
}) {
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

export async function updateWorkflow(id: string, data: {
  name?: string;
  description?: string;
  nodes?: any;
  edges?: any;
  configuration?: any;
  status?: string;
}) {
  const [workflow] = await db
    .update(agentWorkflows)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(agentWorkflows.id, id))
    .returning();
  return workflow;
}

export async function getWorkflowById(id: string) {
  return db.query.agentWorkflows.findFirst({
    where: eq(agentWorkflows.id, id)
  });
}

export async function listWorkflows() {
  return db.query.agentWorkflows.findMany({
    orderBy: [desc(agentWorkflows.updatedAt)]
  });
}

export async function deleteWorkflow(id: string) {
  await db.delete(agentWorkflows).where(eq(agentWorkflows.id, id));
}

export async function createExecution(data: {
  workflowId: string;
  triggerType: string;
  triggerData?: any;
}) {
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

export async function updateExecution(id: string, data: {
  status?: string;
  endTime?: Date;
  executionTrace?: any;
  error?: string;
}) {
  const [execution] = await db
    .update(agentExecutions)
    .set(data)
    .where(eq(agentExecutions.id, id))
    .returning();
  return execution;
}

export async function getExecutionById(id: string) {
  return db.query.agentExecutions.findFirst({
    where: eq(agentExecutions.id, id)
  });
}

export async function listExecutions(workflowId?: string) {
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

export async function createTrigger(data: {
  workflowId: string;
  type: string;
  configuration?: any;
  webhookUrl?: string;
  cronExpression?: string;
}) {
  const [trigger] = await db
    .insert(agentTriggers)
    .values({
      ...data,
      configuration: data.configuration || {}
    })
    .returning();
  return trigger;
}

export async function updateTrigger(id: string, data: {
  configuration?: any;
  webhookUrl?: string;
  cronExpression?: string;
  enabled?: boolean;
}) {
  const [trigger] = await db
    .update(agentTriggers)
    .set(data)
    .where(eq(agentTriggers.id, id))
    .returning();
  return trigger;
}

export async function getTriggerById(id: string) {
  return db.query.agentTriggers.findFirst({
    where: eq(agentTriggers.id, id)
  });
}

export async function listTriggers(workflowId: string) {
  return db.query.agentTriggers.findMany({
    where: eq(agentTriggers.workflowId, workflowId)
  });
}

export async function deleteTrigger(id: string) {
  await db.delete(agentTriggers).where(eq(agentTriggers.id, id));
}

export async function createApproval(data: {
  executionId: string;
  nodeId: string;
  slackMessageTs?: string;
  slackChannel?: string;
}) {
  const [approval] = await db
    .insert(agentApprovals)
    .values({
      ...data,
      status: 'pending'
    })
    .returning();
  return approval;
}

export async function updateApproval(id: string, data: {
  status?: string;
  approverSlackId?: string;
  decisionData?: any;
  resolvedAt?: Date;
}) {
  const [approval] = await db
    .update(agentApprovals)
    .set(data)
    .where(eq(agentApprovals.id, id))
    .returning();
  return approval;
}

export async function getApprovalById(id: string) {
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
