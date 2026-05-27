import { prisma } from "@/lib/prisma";

export const DEFAULT_MODELS = [
  "openai/gpt-4o-mini",
  "anthropic/claude-3.5-sonnet",
  "google/gemini-flash-1.5",
  "meta-llama/llama-3.1-70b-instruct",
  "deepseek/deepseek-chat",
  "mistralai/mistral-large"
];

export async function getAiSettings() {
  const settings = await prisma.aiSetting.findFirst();
  return {
    defaultModel: settings?.defaultModel || process.env.OPENROUTER_DEFAULT_MODEL || DEFAULT_MODELS[0],
    enabledModels: settings?.enabledModels?.length ? settings.enabledModels : DEFAULT_MODELS,
    apiKeyMasked: settings?.apiKeyMasked || (process.env.OPENROUTER_API_KEY ? "********" : null)
  };
}

export async function callOpenRouter({
  model,
  system,
  message
}: {
  model: string;
  system: string;
  message: string;
}) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "http://localhost:3000",
      "X-Title": process.env.OPENROUTER_APP_NAME || "Duong Minh Container Dispatch"
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: message }
      ],
      temperature: 0.1
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenRouter error ${response.status}: ${detail}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content as string | undefined;
}
