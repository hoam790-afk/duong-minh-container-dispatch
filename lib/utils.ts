import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function normalizeText(value?: string | null) {
  return (value || "")
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

export function missing(value?: string | null) {
  return value && value.trim() ? value.trim() : "CHƯA ĐỦ DỮ LIỆU";
}

export function formatVnd(value?: number | string | null) {
  if (value === undefined || value === null || value === "") return "CHƯA ĐỦ DỮ LIỆU";
  return Number(value).toLocaleString("vi-VN") + " VND";
}

export function startOfVietnamDay(date = new Date()) {
  const local = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
  return new Date(local.getFullYear(), local.getMonth(), local.getDate());
}

export function endOfDay(date: Date) {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
}
