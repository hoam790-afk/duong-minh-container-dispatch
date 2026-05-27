import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const checks = {
    app: "ok",
    openRouter: {
      keyConfigured: Boolean(process.env.OPENROUTER_API_KEY),
      defaultModel: process.env.OPENROUTER_DEFAULT_MODEL || "openai/gpt-4o-mini"
    },
    database: {
      connected: false,
      error: null as string | null
    }
  };

  try {
    await prisma.$queryRaw`select 1`;
    checks.database.connected = true;
  } catch (error) {
    checks.database.error = error instanceof Error ? error.message.replace(/\s+/g, " ").slice(0, 300) : "Unknown database error";
  }

  return NextResponse.json(checks, {
    status: checks.database.connected && checks.openRouter.keyConfigured ? 200 : 503
  });
}
