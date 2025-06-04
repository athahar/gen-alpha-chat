// agents/policyRAGAgent.js
import { queryPinecone } from '../utils/pineconeClient.js';
import { debugLog } from '../utils/logger.js';

/**
 * Finds policy answer using Pinecone-based RAG
 * @param {string} message
 * @param {object} memory
 * @returns {Promise<object>} updated memory
 */
export async function policyRAGAgent(message, memory) {
  debugLog('📚 Starting policy search');
  try {
    debugLog('🔍 Querying Pinecone');
    const topResult = await queryPinecone(message);
    
    debugLog(`📊 Search result:`, topResult);
    
    // Lower threshold to 0.3 since we're using text-embedding-3-small
    if (!topResult || typeof topResult.score !== 'number' || topResult.score < 0.3) {
      debugLog(`ℹ️ No relevant policy found (score: ${topResult?.score})`);
      return memory; // do not set policyAnswer
    }

    debugLog(`✅ Found relevant policy (score: ${topResult.score})`);
    
    // Format the response to be more concise and clear
    const policyText = topResult.text.trim();
    const formattedResponse = policyText
      .split('.')
      .filter(sentence => 
        sentence.toLowerCase().includes('return') || 
        sentence.toLowerCase().includes('refund') ||
        sentence.toLowerCase().includes('exchange')
      )
      .join('. ')
      .trim();

    return {
      ...memory,
      policyAnswer: formattedResponse || policyText
    };
  } catch (err) {
    debugLog(`❌ Policy search error: ${err.message}`);
    console.error('[policyRAGAgent] Error:', err);
    return {
      ...memory,
      policyAnswer: 'I encountered an error while searching our policies. Please try again or contact customer support.'
    };
  }
} 
