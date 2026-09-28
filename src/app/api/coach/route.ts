import { NextRequest, NextResponse } from "next/server";
import { respondToCoachPrompt } from "@/lib/move/aiCoach";

export const maxDuration = 30;

const SYSTEM_PROMPT =
  "You are a supportive, encouraging fitness coach inside a wellness app called Swasth Bharat. " +
  "Answer in 1-3 short sentences, plain language, no medical claims. " +
  "You are not a doctor; for pain or injury, tell the person to see a professional.";

async function askGroq(prompt: string, apiKey: string): Promise<string | null> {
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        max_tokens: 200,
        temperature: 0.6,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content?.trim();
    return text || null;
  } catch {
    return null;
  }
}

async function askOllama(prompt: string): Promise<string | null> {
  try {
    const res = await fetch("http://127.0.0.1:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3.2:1b",
        prompt: `${SYSTEM_PROMPT}\n\nUser: ${prompt}\nCoach:`,
        stream: false,
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data.response?.trim();
    return text || null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const { prompt } = await req.json();
  if (typeof prompt !== "string" || !prompt.trim()) {
    return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
  }

  const fallback = respondToCoachPrompt(prompt);
  let text = fallback.text;
  let source: "groq" | "ollama" | "rules" = "rules";

  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    const groqText = await askGroq(prompt, groqKey);
    if (groqText) {
      text = groqText;
      source = "groq";
    }
  }

  if (source === "rules") {
    const ollamaText = await askOllama(prompt);
    if (ollamaText) {
      text = ollamaText;
      source = "ollama";
    }
  }

  return NextResponse.json({
    text,
    ctaLabel: fallback.ctaLabel,
    workoutTemplateId: fallback.workoutTemplateId,
    source,
  });
}
