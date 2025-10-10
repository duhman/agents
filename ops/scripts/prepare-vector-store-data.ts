/**
 * Prepare Vector Store Data Script
 * 
 * Transforms oppsigelse_tickets.json into OpenAI vector store format
 * - Masks PII before upload (GDPR compliance)
 * - Creates structured documents with metadata
 * - Formats conversations for semantic search
 */

import "dotenv/config";
import { readFileSync, writeFileSync } from "fs";
import { maskPII } from "@agents/core";

interface TicketData {
  ticketId: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  conversation: {
    threadId: string;
    participants: Array<{
      id: string;
      email: string;
      name: string;
      role: string;
      type: string;
    }>;
    messages: Array<{
      id: string;
      timestamp: string;
      role: string;
      direction: string;
      subject: string;
      content: string;
      source: string;
    }>;
  };
  ragContext: {
    primaryLanguage: string;
    topicKeywords: string[];
    conversationSummary: string;
    participantCount: number;
    threadLength: number;
    hasCustomerMessages: boolean;
    hasSupportMessages: boolean;
  };
}

interface VectorStoreDocument {
  id: string;
  content: string;
  metadata: {
    ticketId: string;
    category: string;
    language: string;
    edgeCase?: string;
    hasPaymentIssue: boolean;
    threadLength: number;
    subject: string;
    priority: string;
    status: string;
  };
}

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

function detectPaymentIssue(content: string): boolean {
  const lower = content.toLowerCase();
  return PAYMENT_ISSUE_PATTERNS.norwegian.some(p => lower.includes(p)) ||
         PAYMENT_ISSUE_PATTERNS.english.some(p => lower.includes(p));
}

function detectEdgeCase(content: string): string {
  const lower = content.toLowerCase();
  
  for (const [edgeCase, patterns] of Object.entries(EDGE_CASE_PATTERNS)) {
    if (patterns.some(p => lower.includes(p))) {
      return edgeCase;
    }
  }
  
  return 'none';
}

function formatConversationForVectorStore(ticket: TicketData): string {
  const { conversation } = ticket;
  
  // Get customer's initial message
  const customerMessage = conversation.messages.find(m => 
    m.role === 'customer' && m.direction === 'inbound'
  );
  
  // Get support response(s)
  const supportMessages = conversation.messages.filter(m => 
    m.role === 'support' && m.direction === 'outbound'
  );
  
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
    const ticketsData = JSON.parse(readFileSync('oppsigelse_tickets.json', 'utf8'));
    const tickets: TicketData[] = ticketsData.tickets;
    
    console.log(`Found ${tickets.length} tickets to process\n`);
    
    const vectorStoreDocuments: VectorStoreDocument[] = [];
    let skippedCount = 0;
    
    for (const ticket of tickets) {
      // Format conversation for vector store
      const formattedContent = formatConversationForVectorStore(ticket);
      
      if (!formattedContent) {
        skippedCount++;
        continue; // Skip tickets without proper conversation flow
      }
      
      // Mask PII in the content
      const maskedContent = maskPII(formattedContent);
      
      // Detect payment issues and edge cases
      const fullContent = ticket.conversation.messages.map(m => m.content).join(' ');
      const hasPaymentIssue = detectPaymentIssue(fullContent);
      const edgeCase = detectEdgeCase(fullContent);
      
      // Create vector store document
      const document: VectorStoreDocument = {
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
    writeFileSync(filename, jsonlContent);
    
    // Generate statistics
    const stats = {
      totalTickets: tickets.length,
      processedDocuments: vectorStoreDocuments.length,
      skipped: skippedCount,
      byCategory: vectorStoreDocuments.reduce((acc, doc) => {
        acc[doc.metadata.category] = (acc[doc.metadata.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byLanguage: vectorStoreDocuments.reduce((acc, doc) => {
        acc[doc.metadata.language] = (acc[doc.metadata.language] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      withPaymentIssues: vectorStoreDocuments.filter(doc => doc.metadata.hasPaymentIssue).length,
      withEdgeCases: vectorStoreDocuments.filter(doc => doc.metadata.edgeCase).length,
      edgeCaseBreakdown: vectorStoreDocuments.reduce((acc, doc) => {
        if (doc.metadata.edgeCase) {
          acc[doc.metadata.edgeCase] = (acc[doc.metadata.edgeCase] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>)
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
    
  } catch (error: any) {
    console.error("❌ Error preparing vector store data:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
prepareVectorStoreData();
