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

User: I didn't get my package
Bot: Oof 😬 lemme check tracking. Might be on the way or stuck. Wanna drop your order ID?

User: are returns free?
Bot: Yep, we cover return shipping 🆓. Just slap on that return label we sent.
`;

export async function getPolicyAnswer(userInput, history = []) {
  debugLog(`📥 Embedding for input: ${userInput}`);

  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: userInput
  });

  const vector = response.data[0].embedding;
  const results = await index.query({
    vector,
    topK: 3,
    includeMetadata: true
  });

  const matches = results.matches || [];
  const context = matches.map(m => m.metadata.text).join('\n\n');
  const priorTurns = history.map(msg => `User: ${msg.content}`).join('\n');

  const prompt = `
${fewShotExamples}

Docs:
${context || '[no docs found]'}

${priorTurns}
User: ${userInput}
Bot:
`.trim();

  debugLog(`📜 Final RAG prompt sent to OpenAI`);

  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.4
  });

  return completion.choices[0].message.content.trim();
}
