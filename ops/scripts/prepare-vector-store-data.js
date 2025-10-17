"use strict";
/**
 * Prepare Vector Store Data Script
 *
 * Transforms oppsigelse_tickets.json into OpenAI vector store format
 * - Masks PII before upload (GDPR compliance)
 * - Creates structured documents with metadata
 * - Formats conversations for semantic search
 */
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const fs_1 = require("fs");
const core_1 = require("@agents/core");
// Payment issue detection patterns
const PAYMENT_ISSUE_PATTERNS = {
    norwegian: ['betalt', 'faktura', 'trekk', 'refund', 'kreditert', 'dobbell', 'fortsatt betalt', 'dobbel trekk'],
    english: ['charged', 'invoice', 'billing', 'refund', 'payment', 'twice', 'charged twice', 'billing issue']
};
// Edge case detection patterns
const EDGE_CASE_PATTERNS = {
    no_app_access: ['ikke app', 'not app', 'ingen app', 'no app', 'klarer ikke app'],
    corporate_account: ['bedrift', 'company', 'firma', 'corporate', 'business'],
    future_move_date: ['oktober', 'november', 'desember', 'october', 'november', 'december', '2025', '2026'],
    already_canceled: ['allerede', 'already', 'kansellert', 'cancelled'],
    sameie_concern: ['sameie', 'borettslag', 'housing association', 'styret', 'board'],
    payment_dispute: ['feil', 'wrong', 'mistake', 'feilaktig', 'incorrect']
};
function detectPaymentIssue(content) {
    const lower = content.toLowerCase();
    return PAYMENT_ISSUE_PATTERNS.norwegian.some(p => lower.includes(p)) ||
        PAYMENT_ISSUE_PATTERNS.english.some(p => lower.includes(p));
}
function detectEdgeCase(content) {
    const lower = content.toLowerCase();
    for (const [edgeCase, patterns] of Object.entries(EDGE_CASE_PATTERNS)) {
        if (patterns.some(p => lower.includes(p))) {
            return edgeCase;
        }
    }
    return 'none';
}
function formatConversationForVectorStore(ticket) {
    const { conversation } = ticket;
    // Get customer's initial message
    const customerMessage = conversation.messages.find(m => m.role === 'customer' && m.direction === 'inbound');
    // Get support response(s)
    const supportMessages = conversation.messages.filter(m => m.role === 'support' && m.direction === 'outbound');
    if (!customerMessage || supportMessages.length === 0) {
        return ''; // Skip tickets without proper conversation flow
    }
    // Format for vector store
    let formatted = `Customer Inquiry:\n${customerMessage.content}\n\n`;
    // Add support responses (limit to first 2 to keep size manageable)
    supportMessages.slice(0, 2).forEach((msg, index) => {
        formatted += `Support Response ${index + 1}:\n${msg.content}\n\n`;
    });
    return formatted.trim();
}
function prepareVectorStoreData() {
    console.log("🔄 Preparing vector store data from oppsigelse_tickets.json...\n");
    try {
        // Read the tickets data
        const ticketsData = JSON.parse((0, fs_1.readFileSync)('oppsigelse_tickets.json', 'utf8'));
        const tickets = ticketsData.tickets;
        console.log(`Found ${tickets.length} tickets to process\n`);
        const vectorStoreDocuments = [];
        let skippedCount = 0;
        for (const ticket of tickets) {
            // Format conversation for vector store
            const formattedContent = formatConversationForVectorStore(ticket);
            if (!formattedContent) {
                skippedCount++;
                continue; // Skip tickets without proper conversation flow
            }
            // Mask PII in the content
            const maskedContent = (0, core_1.maskPII)(formattedContent);
            // Detect payment issues and edge cases
            const fullContent = ticket.conversation.messages.map(m => m.content).join(' ');
            const hasPaymentIssue = detectPaymentIssue(fullContent);
            const edgeCase = detectEdgeCase(fullContent);
            // Create vector store document
            const document = {
                id: `ticket-${ticket.ticketId}`,
                content: maskedContent,
                metadata: {
                    ticketId: ticket.ticketId,
                    category: ticket.category,
                    language: ticket.ragContext.primaryLanguage || 'no',
                    edgeCase: edgeCase !== 'none' ? edgeCase : undefined,
                    hasPaymentIssue,
                    threadLength: ticket.ragContext.threadLength,
                    subject: ticket.subject,
                    priority: ticket.priority,
                    status: ticket.status
                }
            };
            vectorStoreDocuments.push(document);
        }
        // Convert to JSONL format for OpenAI vector store
        const jsonlContent = vectorStoreDocuments
            .map(doc => JSON.stringify(doc))
            .join('\n');
        // Write to file
        const filename = `vector-store-data-${new Date().toISOString().split('T')[0]}.jsonl`;
        (0, fs_1.writeFileSync)(filename, jsonlContent);
        // Generate statistics
        const stats = {
            totalTickets: tickets.length,
            processedDocuments: vectorStoreDocuments.length,
            skipped: skippedCount,
            byCategory: vectorStoreDocuments.reduce((acc, doc) => {
                acc[doc.metadata.category] = (acc[doc.metadata.category] || 0) + 1;
                return acc;
            }, {}),
            byLanguage: vectorStoreDocuments.reduce((acc, doc) => {
                acc[doc.metadata.language] = (acc[doc.metadata.language] || 0) + 1;
                return acc;
            }, {}),
            withPaymentIssues: vectorStoreDocuments.filter(doc => doc.metadata.hasPaymentIssue).length,
            withEdgeCases: vectorStoreDocuments.filter(doc => doc.metadata.edgeCase).length,
            edgeCaseBreakdown: vectorStoreDocuments.reduce((acc, doc) => {
                if (doc.metadata.edgeCase) {
                    acc[doc.metadata.edgeCase] = (acc[doc.metadata.edgeCase] || 0) + 1;
                }
                return acc;
            }, {})
        };
        console.log("✅ Vector store data preparation complete!\n");
        console.log("📊 Statistics:");
        console.log(`   Total tickets: ${stats.totalTickets}`);
        console.log(`   Processed documents: ${stats.processedDocuments}`);
        console.log(`   Skipped: ${stats.skipped}`);
        console.log(`   With payment issues: ${stats.withPaymentIssues}`);
        console.log(`   With edge cases: ${stats.withEdgeCases}\n`);
        console.log("📁 Categories:");
        Object.entries(stats.byCategory).forEach(([cat, count]) => {
            console.log(`   - ${cat}: ${count}`);
        });
        console.log("\n🌍 Languages:");
        Object.entries(stats.byLanguage).forEach(([lang, count]) => {
            console.log(`   - ${lang}: ${count}`);
        });
        console.log("\n⚠️  Edge Cases:");
        Object.entries(stats.edgeCaseBreakdown).forEach(([edgeCase, count]) => {
            console.log(`   - ${edgeCase}: ${count}`);
        });
        console.log(`\n📝 Output file: ${filename}`);
        console.log(`📏 File size: ${(jsonlContent.length / 1024 / 1024).toFixed(2)} MB`);
        console.log("\n🎯 Next steps:");
        console.log("1. Review the JSONL file for quality");
        console.log("2. Upload to OpenAI vector store:");
        console.log(`   openai api files.create -f ${filename} -p vector-store`);
        console.log("3. Create vector store and attach file");
        console.log("4. Update OPENAI_VECTOR_STORE_ID in environment");
    }
    catch (error) {
        console.error("❌ Error preparing vector store data:", error.message);
        console.error(error.stack);
        process.exit(1);
    }
}
// Run the script
prepareVectorStoreData();
