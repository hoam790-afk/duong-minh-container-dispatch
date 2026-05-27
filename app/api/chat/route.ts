import { NextResponse } from "next/server";
import { requireUser } from "@/lib/access";
import { getAiSettings } from "@/lib/openrouter";
import { handleChatMessage } from "@/lib/chat-engine";

export async function GET() {
  const settings = await getAiSettings();
  return NextResponse.json(settings);
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const message = String(body.message || "");
    const customPrompt = body.customPrompt ? String(body.customPrompt) : undefined;
    const settings = await getAiSettings();
    const model = String(body.model || settings.defaultModel);
    if (!message.trim()) return NextResponse.json({ error: "Missing message" }, { status: 400 });
    const result = await handleChatMessage({ message, model, userId: user.id, customPrompt });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
