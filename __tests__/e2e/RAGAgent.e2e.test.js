import { jest } from '@jest/globals';
import { RAGAgent } from '../../agents/RAGAgent.js';
import dotenv from 'dotenv';

dotenv.config();

// Only run E2E tests if OPENAI_API_KEY is set
const shouldRunE2E = process.env.OPENAI_API_KEY && process.env.PINECONE_API_KEY;

// Skip all tests if no API keys
const describeE2E = shouldRunE2E ? describe : describe.skip;

describeE2E('RAGAgent E2E', () => {
    let agent;

    beforeAll(async () => {
        agent = new RAGAgent();
        await agent.initialize();
    });

    describe('Customer Service Questions', () => {
        test('should answer order status questions', async () => {
            const message = {
                content: 'Where is my order?',
                userId: 'test-user-1',
                history: []
            };

            const result = await agent._handleMessage(message);

            expect(result.result).toHaveProperty('answer');
            expect(result.result.answer).toMatch(/order|shipping|delivery|tracking|status/i);
            expect(Array.isArray(result.result.sources)).toBe(true);
        }, 30000);

        test('should answer refund policy questions', async () => {
            const message = {
                content: 'What is your refund policy?',
                userId: 'test-user-2',
                history: []
            };

            const result = await agent._handleMessage(message);

            expect(result.result).toHaveProperty('answer');
            expect(result.result.answer).toMatch(/refund|policy|return|money|days|business/i);
            expect(Array.isArray(result.result.sources)).toBe(true);
        }, 30000);

        test('should maintain context in follow-up questions', async () => {
            // Initial question
            const initialMessage = {
                content: 'What is your return policy?',
                userId: 'test-user-3',
                history: []
            };

            const initialResult = await agent._handleMessage(initialMessage);

            // Follow-up question
            const followUpMessage = {
                content: 'How do I start a return?',
                userId: 'test-user-3',
                history: [
                    { role: 'user', content: initialMessage.content },
                    { role: 'assistant', content: initialResult.result.answer }
                ]
            };

            const result = await agent._handleMessage(followUpMessage);

            expect(result.result.answer).toMatch(/return|process|start|initiate|begin|steps|instructions/i);
            expect(Array.isArray(result.result.sources)).toBe(true);
        }, 30000);
    });

    describe('Error Handling', () => {
        test('should handle questions with no relevant context', async () => {
            const message = {
                content: 'What is the meaning of life?',
                userId: 'test-user-4',
                history: []
            };

            const result = await agent._handleMessage(message);

            expect(result.result).toHaveProperty('answer');
            expect(result.result.answer).toBeTruthy();
            expect(Array.isArray(result.result.sources)).toBe(true);
        }, 30000);
    });

    describe('Performance', () => {
        test('should respond within reasonable time', async () => {
            const startTime = Date.now();

            const message = {
                content: 'Where is my order?',
                userId: 'test-user-5',
                history: []
            };

            await agent._handleMessage(message);

            const endTime = Date.now();
            const responseTime = endTime - startTime;

            expect(responseTime).toBeLessThan(10000); // Should complete within 10 seconds
        }, 20000);
    });
}); 