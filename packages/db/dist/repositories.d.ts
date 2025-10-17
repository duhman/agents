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
export declare function createWorkflow(data: {
    name: string;
    description?: string;
    nodes?: any;
    edges?: any;
    configuration?: any;
}): Promise<{
    id: string;
    name: string;
    createdAt: Date;
    description: string | null;
    nodes: unknown;
    edges: unknown;
    configuration: unknown;
    status: string;
    updatedAt: Date;
}>;
export declare function updateWorkflow(id: string, data: {
    name?: string;
    description?: string;
    nodes?: any;
    edges?: any;
    configuration?: any;
    status?: string;
}): Promise<{
    id: string;
    name: string;
    createdAt: Date;
    description: string | null;
    nodes: unknown;
    edges: unknown;
    configuration: unknown;
    status: string;
    updatedAt: Date;
}>;
export declare function getWorkflowById(id: string): Promise<{
    id: string;
    name: string;
    createdAt: Date;
    description: string | null;
    nodes: unknown;
    edges: unknown;
    configuration: unknown;
    status: string;
    updatedAt: Date;
} | undefined>;
export declare function listWorkflows(): Promise<{
    id: string;
    name: string;
    createdAt: Date;
    description: string | null;
    nodes: unknown;
    edges: unknown;
    configuration: unknown;
    status: string;
    updatedAt: Date;
}[]>;
export declare function deleteWorkflow(id: string): Promise<void>;
export declare function createExecution(data: {
    workflowId: string;
    triggerType: string;
    triggerData?: any;
}): Promise<{
    id: string;
    createdAt: Date;
    status: string;
    workflowId: string;
    triggerType: string;
    triggerData: unknown;
    startTime: Date;
    endTime: Date | null;
    executionTrace: unknown;
    error: string | null;
}>;
export declare function updateExecution(id: string, data: {
    status?: string;
    endTime?: Date;
    executionTrace?: any;
    error?: string;
}): Promise<{
    id: string;
    createdAt: Date;
    status: string;
    workflowId: string;
    triggerType: string;
    triggerData: unknown;
    startTime: Date;
    endTime: Date | null;
    executionTrace: unknown;
    error: string | null;
}>;
export declare function getExecutionById(id: string): Promise<{
    id: string;
    createdAt: Date;
    status: string;
    workflowId: string;
    triggerType: string;
    triggerData: unknown;
    startTime: Date;
    endTime: Date | null;
    executionTrace: unknown;
    error: string | null;
} | undefined>;
export declare function listExecutions(workflowId?: string): Promise<{
    id: string;
    createdAt: Date;
    status: string;
    workflowId: string;
    triggerType: string;
    triggerData: unknown;
    startTime: Date;
    endTime: Date | null;
    executionTrace: unknown;
    error: string | null;
}[]>;
export declare function createTrigger(data: {
    workflowId: string;
    type: string;
    configuration?: any;
    webhookUrl?: string;
    cronExpression?: string;
}): Promise<{
    id: string;
    createdAt: Date;
    configuration: unknown;
    workflowId: string;
    type: string;
    webhookUrl: string | null;
    cronExpression: string | null;
    enabled: boolean;
}>;
export declare function updateTrigger(id: string, data: {
    configuration?: any;
    webhookUrl?: string;
    cronExpression?: string;
    enabled?: boolean;
}): Promise<{
    id: string;
    createdAt: Date;
    configuration: unknown;
    workflowId: string;
    type: string;
    webhookUrl: string | null;
    cronExpression: string | null;
    enabled: boolean;
}>;
export declare function getTriggerById(id: string): Promise<{
    id: string;
    createdAt: Date;
    configuration: unknown;
    workflowId: string;
    type: string;
    webhookUrl: string | null;
    cronExpression: string | null;
    enabled: boolean;
} | undefined>;
export declare function listTriggers(workflowId: string): Promise<{
    id: string;
    createdAt: Date;
    configuration: unknown;
    workflowId: string;
    type: string;
    webhookUrl: string | null;
    cronExpression: string | null;
    enabled: boolean;
}[]>;
export declare function deleteTrigger(id: string): Promise<void>;
export declare function createApproval(data: {
    executionId: string;
    nodeId: string;
    slackMessageTs?: string;
    slackChannel?: string;
}): Promise<{
    id: string;
    createdAt: Date;
    status: string;
    executionId: string;
    nodeId: string;
    slackMessageTs: string | null;
    slackChannel: string | null;
    approverSlackId: string | null;
    decisionData: unknown;
    resolvedAt: Date | null;
}>;
export declare function updateApproval(id: string, data: {
    status?: string;
    approverSlackId?: string;
    decisionData?: any;
    resolvedAt?: Date;
}): Promise<{
    id: string;
    createdAt: Date;
    status: string;
    executionId: string;
    nodeId: string;
    slackMessageTs: string | null;
    slackChannel: string | null;
    approverSlackId: string | null;
    decisionData: unknown;
    resolvedAt: Date | null;
}>;
export declare function getApprovalById(id: string): Promise<{
    id: string;
    createdAt: Date;
    status: string;
    executionId: string;
    nodeId: string;
    slackMessageTs: string | null;
    slackChannel: string | null;
    approverSlackId: string | null;
    decisionData: unknown;
    resolvedAt: Date | null;
} | undefined>;
export declare function listPendingApprovals(): Promise<{
    id: string;
    createdAt: Date;
    status: string;
    executionId: string;
    nodeId: string;
    slackMessageTs: string | null;
    slackChannel: string | null;
    approverSlackId: string | null;
    decisionData: unknown;
    resolvedAt: Date | null;
}[]>;
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
    status: string;
    updatedAt: Date;
    channel: string;
    originalEmail: string;
    originalEmailSubject: string | null;
    originalEmailBody: string | null;
    extraction: unknown;
    hubspotTicketUrl: string | null;
    retryCount: string;
    nextRetryAt: Date;
    lastError: string | null;
}>;
export declare function getSlackRetryQueueItemsToProcess(maxRetries?: number): Promise<{
    id: string;
    createdAt: Date;
    ticketId: string;
    draftText: string;
    confidence: string;
    draftId: string;
    status: string;
    updatedAt: Date;
    channel: string;
    originalEmail: string;
    originalEmailSubject: string | null;
    originalEmailBody: string | null;
    extraction: unknown;
    hubspotTicketUrl: string | null;
    retryCount: string;
    nextRetryAt: Date;
    lastError: string | null;
}[]>;
export declare function claimSlackRetryQueueItem(id: string): Promise<{
    id: string;
    createdAt: Date;
    ticketId: string;
    draftText: string;
    confidence: string;
    draftId: string;
    status: string;
    updatedAt: Date;
    channel: string;
    originalEmail: string;
    originalEmailSubject: string | null;
    originalEmailBody: string | null;
    extraction: unknown;
    hubspotTicketUrl: string | null;
    retryCount: string;
    nextRetryAt: Date;
    lastError: string | null;
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
    status: string;
    updatedAt: Date;
    channel: string;
    originalEmail: string;
    originalEmailSubject: string | null;
    originalEmailBody: string | null;
    extraction: unknown;
    hubspotTicketUrl: string | null;
    retryCount: string;
    nextRetryAt: Date;
    lastError: string | null;
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