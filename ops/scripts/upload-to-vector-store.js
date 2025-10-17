#!/usr/bin/env tsx
"use strict";
/**
 * Upload cancellation tickets to OpenAI Vector Store
 *
 * This script converts our JSONL data to individual text files
 * and uploads them to the existing vector store.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const fs_1 = require("fs");
const path_1 = require("path");
const openai_1 = __importDefault(require("openai"));
const inputFilePath = (0, path_1.join)(process.cwd(), 'vector-store-data-2025-10-10.jsonl');
const tempDir = (0, path_1.join)(process.cwd(), 'temp-vector-files');
async function uploadToVectorStore() {
    console.log(`🔄 Uploading cancellation tickets to vector store...`);
    try {
        // Read the JSONL data
        const jsonlContent = (0, fs_1.readFileSync)(inputFilePath, 'utf-8');
        const documents = jsonlContent
            .trim()
            .split('\n')
            .map(line => JSON.parse(line));
        console.log(`Found ${documents.length} documents to upload`);
        // Initialize OpenAI client
        const openai = new openai_1.default({ apiKey: process.env.OPENAI_API_KEY });
        const vectorStoreId = process.env.OPENAI_VECTOR_STORE_ID;
        if (!vectorStoreId) {
            throw new Error('OPENAI_VECTOR_STORE_ID environment variable not set');
        }
        // Clean up temp directory
        if (require('fs').existsSync(tempDir)) {
            (0, fs_1.rmSync)(tempDir, { recursive: true });
        }
        (0, fs_1.mkdirSync)(tempDir, { recursive: true });
        const uploadResults = [];
        let successCount = 0;
        let errorCount = 0;
        // Process documents in batches to avoid rate limits
        const batchSize = 10;
        for (let i = 0; i < documents.length; i += batchSize) {
            const batch = documents.slice(i, i + batchSize);
            console.log(`\n📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(documents.length / batchSize)} (${batch.length} documents)`);
            const batchPromises = batch.map(async (doc, index) => {
                try {
                    const globalIndex = i + index;
                    const filename = `cancellation-ticket-${doc.metadata.ticketId}.txt`;
                    const filePath = (0, path_1.join)(tempDir, filename);
                    // Create text content for the file
                    const textContent = `CANCELLATION TICKET: ${doc.metadata.ticketId}
Subject: ${doc.metadata.subject || 'N/A'}
Language: ${doc.metadata.language || 'unknown'}
Category: ${doc.metadata.is_cancellation ? 'Cancellation' : 'Other'}
Payment Issue: ${doc.metadata.has_payment_issue ? 'Yes' : 'No'}
Edge Case: ${doc.metadata.edge_case || 'none'}
Customer Concerns: ${(doc.metadata.customer_concerns || []).join(', ') || 'None'}

CONVERSATION:
${doc.text}

METADATA:
- Ticket ID: ${doc.metadata.ticketId}
- Language: ${doc.metadata.language || 'unknown'}
- Has Payment Issue: ${doc.metadata.has_payment_issue || false}
- Edge Case: ${doc.metadata.edge_case || 'none'}
- Customer Concerns: ${(doc.metadata.customer_concerns || []).join(', ') || 'None'}
- Topic Keywords: ${(doc.metadata.topic_keywords || []).join(', ') || 'None'}
- Conversation Summary: ${doc.metadata.conversation_summary || 'None'}
`;
                    // Write temporary file
                    (0, fs_1.writeFileSync)(filePath, textContent, 'utf-8');
                    // Upload file to OpenAI
                    const file = await openai.files.create({
                        file: require('fs').createReadStream(filePath),
                        purpose: 'assistants'
                    });
                    // Attach to vector store
                    const vectorStoreFile = await openai.vector_stores.files.create({
                        vector_store_id: vectorStoreId,
                        file_id: file.id
                    });
                    // Clean up temp file
                    require('fs').unlinkSync(filePath);
                    console.log(`  ✅ ${globalIndex + 1}/${documents.length}: ${filename} (${file.id})`);
                    return { success: true, fileId: file.id, vectorStoreFileId: vectorStoreFile.id, ticketId: doc.metadata.ticketId };
                }
                catch (error) {
                    console.error(`  ❌ ${i + index + 1}/${documents.length}: Error uploading ${doc.metadata.ticketId}: ${error.message}`);
                    return { success: false, error: error.message, ticketId: doc.metadata.ticketId };
                }
            });
            // Wait for batch to complete
            const batchResults = await Promise.all(batchPromises);
            uploadResults.push(...batchResults);
            // Count results
            batchResults.forEach(result => {
                if (result.success) {
                    successCount++;
                }
                else {
                    errorCount++;
                }
            });
            // Small delay between batches to avoid rate limits
            if (i + batchSize < documents.length) {
                console.log(`⏳ Waiting 2 seconds before next batch...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        // Clean up temp directory
        (0, fs_1.rmSync)(tempDir, { recursive: true });
        console.log(`\n🎉 Upload completed!`);
        console.log(`\n📊 Results:`);
        console.log(`   Total documents: ${documents.length}`);
        console.log(`   Successfully uploaded: ${successCount}`);
        console.log(`   Errors: ${errorCount}`);
        console.log(`   Success rate: ${((successCount / documents.length) * 100).toFixed(1)}%`);
        if (errorCount > 0) {
            console.log(`\n❌ Errors encountered:`);
            uploadResults
                .filter(r => !r.success)
                .forEach(r => console.log(`   - ${r.ticketId}: ${r.error}`));
        }
        console.log(`\n🔗 Vector Store ID: ${vectorStoreId}`);
        console.log(`📁 Files uploaded with purpose: assistants`);
        console.log(`\n✅ Your RAG system is now ready to use the enhanced cancellation data!`);
    }
    catch (error) {
        console.error(`\n❌ Error uploading to vector store: ${error.message}`);
        process.exit(1);
    }
}
// Run the upload
uploadToVectorStore().catch(error => {
    console.error(`\n❌ Upload failed: ${error.message}`);
    process.exit(1);
});
