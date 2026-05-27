import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/access";
import { DEFAULT_MODELS, getAiSettings } from "@/lib/openrouter";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json(await getAiSettings());
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Settings error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();
    const enabledModels = Array.isArray(body.enabledModels) && body.enabledModels.length ? body.enabledModels : DEFAULT_MODELS;
    const settings = await prisma.aiSetting.upsert({
      where: { id: "default" },
      update: {
        defaultModel: body.defaultModel || enabledModels[0],
        enabledModels,
        apiKeyMasked: body.apiKey ? `${String(body.apiKey).slice(0, 8)}...${String(body.apiKey).slice(-4)}` : undefined
      },
      create: {
        id: "default",
        defaultModel: body.defaultModel || enabledModels[0],
        enabledModels,
        apiKeyMasked: body.apiKey ? `${String(body.apiKey).slice(0, 8)}...${String(body.apiKey).slice(-4)}` : null
      }
    });
    await prisma.auditLog.create({ data: { userId: admin.id, action: "UPDATE_AI_SETTINGS", entityType: "ai_settings", entityId: settings.id, afterData: { defaultModel: settings.defaultModel, enabledModels } } });
    return NextResponse.json(settings);
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Settings error" }, { status: 500 });
  }
}
