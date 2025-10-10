#!/usr/bin/env python3

"""
Upload cancellation tickets to OpenAI Vector Store

This script converts our JSONL data to individual text files
and uploads them to the existing vector store.
"""

import json
import os
import time
from pathlib import Path
from openai import OpenAI

def upload_to_vector_store():
    print("🔄 Uploading cancellation tickets to vector store...")
    
    # Initialize OpenAI client
    client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
    vector_store_id = os.getenv('OPENAI_VECTOR_STORE_ID')
    
    if not vector_store_id:
        raise ValueError("OPENAI_VECTOR_STORE_ID environment variable not set")
    
    # Read the JSONL data
    input_file = Path("vector-store-data-2025-10-10.jsonl")
    if not input_file.exists():
        raise FileNotFoundError(f"Input file {input_file} not found")
    
    documents = []
    with open(input_file, 'r', encoding='utf-8') as f:
        for line in f:
            if line.strip():
                documents.append(json.loads(line))
    
    print(f"Found {len(documents)} documents to upload")
    
    success_count = 0
    error_count = 0
    
    # Process documents in batches
    batch_size = 5  # Smaller batches to avoid rate limits
    for i in range(0, len(documents), batch_size):
        batch = documents[i:i + batch_size]
        batch_num = (i // batch_size) + 1
        total_batches = (len(documents) + batch_size - 1) // batch_size
        
        print(f"\n📦 Processing batch {batch_num}/{total_batches} ({len(batch)} documents)")
        
        for j, doc in enumerate(batch):
            global_index = i + j + 1
            try:
                # Create text content for the file
                metadata = doc.get('metadata', {})
                text_content = f"""CANCELLATION TICKET: {metadata.get('ticketId', 'unknown')}
Subject: {metadata.get('subject', 'N/A')}
Language: {metadata.get('language', 'unknown')}
Category: {'Cancellation' if metadata.get('is_cancellation') else 'Other'}
Payment Issue: {'Yes' if metadata.get('has_payment_issue') else 'No'}
Edge Case: {metadata.get('edge_case', 'none')}
Customer Concerns: {', '.join(metadata.get('customer_concerns', [])) or 'None'}

CONVERSATION:
{doc.get('text', '')}

METADATA:
- Ticket ID: {metadata.get('ticketId', 'unknown')}
- Language: {metadata.get('language', 'unknown')}
- Has Payment Issue: {metadata.get('has_payment_issue', False)}
- Edge Case: {metadata.get('edge_case', 'none')}
- Customer Concerns: {', '.join(metadata.get('customer_concerns', [])) or 'None'}
- Topic Keywords: {', '.join(metadata.get('topic_keywords', [])) or 'None'}
- Conversation Summary: {metadata.get('conversation_summary', 'None')}
"""
                
                # Create temporary file
                temp_filename = f"temp_cancellation_{metadata.get('ticketId', global_index)}.txt"
                with open(temp_filename, 'w', encoding='utf-8') as temp_file:
                    temp_file.write(text_content)
                
                # Upload file to OpenAI
                with open(temp_filename, 'rb') as temp_file:
                    file = client.files.create(
                        file=temp_file,
                        purpose='assistants'
                    )
                
                # Attach to vector store
                vector_store_file = client.vector_stores.files.create(
                    vector_store_id=vector_store_id,
                    file_id=file.id
                )
                
                # Clean up temp file
                os.remove(temp_filename)
                
                print(f"  ✅ {global_index}/{len(documents)}: {metadata.get('ticketId', 'unknown')} ({file.id})")
                success_count += 1
                
            except Exception as e:
                print(f"  ❌ {global_index}/{len(documents)}: Error uploading {metadata.get('ticketId', 'unknown')}: {str(e)}")
                error_count += 1
                
                # Clean up temp file if it exists
                temp_filename = f"temp_cancellation_{metadata.get('ticketId', global_index)}.txt"
                if os.path.exists(temp_filename):
                    os.remove(temp_filename)
        
        # Small delay between batches
        if i + batch_size < len(documents):
            print("⏳ Waiting 3 seconds before next batch...")
            time.sleep(3)
    
    print(f"\n🎉 Upload completed!")
    print(f"\n📊 Results:")
    print(f"   Total documents: {len(documents)}")
    print(f"   Successfully uploaded: {success_count}")
    print(f"   Errors: {error_count}")
    print(f"   Success rate: {(success_count / len(documents) * 100):.1f}%")
    
    print(f"\n🔗 Vector Store ID: {vector_store_id}")
    print(f"📁 Files uploaded with purpose: assistants")
    print(f"\n✅ Your RAG system is now ready to use the enhanced cancellation data!")

if __name__ == "__main__":
    try:
        upload_to_vector_store()
    except Exception as e:
        print(f"\n❌ Upload failed: {str(e)}")
        exit(1)
