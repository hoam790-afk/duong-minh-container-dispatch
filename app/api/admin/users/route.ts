import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireAdmin } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireAdmin();
    const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, name: true, email: true, role: true, createdAt: true } });
    return NextResponse.json(users);
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Users error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();
    const passwordHash = body.password ? await bcrypt.hash(body.password, 12) : undefined;
    const user = await prisma.user.create({
      data: { name: body.name, email: String(body.email).toLowerCase(), role: body.role || "client", passwordHash }
    });
    await prisma.auditLog.create({ data: { userId: admin.id, action: "CREATE_USER", entityType: "users", entityId: user.id, afterData: user as never } });
    return NextResponse.json(user);
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Users error" }, { status: 500 });
  }
}
