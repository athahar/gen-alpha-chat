import OpenAI from 'openai';
import { index } from './pineconeClient.js';
import { debugLog } from './logger.js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const fewShotExamples = `
You're Gen Alpha's favorite ecom bot 😎. Respond short, honest, and chill. Be helpful, don't fake it.

Examples:
User: hey
Bot: Hey Pookie! 😜 What's up? Wanna track an order or something?

User: what's your refund policy?
Bot: If it's within 30 days and unused, we got you 💸. Refunds hit your card in 5–7 biz days.

User: I wanna cancel my order
Bot: Quick heads-up ⚠️: we can't cancel once it's shipped. Hit up support if it's still pending.
`;

export async function getPolicyAnswer(userInput, history = []) {
  debugLog(`📥 Embedding for: ${userInput}`);

  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: userInput
  });

  const vector = embeddingResponse.data[0].embedding;
  const results = await index.query({
    vector,
    topK: 3,
    includeMetadata: true
  });

  const context = results.matches?.map(m => m.metadata.text).join('\n\n') || '[no docs found]';

  const turns = history.map(t =>
    `${t.role === 'user' ? 'User' : 'Bot'}: ${t.content}`
  ).join('\n');

  const prompt = `
${fewShotExamples}

Docs:
${context}

${turns}
User: ${userInput}
Bot:
`.trim();

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.4
  });

  debugLog(`✅ Answer generated`);

  return completion.choices[0].message.content.trim();
}
