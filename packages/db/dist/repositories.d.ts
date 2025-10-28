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
export declare function getHumanReviewsByDecision(decision: "approve" | "edit" | "reject", limit?: number): Promise<{
    id: string;
    createdAt: Date;
    ticketId: string | null;
    draftId: string | null;
    decision: string;
    finalText: string;
    reviewerSlackId: string;
}[]>;
export declare function getHumanReviewsWithContext(limit?: number): Promise<{
    id: string;
    createdAt: Date;
    ticketId: string | null;
    draftId: string | null;
    decision: string;
    finalText: string;
    reviewerSlackId: string;
    draft: never;
}[]>;
export declare function getReviewStats(): Promise<{
    total: number;
    approved: number;
    edited: number;
    rejected: number;
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
export declare function createSlackRetryQueueItem(data: {
    ticketId: string;
    draftId: string;
    channel: string;
    originalEmail: string;
    originalEmailSubject?: string;
    originalEmailBody?: string;
    draftText: string;
    confidence: string;
    extraction: Record<string, any>;
    hubspotTicketUrl?: string;
    retryCount?: string;
    nextRetryAt: Date;
}): Promise<{
    id: string;
    createdAt: Date;
    ticketId: string;
    draftText: string;
    confidence: string;
    draftId: string;
    channel: string;
    originalEmail: string;
    originalEmailSubject: string | null;
    originalEmailBody: string | null;
    extraction: unknown;
    hubspotTicketUrl: string | null;
    retryCount: string;
    nextRetryAt: Date;
    lastError: string | null;
    status: string;
    updatedAt: Date;
}>;
export declare function getSlackRetryQueueItemsToProcess(maxRetries?: number): Promise<{
    id: string;
    createdAt: Date;
    ticketId: string;
    draftText: string;
    confidence: string;
    draftId: string;
    channel: string;
    originalEmail: string;
    originalEmailSubject: string | null;
    originalEmailBody: string | null;
    extraction: unknown;
    hubspotTicketUrl: string | null;
    retryCount: string;
    nextRetryAt: Date;
    lastError: string | null;
    status: string;
    updatedAt: Date;
}[]>;
export declare function claimSlackRetryQueueItem(id: string): Promise<{
    id: string;
    createdAt: Date;
    ticketId: string;
    draftText: string;
    confidence: string;
    draftId: string;
    channel: string;
    originalEmail: string;
    originalEmailSubject: string | null;
    originalEmailBody: string | null;
    extraction: unknown;
    hubspotTicketUrl: string | null;
    retryCount: string;
    nextRetryAt: Date;
    lastError: string | null;
    status: string;
    updatedAt: Date;
}>;
export declare function updateSlackRetryQueueItem(id: string, data: {
    retryCount?: string;
    nextRetryAt?: Date;
    lastError?: string;
    status?: string;
}): Promise<{
    id: string;
    createdAt: Date;
    ticketId: string;
    draftText: string;
    confidence: string;
    draftId: string;
    channel: string;
    originalEmail: string;
    originalEmailSubject: string | null;
    originalEmailBody: string | null;
    extraction: unknown;
    hubspotTicketUrl: string | null;
    retryCount: string;
    nextRetryAt: Date;
    lastError: string | null;
    status: string;
    updatedAt: Date;
}>;
export declare function deleteSlackRetryQueueItem(id: string): Promise<void>;
export declare function getSlackRetryQueueStats(): Promise<{
    count: number;
    pending: number;
    processing: number;
    succeeded: number;
    failed: number;
    byRetryCount: Record<number, number>;
}>;
//# sourceMappingURL=repositories.d.ts.map