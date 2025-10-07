export declare function createTicket(data: {
    source: string;
    customerEmail: string;
    rawEmailMasked: string;
    reason?: string;
    moveDate?: Date;
}): Promise<{
    id: string;
    source: string;
    customerEmail: string;
    rawEmailMasked: string;
    reason: string | null;
    moveDate: string | null;
    createdAt: Date;
}>;
export declare function createDraft(data: {
    ticketId: string;
    language: string;
    draftText: string;
    confidence: string;
    model: string;
}): Promise<{
    id: string;
    createdAt: Date;
    ticketId: string | null;
    language: string;
    draftText: string;
    confidence: string;
    model: string;
}>;
export declare function createHumanReview(data: {
    ticketId: string;
    draftId: string;
    decision: string;
    finalText: string;
    reviewerSlackId: string;
}): Promise<{
    id: string;
    createdAt: Date;
    ticketId: string | null;
    draftId: string | null;
    decision: string;
    finalText: string;
    reviewerSlackId: string;
}>;
export declare function getTicketById(id: string): Promise<{
    id: string;
    source: string;
    customerEmail: string;
    rawEmailMasked: string;
    reason: string | null;
    moveDate: string | null;
    createdAt: Date;
} | undefined>;
export declare function getDraftById(id: string): Promise<{
    id: string;
    createdAt: Date;
    ticketId: string | null;
    language: string;
    draftText: string;
    confidence: string;
    model: string;
} | undefined>;
//# sourceMappingURL=repositories.d.ts.map