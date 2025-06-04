import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config();

import { debugLog } from './logger.js';


export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function embedText(text) {
  const res = await openai.embeddings.create({
    input: text,
    model: 'text-embedding-3-small'
  });
  return res.data[0].embedding;
}

export async function answerFromContext(context, question) {
  const prompt = `Answer the question based on the following context:\n\n${context}\n\nQ: ${question}`;
  const res = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2
  });
  return res.choices[0].message.content;
}
