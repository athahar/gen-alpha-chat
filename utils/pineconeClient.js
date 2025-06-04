// utils/pineconeClient.js
import { Pinecone } from '@pinecone-database/pinecone';
import { embedText } from './openAIClient.js';
import dotenv from 'dotenv';
dotenv.config();

const pinecone = new Pinecone();
const indexName = process.env.PINECONE_INDEX_NAME;
const namespace = process.env.PINECONE_NAMESPACE || 'default';

console.log('🔑 Using Pinecone index:', indexName, 'namespace:', namespace);
export const index = pinecone.Index(indexName);

/**
 * Queries Pinecone using OpenAI embedding and enforces semantic relevance
 * @param {string} query
 * @returns {Promise<{ text: string, score: number } | null>}
 */
export async function queryPinecone(query) {
  console.log('🔍 Querying Pinecone with:', query);

  // Add light semantic framing to improve match quality
  const enhancedQuery = `return policy information: ${query}`;
  const embedding = await embedText(enhancedQuery);
  console.log('📊 Generated embedding of length:', embedding.length);

  const result = await index.namespace(namespace).query({
    vector: embedding,
    topK: 5,
    includeMetadata: true,
    includeValues: false
  });

  console.log('📦 Raw Pinecone result:', JSON.stringify(result, null, 2));

  // Filter to only matches that semantically mention refund/return/exchange
  const returnPolicyMatch = result.matches?.find(match => {
    const text = match.metadata?.text?.toLowerCase() || '';
    return text.includes('refund') || text.includes('return') || text.includes('exchange');
  });

  if (returnPolicyMatch) {
    console.log('🎯 Best match:', {
      score: returnPolicyMatch.score,
      preview: returnPolicyMatch.metadata?.text?.slice(0, 160) + '...',
      source: returnPolicyMatch.metadata?.source
    });

    return {
      text: returnPolicyMatch.metadata?.text || '',
      score: returnPolicyMatch.score
    };
  }

  console.warn('❌ No semantically relevant match found (refund/return/exchange)');
  return null;
}
