import { db } from "./client.js";
import { tickets, drafts, humanReviews, slackRetryQueue } from "./schema.js";
import { eq, and, lte } from "drizzle-orm";
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