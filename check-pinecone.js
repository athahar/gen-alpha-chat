import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';
dotenv.config();

async function checkPinecone() {
  try {
    console.log('🔑 Checking Pinecone configuration...');
    console.log('Index name:', process.env.PINECONE_INDEX_NAME);
    
    const pinecone = new Pinecone();
    const index = pinecone.Index(process.env.PINECONE_INDEX_NAME);
    
    console.log('📊 Fetching index stats...');
    const stats = await index.describeIndexStats();
    console.log('Index stats:', JSON.stringify(stats, null, 2));
    
    // Try a simple query to test
    console.log('\n🔍 Testing a simple query...');
    const testQuery = await index.query({
      vector: Array(1536).fill(0), // Dummy vector for testing
      topK: 1,
      includeMetadata: true
    });
    console.log('Query result:', JSON.stringify(testQuery, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

checkPinecone(); 