import OpenAI from 'openai';
import { config } from 'dotenv';
config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function runJudge(data) {
  console.log("👩‍⚖️ AI EVAL judge — starting...");
  const prompt = `You're an evaluator. Rate the assistant’s Gen Alpha reply on:
1. Helpfulness (1–5)
2. Gen Alpha tone (1–5)

Question: ${data.question}
Answer: ${data.genAlphaReply}

Respond ONLY with a raw JSON object:
{"helpfulness": 3, "tone": 5, "reason": "..."}`;

  const chat = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }]
  });

  let raw = chat.choices[0].message.content.trim();
  if (raw.startsWith("```")) {
    raw = raw.replace(/```json|```/g, "").trim();
  }

  const result = JSON.parse(raw);
  result.timestamp = new Date().toISOString();
  result.id = data.id;
  result.question = data.question;
  result.genAlphaReply = data.genAlphaReply;

  console.log("👩‍⚖️ AI EVAL judge — done. Result:", result);
  return result;
}