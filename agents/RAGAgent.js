import OpenAI from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';
import { debugLog } from '../utils/logger.js';

dotenv.config();

export class RAGAgent {
    constructor() {
        this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        this.pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    }

    async initialize() {
        this.index = this.pinecone.index(process.env.PINECONE_INDEX_NAME);
        debugLog(`🔢 PINECONE_INDEX_NAME: ${process.env.PINECONE_INDEX_NAME}`);
    }

    async _handleMessage(message) {
        try {
            const { content, history = [] } = message;
            debugLog(`📥 Embedding for: ${content}`);

            // Get embedding for the question
            const embeddingResponse = await this.openai.embeddings.create({
                model: 'text-embedding-3-small',
                input: content
            });

            const vector = embeddingResponse.data[0].embedding;

            // Query Pinecone
            const results = await this.index.query({
                vector,
                topK: 3,
                includeMetadata: true
            });

            // Get context from matches
            const context = results.matches?.map(m => m.metadata.text).join('\n\n') || '[no docs found]';
            const sources = results.matches?.map(m => m.metadata.source) || [];

            // Format chat history
            const turns = history.map(t =>
                `${t.role === 'user' ? 'User' : 'Bot'}: ${t.content}`
            ).join('\n');

            // Generate response
            const prompt = `
You're Gen Alpha's favorite ecom bot 😎. Respond short, honest, and chill. Be helpful, don't fake it.

Context:
${context}

${turns}
User: ${content}
Bot:
`.trim();

            const completion = await this.openai.chat.completions.create({
                model: 'gpt-4',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.4
            });

            debugLog(`✅ Answer generated`);

            return {
                result: {
                    answer: completion.choices[0].message.content.trim(),
                    sources
                }
            };
        } catch (error) {
            debugLog(`❌ Error in RAGAgent: ${error.message}`);
            return {
                result: {
                    answer: "I'm having trouble finding that information right now. Could you try rephrasing your question?",
                    sources: []
                }
            };
        }
    }
} 