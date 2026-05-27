import { NextResponse } from "next/server";
import { requireUser } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await requireUser();
    const reports = await prisma.dailyContainerReport.findMany({
      where: user.role === "admin" ? {} : { createdBy: user.id },
      include: { items: true, reuseSuggestions: true },
      orderBy: { reportDate: "desc" },
      take: 50
    });
    return NextResponse.json(reports);
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Reports error" }, { status: 500 });
  }
}
