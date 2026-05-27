import { NextResponse } from "next/server";
import { requireUser } from "@/lib/access";
import { endOfDay, startOfVietnamDay } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

type BookingRow = {
  customerName: string;
  bookingType: "export" | "import";
  containerCount: number;
};

function groupByCustomer(bookings: BookingRow[]) {
  const map = new Map<string, { name: string; export: number; import: number; total: number }>();
  for (const booking of bookings) {
    const current = map.get(booking.customerName) || { name: booking.customerName, export: 0, import: 0, total: 0 };
    current[booking.bookingType] += booking.containerCount;
    current.total += booking.containerCount;
    map.set(booking.customerName, current);
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

export async function GET() {
  try {
    const user = await requireUser();
    const today = startOfVietnamDay();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() + 1);

    const scope = user.role === "admin" ? {} : { createdBy: user.id };
    const [todayBookings, weekBookings, monthBookings, topCustomers, assignments, reuseCount, externalCost] =
      await Promise.all([
        prisma.booking.findMany({ where: { ...scope, bookingDate: { gte: today, lte: endOfDay(today) } } }),
        prisma.booking.findMany({ where: { ...scope, bookingDate: { gte: weekStart, lte: endOfDay(today) } } }),
        prisma.booking.findMany({ where: { ...scope, bookingDate: { gte: monthStart, lte: endOfDay(today) } } }),
        prisma.booking.groupBy({ by: ["customerName"], _sum: { containerCount: true }, orderBy: { _sum: { containerCount: "desc" } }, take: 10 }),
        prisma.truckAssignment.findMany({ include: { booking: true, internalTruck: true, externalVendor: true }, orderBy: { assignedAt: "desc" }, take: 20 }),
        prisma.reuseContainerSuggestion.count({ where: { createdAt: { gte: monthStart } } }),
        prisma.truckAssignment.aggregate({ where: { selectedType: "external" }, _sum: { selectedPrice: true } })
      ]);

    const sum = (items: typeof todayBookings, type?: "export" | "import") =>
      items.filter((item) => !type || item.bookingType === type).reduce((total, item) => total + item.containerCount, 0);

    const shippingLines = await prisma.booking.groupBy({
      by: ["shippingLine"],
      _sum: { containerCount: true },
      orderBy: { _sum: { containerCount: "desc" } },
      take: 8
    });

    return NextResponse.json({
      kpis: {
        todayTotal: sum(todayBookings),
        todayExport: sum(todayBookings, "export"),
        todayImport: sum(todayBookings, "import"),
        weekTotal: sum(weekBookings),
        monthTotal: sum(monthBookings),
        externalCost: Number(externalCost._sum.selectedPrice || 0),
        internalUses: assignments.filter((a) => a.selectedType === "internal").length,
        externalUses: assignments.filter((a) => a.selectedType === "external").length,
        reuseCount,
        estimatedSaving: reuseCount * 1800000
      },
      dailyCustomers: groupByCustomer(todayBookings),
      monthlyCustomers: groupByCustomer(monthBookings),
      topCustomers: topCustomers.map((item) => ({ name: item.customerName, total: item._sum.containerCount || 0 })),
      shippingLines: shippingLines.map((item) => ({ name: item.shippingLine || "CHƯA ĐỦ DỮ LIỆU", total: item._sum.containerCount || 0 })),
      assignments
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Dashboard error" }, { status: 500 });
  }
}
