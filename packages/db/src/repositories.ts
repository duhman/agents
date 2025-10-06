import { db } from "./client";
import { tickets, drafts, humanReviews } from "./schema";
import { eq } from "drizzle-orm";

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
