import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("admin123@", 12);

  await prisma.user.upsert({
    where: { email: "admin@duongminhlogistics.vn" },
    update: { passwordHash, role: "admin", name: "Admin Dương Minh" },
    create: {
      email: "admin@duongminhlogistics.vn",
      name: "Admin Dương Minh",
      passwordHash,
      role: "admin"
    }
  });

  await prisma.aiSetting.upsert({
    where: { id: "default" },
    update: {
      defaultModel: process.env.OPENROUTER_DEFAULT_MODEL || "openai/gpt-4o-mini",
      enabledModels: [
        "openai/gpt-4o-mini",
        "anthropic/claude-3.5-sonnet",
        "google/gemini-flash-1.5",
        "meta-llama/llama-3.1-70b-instruct",
        "deepseek/deepseek-chat",
        "mistralai/mistral-large"
      ]
    },
    create: {
      id: "default",
      defaultModel: process.env.OPENROUTER_DEFAULT_MODEL || "openai/gpt-4o-mini",
      enabledModels: [
        "openai/gpt-4o-mini",
        "anthropic/claude-3.5-sonnet",
        "google/gemini-flash-1.5",
        "meta-llama/llama-3.1-70b-instruct",
        "deepseek/deepseek-chat",
        "mistralai/mistral-large"
      ],
      apiKeyMasked: process.env.OPENROUTER_API_KEY ? "********" : null
    }
  });

  const trucks = [
    ...Array.from({ length: 7 }, (_, i) => ({
      teamName: "Đội 1",
      truckNo: `DM-01-${String(i + 1).padStart(2, "0")}`,
      trailerNo: i < 10 ? `MOOC-01-${String(i + 1).padStart(2, "0")}` : null
    })),
    ...Array.from({ length: 4 }, (_, i) => ({
      teamName: "Đội 2",
      truckNo: `DM-02-${String(i + 1).padStart(2, "0")}`,
      trailerNo: `MOOC-02-${String(i + 1).padStart(2, "0")}`
    }))
  ];

  for (const truck of trucks) {
    await prisma.internalTruck.upsert({
      where: { truckNo: truck.truckNo },
      update: { status: "available", note: "Seed xe nhà đang hoạt động", ...truck },
      create: { status: "available", note: "Seed xe nhà đang hoạt động", ...truck }
    });
  }

  const today = new Date("2026-05-26T00:00:00.000Z");
  await prisma.externalTruckPrice.createMany({
    data: [
      {
        vendorName: "Minh Phát",
        routeFrom: "CÁT LÁI",
        routeTo: "LONG AN",
        containerType: "40",
        price: 4400000,
        currency: "VND",
        validFrom: today,
        note: "Seed báo giá demo"
      },
      {
        vendorName: "Tân Cảng Express",
        routeFrom: "CÁT LÁI",
        routeTo: "BÌNH DƯƠNG",
        containerType: "20",
        price: 3100000,
        currency: "VND",
        validFrom: today,
        note: "Seed báo giá demo"
      }
    ],
    skipDuplicates: true
  });
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
