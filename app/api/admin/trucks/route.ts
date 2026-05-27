import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireAdmin();
    const trucks = await prisma.internalTruck.findMany({ orderBy: [{ teamName: "asc" }, { truckNo: "asc" }] });
    return NextResponse.json(trucks);
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Trucks error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();
    const truck = await prisma.internalTruck.create({
      data: { teamName: body.teamName, truckNo: body.truckNo, trailerNo: body.trailerNo, status: body.status || "available", note: body.note }
    });
    await prisma.auditLog.create({ data: { userId: admin.id, action: "CREATE_TRUCK", entityType: "internal_trucks", entityId: truck.id, afterData: truck as never } });
    return NextResponse.json(truck);
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Trucks error" }, { status: 500 });
  }
}
