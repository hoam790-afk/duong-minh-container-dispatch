import { NextResponse } from "next/server";
import { requireUser } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await requireUser();
    const assignments = await prisma.truckAssignment.findMany({
      where: user.role === "admin" ? {} : { assignedBy: user.id },
      include: { booking: true, internalTruck: true, externalVendor: true },
      orderBy: { assignedAt: "desc" },
      take: 100
    });
    return NextResponse.json(assignments);
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Assignments error" }, { status: 500 });
  }
}
