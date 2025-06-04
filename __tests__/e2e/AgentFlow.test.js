import { jest } from '@jest/globals';
import { OrchestrationAgent } from '../../agents/OrchestrationAgent.js';
import { IntentDetectionAgent } from '../../agents/IntentDetectionAgent.js';
import { RAGAgent } from '../../agents/RAGAgent.js';
import { OrderManagementAgent } from '../../agents/OrderManagementAgent.js';

// Mock environment variables
process.env.SUPABASE_URL = 'https://mock-supabase-url.supabase.co';
process.env.SUPABASE_ANON_KEY = 'mock-anon-key';
process.env.OPENAI_API_KEY = 'mock-openai-key';
process.env.PINECONE_API_KEY = 'mock-pinecone-key';
process.env.PINECONE_ENVIRONMENT = 'mock-environment';
process.env.PINECONE_INDEX_NAME = 'mock-index';

// Mock global fetch
global.fetch = jest.fn(() =>
    Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: { id: '12345', status: 'shipped' } })
    })
);

// Mock Supabase client
jest.mock('@supabase/supabase-js', () => ({
    createClient: jest.fn(() => ({
        from: jest.fn((tableName) => ({
            select: jest.fn((columns) => ({
                eq: jest.fn((column, value) => ({
                    single: jest.fn(async () => ({
                        data: {
                            id: value,
                            status: 'shipped',
                            shipping_status: 'in_transit',
                            created_at: '2023-10-26T10:00:00.000Z',
                            updated_at: '2023-10-27T10:00:00.000Z'
                        },
                        error: null
                    }))
                }))
            }))
        }))
    }))
}));

// Mock OpenAI
jest.mock('openai', () => ({
    OpenAI: jest.fn(() => ({
        chat: {
            completions: {
                create: jest.fn(async () => ({
                    choices: [{
                        message: {
                            content: 'Mock response'
                        }
                    }]
                }))
            }
        }
    }))
}));

// Mock Pinecone
jest.mock('@pinecone-database/pinecone', () => ({
    Pinecone: jest.fn(() => ({
        Index: jest.fn(() => ({
            query: jest.fn(async () => ({
                matches: [{
                    id: 'doc1',
                    score: 0.9,
                    metadata: {
                        text: 'Mock document content'
                    }
                }]
            }))
        }))
    }))
}));

describe('Agent Flow E2E', () => {
    let orchestrationAgent;
    let intentAgent;
    let ragAgent;
    let orderAgent;

    beforeAll(async () => {
        // Initialize agents
        intentAgent = new IntentDetectionAgent();
        ragAgent = new RAGAgent();
        orderAgent = new OrderManagementAgent();
        orchestrationAgent = new OrchestrationAgent();

        await Promise.all([
            intentAgent.initialize(),
            ragAgent.initialize(),
            orderAgent.initialize(),
            orchestrationAgent.initialize()
        ]);

        // Register agents with orchestrator
        orchestrationAgent.registerAgent('intent', intentAgent);
        orchestrationAgent.registerAgent('rag', ragAgent);
        orchestrationAgent.registerAgent('order', orderAgent);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Order Status Flow', () => {
        test('should handle order status questions through orchestration', async () => {
            const message = {
                content: 'Where is my order 12345?',
                userId: 'test-user',
                history: []
            };

            const response = await orchestrationAgent._handleMessage(message);

            // First response should ask for verification
            expect(response.result.answer).toContain('verify your identity');
            expect(response.result.answer).toContain('email address');

            // Simulate email response
            const emailResponse = await orchestrationAgent._handleMessage({
                content: 'test@example.com',
                userId: 'test-user',
                history: [message, response]
            });

            expect(emailResponse.result.answer).toContain('phone number');

            // Simulate phone response
            const phoneResponse = await orchestrationAgent._handleMessage({
                content: '123-456-7890',
                userId: 'test-user',
                history: [message, response, emailResponse]
            });

            // Final response should contain order status
            expect(phoneResponse.result.answer).toContain('Order #12345');
            expect(phoneResponse.result.answer).toContain('shipped');
        });
    });

    describe('Refund Policy Flow', () => {
        test('should handle refund policy questions through orchestration', async () => {
            const message = {
                content: 'What is your refund policy?',
                userId: 'test-user',
                history: []
            };

            const response = await orchestrationAgent._handleMessage(message);

            // Policy questions should go directly to RAG agent
            expect(response.result.answer).toContain('Mock response');
        });
    });

    describe('Error Handling', () => {
        test('should handle questions with no relevant context', async () => {
            const message = {
                content: 'What is the meaning of life?',
                userId: 'test-user',
                history: []
            };

            const response = await orchestrationAgent._handleMessage(message);

            expect(response.result.answer).toContain('Mock response');
        });

        test('should handle invalid order numbers', async () => {
            const message = {
                content: 'Where is my order 99999?',
                userId: 'test-user',
                history: []
            };

            const response = await orchestrationAgent._handleMessage(message);

            // First response should ask for verification
            expect(response.result.answer).toContain('verify your identity');

            // Simulate verification
            const emailResponse = await orchestrationAgent._handleMessage({
                content: 'test@example.com',
                userId: 'test-user',
                history: [message, response]
            });

            const phoneResponse = await orchestrationAgent._handleMessage({
                content: '123-456-7890',
                userId: 'test-user',
                history: [message, response, emailResponse]
            });

            // Should handle invalid order gracefully
            expect(phoneResponse.result.answer).toContain('Sorry');
        });
    });
}); 