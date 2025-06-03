// debug-pinecone.js

import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config();

// OpenAI setup
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function runDebug() {
  try {
    console.log('📊 Initializing Pinecone client...');
    const pinecone = new Pinecone(); // auto-loads from env
    const index = pinecone.Index(process.env.PINECONE_INDEX_NAME); // Capital "I"

    const stats = await index.describeIndexStats();
    console.log('✅ Total vectors in index:', stats.totalVectorCount);

    const queryText = 'What is your quality promise?';
    console.log(`\n🔍 Getting embedding for: "${queryText}"`);

    const embeddingRes = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: queryText
    });

    // Get the namespace object and query it
    const targetNamespace = index.namespace('default');
    const result = await targetNamespace.query({
      vector: embeddingRes.data[0].embedding,
      topK: 3,
      includeMetadata: true
    });

    console.log('\n📦 Query result:');
    console.dir(result, { depth: null });

  } catch (err) {
    console.error('💥 Error in Pinecone debug:', err);
  }
}

runDebug();
