import { db } from "./client.js";
import { tickets, drafts, humanReviews } from "./schema.js";
import { eq } from "drizzle-orm";
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
//# sourceMappingURL=repositories.js.map