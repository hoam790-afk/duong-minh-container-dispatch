import { NextResponse } from "next/server";
import { requireUser } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const customer = searchParams.get("customer") || undefined;
    const type = searchParams.get("type") as "export" | "import" | null;
    const where = {
      ...(user.role === "admin" ? {} : { createdBy: user.id }),
      ...(customer ? { customerName: { contains: customer, mode: "insensitive" as const } } : {}),
      ...(type ? { bookingType: type } : {})
    };
    const bookings = await prisma.booking.findMany({ where, orderBy: { createdAt: "desc" }, take: 100 });
    return NextResponse.json(bookings);
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Bookings error" }, { status: 500 });
  }
}
