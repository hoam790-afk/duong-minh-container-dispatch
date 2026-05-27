import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { requireAdmin } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { normalizeText } from "@/lib/utils";

export async function GET() {
  try {
    await requireAdmin();
    const prices = await prisma.externalTruckPrice.findMany({ orderBy: { updatedAt: "desc" }, take: 200 });
    return NextResponse.json(prices);
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Prices error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file") as File | null;
      if (!file) return NextResponse.json({ error: "Missing file" }, { status: 400 });
      const buffer = Buffer.from(await file.arrayBuffer());
      const workbook = XLSX.read(buffer);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
      const created = await prisma.externalTruckPrice.createMany({
        data: rows.map((row) => ({
          vendorName: normalizeText(String(row.vendor_name || row.vendorName || row["Nhà xe"] || "")),
          routeFrom: normalizeText(String(row.route_from || row.routeFrom || row["Điểm đi"] || "")),
          routeTo: normalizeText(String(row.route_to || row.routeTo || row["Điểm đến"] || "")),
          containerType: String(row.container_type || row.containerType || row["Loại cont"] || "CHƯA ĐỦ DỮ LIỆU"),
          price: Number(row.price || row["Giá"] || 0),
          currency: String(row.currency || "VND"),
          validFrom: new Date(String(row.valid_from || row.validFrom || row["Hiệu lực từ"] || new Date()))
        }))
      });
      await prisma.auditLog.create({ data: { userId: admin.id, action: "IMPORT_PRICES", entityType: "external_truck_prices", afterData: { count: created.count } } });
      return NextResponse.json(created);
    }

    const body = await request.json();
    const price = await prisma.externalTruckPrice.create({
      data: {
        vendorName: normalizeText(body.vendorName),
        routeFrom: normalizeText(body.routeFrom),
        routeTo: normalizeText(body.routeTo),
        containerType: body.containerType,
        price: Number(body.price),
        currency: body.currency || "VND",
        validFrom: body.validFrom ? new Date(body.validFrom) : new Date(),
        validTo: body.validTo ? new Date(body.validTo) : null,
        note: body.note
      }
    });
    await prisma.auditLog.create({ data: { userId: admin.id, action: "CREATE_PRICE", entityType: "external_truck_prices", entityId: price.id, afterData: price as never } });
    return NextResponse.json(price);
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Prices error" }, { status: 500 });
  }
}
