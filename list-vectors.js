import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';
dotenv.config();

async function listVectors() {
  try {
    console.log('🔑 Checking Pinecone configuration...');
    const pinecone = new Pinecone();
    const index = pinecone.Index(process.env.PINECONE_INDEX_NAME);
    const namespace = process.env.PINECONE_NAMESPACE || 'default';
    
    console.log('📊 Fetching index stats...');
    const stats = await index.describeIndexStats();
    console.log('Index stats:', JSON.stringify(stats, null, 2));
    
    // Try a query with a simple vector
    console.log('\n🔍 Testing a query with a simple vector...');
    const testQuery = await index.namespace(namespace).query({
      vector: Array(1536).fill(0),
      topK: 5,
      includeMetadata: true
    });
    console.log('Query result:', JSON.stringify(testQuery, null, 2));

    // Try a query with a more meaningful vector (all 0.1s)
    console.log('\n🔍 Testing a query with a more meaningful vector...');
    const meaningfulQuery = await index.namespace(namespace).query({
      vector: Array(1536).fill(0.1),
      topK: 5,
      includeMetadata: true
    });
    console.log('Meaningful query result:', JSON.stringify(meaningfulQuery, null, 2));

    // Try a query with a random vector
    console.log('\n🔍 Testing a query with a random vector...');
    const randomVector = Array(1536).fill(0).map(() => Math.random() - 0.5);
    const randomQuery = await index.namespace(namespace).query({
      vector: randomVector,
      topK: 5,
      includeMetadata: true
    });
    console.log('Random query result:', JSON.stringify(randomQuery, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

listVectors(); 