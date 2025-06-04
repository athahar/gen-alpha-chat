import { jest } from '@jest/globals';
import { RAGAgent } from '../../agents/RAGAgent.js';
import { mockOpenAI } from '../mocks/openai';

// Mock environment variables
process.env.OPENAI_API_KEY = 'mock-openai-key';
process.env.PINECONE_API_KEY = 'mock-pinecone-key';
process.env.PINECONE_ENVIRONMENT = 'mock-environment';
process.env.PINECONE_INDEX_NAME = 'mock-index';

describe('RAGAgent', () => {
    let agent;

    beforeEach(() => {
        agent = new RAGAgent();
        mockOpenAI();
    });

    test('should answer a basic customer question', async () => {
        const message = {
            content: 'What is your refund policy?',
            userId: 'test-user'
        };

        const result = await agent._handleMessage(message);
        
        expect(result.result).toHaveProperty('answer');
        expect(result.result.answer).toContain('refund');
        expect(result.result.answer).toContain('days');
    });

    test('should handle questions with no relevant context', async () => {
        const message = {
            content: 'What is the meaning of life?',
            userId: 'test-user'
        };

        const result = await agent._handleMessage(message);
        
        expect(result.result).toHaveProperty('answer');
        expect(result.result.answer).toContain('trouble finding');
    });
}); 