import { jest } from '@jest/globals';

const mockEmbedding = {
    data: [{
        embedding: Array(1536).fill(0.1)
    }]
};

const mockCompletion = {
    choices: [{
        message: {
            content: 'Our refund policy allows returns within 30 days of purchase. Items must be unused and in original packaging.'
        }
    }]
};

const mockChatCompletion = {
    choices: [{
        message: {
            content: 'Our refund policy allows returns within 30 days of purchase. Items must be unused and in original packaging.'
        }
    }]
};

export const mockOpenAI = () => {
    const mockOpenAIInstance = {
        embeddings: {
            create: jest.fn().mockResolvedValue(mockEmbedding)
        },
        chat: {
            completions: {
                create: jest.fn().mockResolvedValue(mockChatCompletion)
            }
        },
        completions: {
            create: jest.fn().mockResolvedValue(mockCompletion)
        }
    };

    jest.mock('openai', () => ({
        OpenAI: jest.fn().mockImplementation(() => mockOpenAIInstance)
    }));

    return mockOpenAIInstance;
}; 