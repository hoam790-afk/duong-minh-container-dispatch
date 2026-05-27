import { Prisma, type Booking, type BookingType } from "@prisma/client";
import { endOfDay, missing, normalizeText, startOfVietnamDay } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { callOpenRouter } from "@/lib/openrouter";

type ParsedBooking = {
  bookingType: BookingType;
  customerName: string;
  fileNo?: string;
  bookingNo?: string;
  containerNo?: string;
  containerCount?: number;
  containerType?: string;
  shippingLine?: string;
  pickupLocation?: string;
  deliveryLocation?: string;
  emptyPickupYard?: string;
  emptyReturnYard?: string;
  note?: string;
};

type ParsedPrice = {
  vendorName: string;
  routeFrom: string;
  routeTo: string;
  containerType?: string;
  price: number;
  validFrom?: Date;
};

const UNKNOWN = "CH\u01afA \u0110\u1ee6 D\u1eee LI\u1ec6U";

function intentText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

function valueAfter(text: string, label: RegExp) {
  const match = text.match(label);
  return match?.[1]?.trim().replace(/[,.]$/, "");
}

function extractCustomer(message: string) {
  return valueAfter(message, /(?:kh\u00e1ch|khach)\s+([^,.\n]+)/i) || UNKNOWN;
}

function extractShippingLine(message: string) {
  return valueAfter(message, /(?:h\u00e3ng\s+t\u00e0u|hang\s+tau)\s+([^,.\n]+)/i);
}

function extractContainerNo(message: string) {
  return valueAfter(message, /\bcont(?:ainer)?\s+([A-Z]{3,4}\d{6,7})/i);
}

function extractBookingNo(message: string) {
  return valueAfter(message, /booking\s+([A-Z0-9-]+)/i);
}

function extractContainerCount(message: string) {
  const match = message.match(/(\d+)\s*(?:cont|container)\b/i);
  return match ? Number(match[1]) : 1;
}

function extractContainerType(message: string) {
  const match = message.match(/\bcont\s*(20|40|45)\b/i) || message.match(/\b(20|40|45)\s*(?:feet|ft)\b/i);
  return match?.[1];
}

function parseDateFromMessage(message: string) {
  const match = message.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (!match) return startOfVietnamDay();
  return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
}

function parseBooking(message: string): ParsedBooking | null {
  const intent = intentText(message);
  const isExport = /hang\s*xuat|xuat/.test(intent);
  const isImport = /hang\s*nhap|nhap/.test(intent);
  if (!isExport && !isImport) return null;

  return {
    bookingType: isExport ? "export" : "import",
    customerName: normalizeText(extractCustomer(message)),
    fileNo: valueAfter(message, /file\s+([A-Z0-9-]+)/i),
    bookingNo: extractBookingNo(message),
    containerNo: extractContainerNo(message),
    containerCount: extractContainerCount(message),
    containerType: extractContainerType(message),
    shippingLine: extractShippingLine(message)?.toUpperCase(),
    emptyPickupYard: valueAfter(message, /(?:b\u00e3i\s+l\u1ea5y\s+r\u1ed7ng|bai\s+lay\s+rong)\s+([^,.\n]+)/i)?.toUpperCase(),
    deliveryLocation:
      valueAfter(message, /(?:h\u1ea1|ha|giao|\u0111i|di)\s+([^,.\n]+)/i)?.toUpperCase() ||
      valueAfter(message, /(?:c\u1ea3ng\s+h\u1ea1|cang\s+ha)\s+([^,.\n]+)/i)?.toUpperCase(),
    pickupLocation: valueAfter(message, /(?:l\u1ea5y|lay|t\u1eeb|tu)\s+([^,.\n]+)/i)?.toUpperCase(),
    note: /ngay giao chua co du lieu|chua co du lieu/.test(intent) ? UNKNOWN : undefined
  };
}

function parseExternalPrice(message: string): ParsedPrice | null {
  const intent = intentText(message);
  if (!/bao gia|gia xe/.test(intent)) return null;
  const vendorName =
    valueAfter(message, /(?:nh\u00e0\s+xe|nha\s+xe)\s+([^,.\n]+?)\s+(?:b\u00e1o\s+gi\u00e1|bao\s+gia)/i) ||
    valueAfter(message, /(?:nh\u00e0\s+xe|nha\s+xe)\s+([^,.\n]+)/i);
  const route = message.match(/(?:b\u00e1o\s+gi\u00e1|bao\s+gia)?\s*([^,.\n]+?)\s+(?:\u0111i|di|->|-)\s+([^,.\n]+?)\s+cont/i);
  const priceMatch = message.match(/(\d{1,3}(?:[.\s]\d{3})+|\d+)\s*(?:VND|\u0111|dong)?/i);
  if (!vendorName || !route || !priceMatch) return null;
  return {
    vendorName: normalizeText(vendorName),
    routeFrom: normalizeText(route[1].replace(/b\u00e1o\s+gi\u00e1|bao\s+gia/i, "")),
    routeTo: normalizeText(route[2]),
    containerType: extractContainerType(message),
    price: Number(priceMatch[1].replace(/[.\s]/g, "")),
    validFrom: parseDateFromMessage(message)
  };
}

async function upsertBooking(parsed: ParsedBooking, userId: string) {
  const bookingDate = startOfVietnamDay();
  const customerName = parsed.customerName || UNKNOWN;
  let existing: Booking | null = null;

  if (parsed.fileNo && parsed.containerNo) {
    existing = await prisma.booking.findFirst({
      where: { fileNo: parsed.fileNo, containerNo: normalizeText(parsed.containerNo), customerName }
    });
  }

  if (!existing && !parsed.containerNo && parsed.bookingNo) {
    existing = await prisma.booking.findFirst({
      where: { bookingNo: parsed.bookingNo, customerName, bookingDate: { gte: bookingDate, lte: endOfDay(bookingDate) } }
    });
  }

  const data = {
    bookingDate,
    bookingType: parsed.bookingType,
    customerName,
    fileNo: parsed.fileNo,
    bookingNo: parsed.bookingNo,
    containerNo: parsed.containerNo ? normalizeText(parsed.containerNo) : undefined,
    containerCount: parsed.containerCount || 1,
    containerType: parsed.containerType || UNKNOWN,
    shippingLine: parsed.shippingLine || UNKNOWN,
    pickupLocation: parsed.pickupLocation || UNKNOWN,
    deliveryLocation: parsed.deliveryLocation || UNKNOWN,
    emptyPickupYard: parsed.emptyPickupYard || UNKNOWN,
    emptyReturnYard: parsed.emptyReturnYard || UNKNOWN,
    note: parsed.note || undefined,
    status: parsed.note === UNKNOWN ? "missing_data" : "draft",
    createdBy: userId
  } satisfies Prisma.BookingUncheckedCreateInput;

  if (existing) {
    const updated = await prisma.booking.update({
      where: { id: existing.id },
      data: {
        bookingNo: existing.bookingNo || data.bookingNo,
        containerNo: existing.containerNo || data.containerNo,
        containerCount: Math.max(existing.containerCount || 1, data.containerCount || 1),
        containerType: existing.containerType === UNKNOWN ? data.containerType : existing.containerType,
        shippingLine: existing.shippingLine === UNKNOWN ? data.shippingLine : existing.shippingLine,
        pickupLocation: existing.pickupLocation === UNKNOWN ? data.pickupLocation : existing.pickupLocation,
        deliveryLocation: existing.deliveryLocation === UNKNOWN ? data.deliveryLocation : existing.deliveryLocation,
        emptyPickupYard: existing.emptyPickupYard === UNKNOWN ? data.emptyPickupYard : existing.emptyPickupYard,
        emptyReturnYard: existing.emptyReturnYard === UNKNOWN ? data.emptyReturnYard : existing.emptyReturnYard,
        note: existing.note || data.note
      }
    });
    return { booking: updated, duplicate: true };
  }

  const booking = await prisma.booking.create({ data });
  return { booking, duplicate: false };
}

async function createPrice(parsed: ParsedPrice, userId: string) {
  const price = await prisma.externalTruckPrice.create({
    data: {
      vendorName: parsed.vendorName,
      routeFrom: parsed.routeFrom,
      routeTo: parsed.routeTo,
      containerType: parsed.containerType || UNKNOWN,
      price: parsed.price,
      validFrom: parsed.validFrom || startOfVietnamDay(),
      currency: "VND"
    }
  });
  await prisma.auditLog.create({
    data: { userId, action: "CREATE_PRICE", entityType: "external_truck_prices", entityId: price.id, afterData: price as never }
  });
  return price;
}

async function assignTruck(message: string, userId: string, model: string) {
  const fileNo = valueAfter(message, /file\s+([A-Z0-9-]+)/i);
  const bookingNo = extractBookingNo(message);
  const containerNo = extractContainerNo(message);
  const searchConditions = [fileNo ? { fileNo } : null, bookingNo ? { bookingNo } : null, containerNo ? { containerNo: normalizeText(containerNo) } : null].filter(Boolean) as Prisma.BookingWhereInput[];

  const booking = searchConditions.length
    ? await prisma.booking.findFirst({ where: { OR: searchConditions } })
    : null;

  if (!booking) return { text: "CH\u01afA \u0110\u1ee6 D\u1eee LI\u1ec6U \u0110\u1ec2 CH\u1eccN XE. Kh\u00f4ng t\u00ecm th\u1ea5y booking/file/container trong database.", rows: [] };
  if (!booking.deliveryLocation || booking.deliveryLocation === UNKNOWN || !booking.containerType || booking.containerType === UNKNOWN) {
    return { text: "CH\u01afA \u0110\u1ee6 D\u1eee LI\u1ec6U \u0110\u1ec2 CH\u1eccN XE. Booking thi\u1ebfu tuy\u1ebfn ho\u1eb7c lo\u1ea1i container.", rows: [] };
  }

  const internal = await prisma.internalTruck.findFirst({
    where: { status: "available" },
    orderBy: [{ teamName: "asc" }, { truckNo: "asc" }]
  });

  if (internal) {
    const assignment = await prisma.truckAssignment.create({
      data: {
        bookingId: booking.id,
        selectedType: "internal",
        internalTruckId: internal.id,
        reason: `\u01afu ti\u00ean xe nh\u00e0 ${internal.teamName}, xe \u0111ang available v\u00e0 ph\u00f9 h\u1ee3p nguy\u00ean t\u1eafc ch\u1ecdn xe nh\u00e0 tr\u01b0\u1edbc.`,
        aiRecommendation: "Ch\u1ecdn xe nh\u00e0 D\u01b0\u01a1ng Minh tr\u01b0\u1edbc xe ngo\u00e0i.",
        assignedBy: userId,
        aiModel: model
      },
      include: { booking: true, internalTruck: true, externalVendor: true }
    });
    await prisma.internalTruck.update({ where: { id: internal.id }, data: { status: "busy" } });
    return { text: `\u0110\u00e3 ch\u1ecdn xe nh\u00e0 ${internal.truckNo} (${internal.teamName}) cho kh\u00e1ch ${booking.customerName}.`, rows: [assignment] };
  }

  const external = await prisma.externalTruckPrice.findFirst({
    where: {
      routeTo: { contains: normalizeText(booking.deliveryLocation) },
      containerType: { in: [booking.containerType, UNKNOWN] }
    },
    orderBy: [{ price: "asc" }, { updatedAt: "desc" }]
  });

  if (!external) return { text: "CH\u01afA \u0110\u1ee6 D\u1eee LI\u1ec6U \u0110\u1ec2 CH\u1eccN XE. Kh\u00f4ng c\u00f3 xe nh\u00e0 available v\u00e0 ch\u01b0a c\u00f3 b\u00e1o gi\u00e1 xe ngo\u00e0i ph\u00f9 h\u1ee3p.", rows: [] };

  const assignment = await prisma.truckAssignment.create({
    data: {
      bookingId: booking.id,
      selectedType: "external",
      externalVendorId: external.id,
      selectedPrice: external.price,
      reason: `Kh\u00f4ng c\u00f2n xe nh\u00e0 available. Ch\u1ecdn nh\u00e0 xe ngo\u00e0i gi\u00e1 th\u1ea5p nh\u1ea5t cho tuy\u1ebfn ${external.routeFrom} - ${external.routeTo}.`,
      aiRecommendation: "Ch\u1ecdn gi\u00e1 th\u1ea5p nh\u1ea5t, n\u1ebfu b\u1eb1ng gi\u00e1 \u01b0u ti\u00ean b\u00e1o gi\u00e1 c\u1eadp nh\u1eadt m\u1edbi nh\u1ea5t.",
      assignedBy: userId,
      aiModel: model
    },
    include: { booking: true, internalTruck: true, externalVendor: true }
  });
  return { text: `\u0110\u00e3 ch\u1ecdn xe ngo\u00e0i ${external.vendorName}, gi\u00e1 ${Number(external.price).toLocaleString("vi-VN")} VND.`, rows: [assignment] };
}

function buildDailyReportText(date: Date, exports: Booking[], imports: Booking[], suggestions: Array<Record<string, string>>) {
  const totalExport = exports.reduce((sum, item) => sum + item.containerCount, 0);
  const totalImport = imports.reduce((sum, item) => sum + item.containerCount, 0);
  const [dd, mm, yyyy] = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date).split("/");
  const exportRows = exports.map((b, idx) => `| ${idx + 1} | ${b.customerName} | ${missing(b.bookingNo || b.containerNo)} | ${missing(b.emptyPickupYard)} | ${missing(b.deliveryLocation)} | ${missing(b.shippingLine)} |`).join("\n");
  const importRows = imports.map((b, idx) => `| ${idx + 1} | ${b.customerName} | ${missing(b.containerNo)} | ${b.deliveryDate ? b.deliveryDate.toLocaleDateString("vi-VN") : UNKNOWN} | ${missing(b.shippingLine)} | ${b.note || ""} |`).join("\n");
  const reuseRows = suggestions.map((s, idx) => `| ${idx + 1} | ${s.importCustomer} (${s.importContainerNo}) | Ph\u00f9 h\u1ee3p | ${s.importCustomer} | ${s.exportCustomer} | ${s.shippingLine} | ${s.level} |`).join("\n");

  return `C\u1eadp nh\u1eadt ng\u00e0y ${dd} th\u00e1ng ${mm} n\u0103m ${yyyy}

S\u1ed0 L\u01af\u1ee2NG CONTAINER \u0110\u00c3 BOOK XE H\u00d4M NAY: ${totalExport + totalImport} (${totalExport} Xu\u1ea5t + ${totalImport} Nh\u1eadp)

A. H\u00c0NG XU\u1ea4T (${totalExport} Container)

| STT | T\u00ean kh\u00e1ch | Booking / S\u1ed1 Cont | B\u00e3i l\u1ea5y r\u1ed7ng | C\u1ea3ng h\u1ea1 | H\u00e3ng t\u00e0u |
|---|---|---|---|---|---|
${exportRows || "|  | CH\u01afA C\u00d3 D\u1eee LI\u1ec6U |  |  |  |  |"}

B. H\u00c0NG NH\u1eacP (${totalImport} Container)

| STT | T\u00ean kh\u00e1ch | S\u1ed1 cont | Ng\u00e0y giao | H\u00e3ng t\u00e0u | Ghi ch\u00fa |
|---|---|---|---|---|---|
${importRows || "|  | CH\u01afA C\u00d3 D\u1eee LI\u1ec6U |  |  |  |  |"}

C. KH\u1ea2 N\u0102NG T\u00c1I S\u1eec D\u1ee4NG CONT

${suggestions.length ? "C\u00d3 TH\u1ec2 T\u00c1I S\u1eec D\u1ee4NG, chi ti\u1ebft \u1edf ph\u1ea7n III." : "CH\u01afA C\u00d3 D\u1eee LI\u1ec6U PH\u00d9 H\u1ee2P, chi ti\u1ebft \u1edf ph\u1ea7n III."}

K\u1ebeT LU\u1eacN:

${suggestions.length ? `C\u00f3 ${suggestions.length} c\u01a1 h\u1ed9i t\u00e1i s\u1eed d\u1ee5ng r\u00f5 r\u1ec7t.` : "Ch\u01b0a c\u00f3 c\u01a1 h\u1ed9i t\u00e1i s\u1eed d\u1ee5ng r\u00f5 r\u1ec7t trong d\u1eef li\u1ec7u hi\u1ec7n t\u1ea1i."}

\u0110\u1ec1 ngh\u1ecb: MR VY / MR S\u1ef8 ki\u1ec3m tra v\u1ecb tr\u00ed kho h\u00e0ng, th\u1eddi gian giao/h\u1ea1 r\u1ed7ng, closing time v\u00e0 \u0111i\u1ec1u ki\u1ec7n h\u00e3ng t\u00e0u.`;
}

async function createDailyReport(userId: string, model: string, date = startOfVietnamDay()) {
  const bookings = await prisma.booking.findMany({ where: { bookingDate: { gte: date, lte: endOfDay(date) } }, orderBy: { createdAt: "asc" } });
  const exports = bookings.filter((item) => item.bookingType === "export");
  const imports = bookings.filter((item) => item.bookingType === "import");
  const suggestions = imports.flatMap((imp) =>
    exports
      .filter((exp) => imp.containerNo && (normalizeText(exp.shippingLine) === normalizeText(imp.shippingLine) || normalizeText(exp.customerName) === normalizeText(imp.customerName)))
      .map((exp) => ({
        importCustomer: imp.customerName,
        importContainerNo: imp.containerNo || UNKNOWN,
        exportCustomer: exp.customerName,
        exportBookingNo: exp.bookingNo || UNKNOWN,
        shippingLine: exp.shippingLine || imp.shippingLine || UNKNOWN,
        level: normalizeText(exp.customerName) === normalizeText(imp.customerName) ? "HIGH" : "MEDIUM"
      }))
  );

  const totalExport = exports.reduce((sum, item) => sum + item.containerCount, 0);
  const totalImport = imports.reduce((sum, item) => sum + item.containerCount, 0);
  const reportText = buildDailyReportText(date, exports, imports, suggestions);

  return prisma.dailyContainerReport.create({
    data: {
      reportDate: date,
      totalContainers: totalExport + totalImport,
      totalExportContainers: totalExport,
      totalImportContainers: totalImport,
      reportText,
      createdBy: userId,
      aiModel: model,
      items: {
        create: bookings.map((b) => ({
          bookingType: b.bookingType,
          customerName: b.customerName,
          bookingNo: b.bookingNo,
          containerNo: b.containerNo,
          containerCount: b.containerCount,
          emptyPickupYard: b.emptyPickupYard,
          portOrYard: b.deliveryLocation,
          deliveryDate: b.deliveryDate,
          shippingLine: b.shippingLine,
          note: b.note
        }))
      },
      reuseSuggestions: {
        create: suggestions.map((s) => ({
          importCustomer: s.importCustomer,
          importContainerNo: s.importContainerNo,
          exportCustomer: s.exportCustomer,
          exportBookingNo: s.exportBookingNo,
          shippingLine: s.shippingLine,
          estimatedSavingLevel: s.level as "HIGH" | "MEDIUM" | "LOW",
          conclusion: `C\u00f3 th\u1ec3 t\u00e1i s\u1eed d\u1ee5ng container nh\u1eadp ${s.importContainerNo} cho booking xu\u1ea5t ${s.exportBookingNo}.`,
          actionSuggestion: "Ki\u1ec3m tra kho, closing time v\u00e0 \u0111i\u1ec1u ki\u1ec7n h\u00e3ng t\u00e0u tr\u01b0\u1edbc khi x\u00e1c nh\u1eadn."
        }))
      }
    },
    include: { items: true, reuseSuggestions: true }
  });
}

async function statsByCustomer() {
  const rows = await prisma.booking.groupBy({ by: ["customerName", "bookingType"], _sum: { containerCount: true }, orderBy: { customerName: "asc" } });
  const map = new Map<string, { customerName: string; export: number; import: number }>();
  for (const row of rows) {
    const current = map.get(row.customerName) || { customerName: row.customerName, export: 0, import: 0 };
    current[row.bookingType] = row._sum.containerCount || 0;
    map.set(row.customerName, current);
  }
  return Array.from(map.values()).sort((a, b) => b.export + b.import - (a.export + a.import));
}

export async function handleChatMessage({
  message,
  model,
  userId,
  customPrompt
}: {
  message: string;
  model: string;
  userId: string;
  customPrompt?: string;
}) {
  let actionType = "general";
  let response = "";
  let payload: unknown = null;
  const intent = intentText(message);

  const price = parseExternalPrice(message);
  const booking = parseBooking(message);

  if (price) {
    actionType = "external_price";
    const created = await createPrice(price, userId);
    response = `\u0110\u00e3 l\u01b0u b\u00e1o gi\u00e1 xe ngo\u00e0i v\u00e0o database: ${created.vendorName}, tuy\u1ebfn ${created.routeFrom} - ${created.routeTo}, cont ${created.containerType}, gi\u00e1 ${Number(created.price).toLocaleString("vi-VN")} VND.`;
    payload = created;
  } else if (/chon xe/.test(intent)) {
    actionType = "truck_assignment";
    const assigned = await assignTruck(message, userId, model);
    response = assigned.text;
    payload = assigned.rows;
  } else if (/bao cao|hom nay|bao nhieu container|thong ke/.test(intent)) {
    actionType = /thong ke/.test(intent) ? "statistics" : "daily_report";
    if (actionType === "statistics") {
      const rows = await statsByCustomer();
      response = `| STT | T\u00ean c\u00f4ng ty | S\u1ed1 container xu\u1ea5t | S\u1ed1 container nh\u1eadp | T\u1ed5ng container |
| --- | ----------- | ----------------: | ----------------: | -------------: |
${rows.map((r, i) => `| ${i + 1} | ${r.customerName} | ${r.export} | ${r.import} | ${r.export + r.import} |`).join("\n") || "|  | CH\u01afA C\u00d3 D\u1eee LI\u1ec6U | 0 | 0 | 0 |"}`;
      payload = rows;
    } else {
      const report = await createDailyReport(userId, model);
      response = report.reportText;
      payload = report;
    }
  } else if (booking) {
    actionType = "booking";
    const result = await upsertBooking(booking, userId);
    response = result.duplicate
      ? `Booking n\u00e0y \u0111\u00e3 t\u1ed3n t\u1ea1i trong h\u1ec7 th\u1ed1ng. M\u00ecnh \u0111\u00e3 c\u1eadp nh\u1eadt th\u00f4ng tin c\u00f2n thi\u1ebfu cho kh\u00e1ch ${result.booking.customerName}.`
      : `\u0110\u00e3 l\u01b0u booking m\u1edbi v\u00e0o database cho kh\u00e1ch ${result.booking.customerName}. ${result.booking.status === "missing_data" ? "M\u1ed9t s\u1ed1 tr\u01b0\u1eddng \u0111ang l\u00e0 CH\u01afA \u0110\u1ee6 D\u1eee LI\u1ec6U." : ""}`;
    payload = result.booking;
  } else {
    const system =
      customPrompt?.trim() ||
      "Ban la tro ly van hanh container cua Duong Minh Logistics. Tra loi ngan gon bang tieng Viet. Khong bia du lieu. Neu thieu du lieu thi ghi CHUA DU DU LIEU.";
    const aiText = await callOpenRouter({ model, system, message });
    response = aiText || "Ch\u01b0a nh\u1eadn di\u1ec7n \u0111\u01b0\u1ee3c nghi\u1ec7p v\u1ee5. H\u00e3y nh\u1eadp booking, b\u00e1o gi\u00e1 xe ngo\u00e0i, y\u00eau c\u1ea7u b\u00e1o c\u00e1o, th\u1ed1ng k\u00ea ho\u1eb7c ch\u1ecdn xe cho m\u1ed9t booking/file.";
  }

  await prisma.aiLog.create({
    data: { userId, modelName: model, userMessage: message, aiResponse: response, actionType }
  });

  return { response, actionType, payload };
}
